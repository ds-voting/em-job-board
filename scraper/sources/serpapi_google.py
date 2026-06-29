import httpx
from scraper.models import RawPosting
from scraper.sources.base import BaseSource
from scraper.config_loader import get_serpapi_keys


class SerpApiQuotaError(Exception):
    """Raised when a SerpAPI key is out of searches (or otherwise unusable),
    signalling the caller to rotate to the next key."""


class SerpApiGoogleSource(BaseSource):
    """Fetches EM physician jobs via SerpApi's Google Jobs endpoint.

    Rotates across multiple free-tier keys (SERPAPI_KEY_1, _2, ...). When the
    current key runs out of its monthly search quota, it advances to the next
    key and retries. When every key is exhausted it stops gracefully.
    """

    name = "Google Jobs"

    async def fetch(self, config: dict) -> list[RawPosting]:
        keys = get_serpapi_keys()
        if not keys:
            print(f"[{self.name}] Skipping — no SERPAPI_KEY_n set")
            return []

        self._keys = keys
        self._key_idx = 0

        all_postings = []
        queries = config.get("search_queries", ["Emergency Medicine Physician"])
        locations = config.get("locations", [])

        # SerpApi Google Jobs needs real city/state locations, not region names.
        # Use the first keyword from each region as a representative search location.
        location_searches = [loc["keywords"][0] for loc in locations if loc.get("keywords")]

        searches = [(q, loc) for q in queries for loc in location_searches]

        async with httpx.AsyncClient(timeout=30.0) as client:
            for i, (query, location) in enumerate(searches):
                if self._key_idx >= len(self._keys):
                    remaining = len(searches) - i
                    print(
                        f"[{self.name}] All {len(self._keys)} SerpAPI keys exhausted — "
                        f"skipping {remaining} remaining search(es)"
                    )
                    break
                try:
                    postings = await self._search_rotating(client, query, location)
                    all_postings.extend(postings)
                except Exception as e:
                    print(f"[{self.name}] Error searching '{query}' in '{location}': {e}")

        print(
            f"[{self.name}] Fetched {len(all_postings)} raw postings "
            f"(used {min(self._key_idx + 1, len(self._keys))}/{len(self._keys)} key(s))"
        )
        return all_postings

    async def _search_rotating(
        self, client: httpx.AsyncClient, query: str, location: str
    ) -> list[RawPosting]:
        """Run a search, rotating to the next key if the current one is exhausted."""
        while self._key_idx < len(self._keys):
            try:
                return await self._search(client, self._keys[self._key_idx], query, location)
            except SerpApiQuotaError as e:
                print(
                    f"[{self.name}] SerpAPI key #{self._key_idx + 1}/{len(self._keys)} "
                    f"unavailable ({e}) — rotating to next key"
                )
                self._key_idx += 1
        return []  # all keys exhausted

    async def _search(
        self, client: httpx.AsyncClient, api_key: str, query: str, location: str
    ) -> list[RawPosting]:
        """Run a single SerpApi Google Jobs search."""
        params = {
            "engine": "google_jobs",
            "q": query,
            "location": location,
            "hl": "en",
            "api_key": api_key,
        }

        resp = await client.get("https://serpapi.com/search.json", params=params)

        # HTTP 429 == out of searches / rate limited -> rotate to the next key.
        if resp.status_code == 429:
            raise SerpApiQuotaError("HTTP 429 (search quota / rate limit)")
        resp.raise_for_status()
        data = resp.json()

        # SerpApi reports quota/auth problems in a JSON "error" field (HTTP 200).
        # Only those should trigger key rotation. Other "error" values are benign
        # (most commonly "Google hasn't returned any results for this query.") and
        # are treated as zero results, matching the original behavior.
        error = data.get("error") if isinstance(data, dict) else None
        if error:
            low = str(error).lower()
            if any(s in low for s in ("run out", "ran out", "out of searches", "exceeded", "limit", "invalid api key")):
                raise SerpApiQuotaError(str(error))
            return []

        postings = []
        for job in data.get("jobs_results", []):
            title = job.get("title", "")
            employer = job.get("company_name", "")
            job_location = job.get("location", "")
            description = job.get("description", "")

            # SerpApi may not always include salary; extract from extensions
            salary_text = ""
            for ext in job.get("detected_extensions", {}).get("salary", []):
                salary_text = ext
                break
            if not salary_text:
                salary_text = "Not listed"

            # Build source URL
            source_url = job.get("share_link", job.get("related_links", [{}])[0].get("link", ""))
            if not source_url:
                apply_options = job.get("apply_options", [])
                if apply_options:
                    source_url = apply_options[0].get("link", "")

            postings.append(RawPosting(
                title=title,
                employer=employer,
                location=job_location,
                description=description,
                salary_text=salary_text,
                source_url=source_url,
                source_name=self.name,
            ))

        return postings
