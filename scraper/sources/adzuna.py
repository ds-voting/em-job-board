import httpx
from scraper.models import RawPosting
from scraper.sources.base import BaseSource
from scraper.config_loader import get_api_key


# Adzuna uses 2-letter state codes in the URL for US searches
REGION_TO_STATES = {
    "Bay Area, CA": ["california"],
    "San Diego, CA": ["california"],
    "California Coast": ["california"],
    "Denver/Boulder, CO": ["colorado"],
    "Bozeman, MT": ["montana"],
    "Stamford, CT": ["connecticut"],
    "Boston, MA": ["massachusetts"],
    "Other East Coast": ["new-york", "pennsylvania", "virginia", "maryland",
                         "north-carolina", "georgia", "district-of-columbia"],
}


class AdzunaSource(BaseSource):
    """Fetches EM physician jobs via the Adzuna API."""

    name = "Adzuna"

    async def fetch(self, config: dict) -> list[RawPosting]:
        app_id = get_api_key("ADZUNA_APP_ID")
        app_key = get_api_key("ADZUNA_APP_KEY")
        if not app_id or not app_key:
            print(f"[{self.name}] Skipping — ADZUNA_APP_ID or ADZUNA_APP_KEY not set")
            return []

        all_postings = []
        queries = config.get("search_queries", ["Emergency Medicine Physician"])

        # Collect unique states from all configured locations
        states = set()
        for loc in config.get("locations", []):
            region_name = loc["name"]
            if region_name in REGION_TO_STATES:
                states.update(REGION_TO_STATES[region_name])

        async with httpx.AsyncClient(timeout=30.0) as client:
            for query in queries:
                for state in states:
                    try:
                        postings = await self._search(client, app_id, app_key, query, state)
                        all_postings.extend(postings)
                    except Exception as e:
                        print(f"[{self.name}] Error searching '{query}' in '{state}': {e}")

        print(f"[{self.name}] Fetched {len(all_postings)} raw postings")
        return all_postings

    async def _search(
        self,
        client: httpx.AsyncClient,
        app_id: str,
        app_key: str,
        query: str,
        state: str,
    ) -> list[RawPosting]:
        """Run a single Adzuna API search for a query + state."""
        url = f"https://api.adzuna.com/v1/api/jobs/us/search/1"
        params = {
            "app_id": app_id,
            "app_key": app_key,
            "results_per_page": 50,
            "what": query,
            "where": state,
            "content-type": "application/json",
            "category": "healthcare-nursing-jobs",
        }

        resp = await client.get(url, params=params)
        resp.raise_for_status()
        data = resp.json()

        postings = []
        for result in data.get("results", []):
            title = result.get("title", "")
            employer = result.get("company", {}).get("display_name", "Unknown")
            location = result.get("location", {}).get("display_name", "")
            description = result.get("description", "")
            source_url = result.get("redirect_url", "")

            salary_min = result.get("salary_min")
            salary_max = result.get("salary_max")
            if salary_min and salary_max:
                salary_text = f"${int(salary_min):,}-${int(salary_max):,}"
            elif salary_min:
                salary_text = f"${int(salary_min):,}+"
            elif salary_max:
                salary_text = f"Up to ${int(salary_max):,}"
            else:
                salary_text = "Not listed"

            postings.append(RawPosting(
                title=title,
                employer=employer,
                location=location,
                description=description,
                salary_text=salary_text,
                source_url=source_url,
                source_name=self.name,
            ))

        return postings
