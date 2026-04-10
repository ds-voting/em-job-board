import httpx
from scraper.models import RawPosting
from scraper.sources.base import BaseSource
from scraper.config_loader import get_api_key


class SerpApiGoogleSource(BaseSource):
    """Fetches EM physician jobs via SerpApi's Google Jobs endpoint."""

    name = "Google Jobs"

    async def fetch(self, config: dict) -> list[RawPosting]:
        api_key = get_api_key("SERPAPI_KEY")
        if not api_key:
            print(f"[{self.name}] Skipping — SERPAPI_KEY not set")
            return []

        all_postings = []
        queries = config.get("search_queries", ["Emergency Medicine Physician"])
        locations = config.get("locations", [])

        # Build location search strings from the region names
        location_searches = [loc["name"] for loc in locations]

        async with httpx.AsyncClient(timeout=30.0) as client:
            for query in queries:
                for location in location_searches:
                    try:
                        postings = await self._search(client, api_key, query, location)
                        all_postings.extend(postings)
                    except Exception as e:
                        print(f"[{self.name}] Error searching '{query}' in '{location}': {e}")

        print(f"[{self.name}] Fetched {len(all_postings)} raw postings")
        return all_postings

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
        resp.raise_for_status()
        data = resp.json()

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
