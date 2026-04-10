import httpx
from bs4 import BeautifulSoup
from scraper.models import RawPosting
from scraper.sources.base import BaseSource


# emCareers (ACEP/EMRA joint board) uses slug-based URLs
STATE_SLUGS = {
    "california": "california",
    "colorado": "colorado",
    "montana": "montana",
    "connecticut": "connecticut",
    "massachusetts": "massachusetts",
    "new-york": "new-york",
    "pennsylvania": "pennsylvania",
    "maryland": "maryland",
    "virginia": "virginia",
    "georgia": "georgia",
    "north-carolina": "north-carolina",
}


class EmCareersSource(BaseSource):
    """Scrapes EM physician jobs from emCareers.org (ACEP/EMRA joint board)."""

    name = "emCareers"
    base_url = "https://www.emcareers.org"

    async def fetch(self, config: dict) -> list[RawPosting]:
        all_postings = []

        # Determine which states to scrape based on config locations
        states_to_scrape = set()
        location_to_state = {
            "Bay Area, CA": "california",
            "San Diego, CA": "california",
            "California Coast": "california",
            "Denver/Boulder, CO": "colorado",
            "Bozeman, MT": "montana",
            "Stamford, CT": "connecticut",
            "Boston, MA": "massachusetts",
            "Other East Coast": ["new-york", "pennsylvania", "maryland",
                                 "virginia", "georgia", "north-carolina"],
        }

        for loc in config.get("locations", []):
            region = loc["name"]
            if region in location_to_state:
                states = location_to_state[region]
                if isinstance(states, list):
                    states_to_scrape.update(states)
                else:
                    states_to_scrape.add(states)

        async with httpx.AsyncClient(timeout=30.0, follow_redirects=True) as client:
            for state in states_to_scrape:
                try:
                    postings = await self._scrape_state(client, state)
                    all_postings.extend(postings)
                except Exception as e:
                    print(f"[{self.name}] Error scraping state '{state}': {e}")

        print(f"[{self.name}] Fetched {len(all_postings)} raw postings")
        return all_postings

    async def _scrape_state(self, client: httpx.AsyncClient, state: str) -> list[RawPosting]:
        """Scrape job listings for a single state from emCareers."""
        url = f"{self.base_url}/jobs/emergency-medicine/{state}/"

        resp = await client.get(url, headers={
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
        })
        resp.raise_for_status()

        soup = BeautifulSoup(resp.text, "html.parser")
        postings = []

        # emCareers lists jobs in card/listing elements
        job_cards = soup.select("div.job-listing, article.job-card, div[class*='job']")

        if not job_cards:
            # Fallback: look for any list of links that look like job postings
            job_cards = soup.select("a[href*='/job/'], a[href*='/jobs/']")

        for card in job_cards:
            try:
                title_el = card.select_one("h2, h3, h4, .job-title, [class*='title']")
                title = title_el.get_text(strip=True) if title_el else card.get_text(strip=True)[:100]

                employer_el = card.select_one(".company, .employer, [class*='company']")
                employer = employer_el.get_text(strip=True) if employer_el else "Unknown"

                location_el = card.select_one(".location, [class*='location']")
                location = location_el.get_text(strip=True) if location_el else state.replace("-", " ").title()

                link_el = card.select_one("a[href]") if card.name != "a" else card
                href = link_el.get("href", "") if link_el else ""
                if href and not href.startswith("http"):
                    href = f"{self.base_url}{href}"

                salary_text = "Not listed"
                salary_el = card.select_one("[class*='salary'], [class*='compensation']")
                if salary_el:
                    salary_text = salary_el.get_text(strip=True)

                postings.append(RawPosting(
                    title=title,
                    employer=employer,
                    location=location,
                    description="",
                    salary_text=salary_text,
                    source_url=href,
                    source_name=self.name,
                ))
            except Exception as e:
                print(f"[{self.name}] Error parsing job card: {e}")
                continue

        return postings
