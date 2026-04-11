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

        # emCareers uses <li class="lister__item ..."> for each job listing
        job_items = soup.select("li[class*='lister__item']")

        for item in job_items:
            try:
                # Title is in <h3 class="lister__header"> > <a> > <span>
                title_el = item.select_one("h3.lister__header a span")
                if not title_el:
                    title_el = item.select_one("h3.lister__header a")
                if not title_el:
                    continue  # Skip non-job items
                title = title_el.get_text(strip=True)
                if not title:
                    continue

                # Employer is in <li class="lister__meta-item--recruiter">
                employer_el = item.select_one("li.lister__meta-item--recruiter")
                employer = employer_el.get_text(strip=True) if employer_el else "Unknown"

                # Location is in <li class="lister__meta-item--location">
                location_el = item.select_one("li.lister__meta-item--location")
                location = location_el.get_text(strip=True) if location_el else state.replace("-", " ").title()

                # Salary is in <li class="lister__meta-item--salary">
                salary_el = item.select_one("li.lister__meta-item--salary")
                salary_text = salary_el.get_text(strip=True) if salary_el else "Not listed"

                # Description snippet is in <p class="lister__description">
                desc_el = item.select_one("p.lister__description")
                description = desc_el.get_text(strip=True) if desc_el else ""

                # Link is in <h3> > <a href="...">
                link_el = item.select_one("h3.lister__header a[href]")
                href = link_el.get("href", "").strip() if link_el else ""
                if href and not href.startswith("http"):
                    href = f"{self.base_url}{href}"

                postings.append(RawPosting(
                    title=title,
                    employer=employer,
                    location=location,
                    description=description,
                    salary_text=salary_text,
                    source_url=href,
                    source_name=self.name,
                ))
            except Exception as e:
                print(f"[{self.name}] Error parsing job item: {e}")
                continue

        return postings
