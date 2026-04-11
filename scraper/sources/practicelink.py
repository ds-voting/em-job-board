import re
import httpx
from bs4 import BeautifulSoup
from scraper.models import RawPosting
from scraper.sources.base import BaseSource


# PracticeLink uses state slugs in the URL path
REGION_TO_STATES = {
    "Bay Area, CA": ["california"],
    "San Diego, CA": ["california"],
    "California Coast": ["california"],
    "Denver/Boulder, CO": ["colorado"],
    "Bozeman, MT": ["montana"],
    "Stamford, CT": ["connecticut"],
    "Boston, MA": ["massachusetts"],
    "Other East Coast": ["new-york", "pennsylvania", "virginia", "maryland",
                         "north-carolina", "georgia"],
}

STATE_ABBREV = {
    "california": "CA",
    "colorado": "CO",
    "montana": "MT",
    "connecticut": "CT",
    "massachusetts": "MA",
    "new-york": "NY",
    "pennsylvania": "PA",
    "virginia": "VA",
    "maryland": "MD",
    "north-carolina": "NC",
    "georgia": "GA",
}

# Regex to find "City, ST" patterns (e.g., "San Francisco, CA")
# Restricted to 1-3 word city names with proper capitalization
CITY_STATE_RE = re.compile(
    r"(?:^|[\|\s])([A-Z][a-z]+(?:\s[A-Z][a-z]+){0,2}),\s*([A-Z]{2})(?:[^A-Z]|$)"
)
# Regex to find salary patterns
SALARY_RE = re.compile(
    r"(?:Salary Range:?\s*)?(?:From\s+)?\$([\d,]+)(?:\s*-\s*\$?([\d,]+))?(?:\s*(?:a year|/year|annually|per year))?",
    re.IGNORECASE,
)


class PracticeLinkSource(BaseSource):
    """Scrapes EM physician jobs from PracticeLink (practicelink.com)."""

    name = "PracticeLink"
    base_url = "https://jobs.practicelink.com"

    async def fetch(self, config: dict) -> list[RawPosting]:
        all_postings = []

        # Collect unique states from configured locations
        states = set()
        for loc in config.get("locations", []):
            region_name = loc["name"]
            if region_name in REGION_TO_STATES:
                states.update(REGION_TO_STATES[region_name])

        async with httpx.AsyncClient(timeout=30.0, follow_redirects=True) as client:
            for state in states:
                try:
                    postings = await self._scrape_state(client, state)
                    all_postings.extend(postings)
                except Exception as e:
                    print(f"[{self.name}] Error scraping state '{state}': {e}")

        print(f"[{self.name}] Fetched {len(all_postings)} raw postings")
        return all_postings

    async def _scrape_state(self, client: httpx.AsyncClient, state: str) -> list[RawPosting]:
        """Scrape EM physician jobs for a single state."""
        url = f"{self.base_url}/jobs/emergency-medicine/physician/{state}/"

        resp = await client.get(url, headers={
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
        })
        resp.raise_for_status()

        soup = BeautifulSoup(resp.text, "html.parser")
        postings = []
        state_abbrev = STATE_ABBREV.get(state, "")

        job_blocks = soup.select("div.single-job")

        for block in job_blocks:
            try:
                title_el = block.select_one("h3.job-title")
                if not title_el:
                    continue
                title = title_el.get_text(strip=True)

                facility_el = block.select_one("div.job-location.facility-name")
                employer = facility_el.get_text(strip=True).lstrip("*") if facility_el else "Unknown"

                link_el = block.select_one("a[href*='/jobs/']")
                href = link_el.get("href", "") if link_el else ""
                if href and not href.startswith("http"):
                    href = f"{self.base_url}{href}"

                # Extract all visible text from the block to find city and salary
                block_text = block.get_text(separator=" | ", strip=True)

                # Find a "City, ST" pattern matching this state
                location = f"Unknown, {state_abbrev}" if state_abbrev else state.title()
                for match in CITY_STATE_RE.finditer(block_text):
                    city, st = match.group(1).strip(), match.group(2)
                    if state_abbrev and st == state_abbrev:
                        location = f"{city}, {st}"
                        break

                # Try to extract salary
                salary_text = "Not listed"
                salary_match = SALARY_RE.search(block_text)
                if salary_match:
                    low = salary_match.group(1).replace(",", "")
                    high = salary_match.group(2).replace(",", "") if salary_match.group(2) else None
                    try:
                        low_int = int(low)
                        if low_int >= 100000:  # only large numbers are likely salaries
                            if high:
                                high_int = int(high)
                                salary_text = f"${low_int:,}-${high_int:,}"
                            else:
                                salary_text = f"From ${low_int:,}"
                    except ValueError:
                        pass

                # Detect employment type to filter locums right at source
                if "Locum Tenens" in block_text:
                    title = f"[Locum] {title}"  # Pre-filter will catch this

                postings.append(RawPosting(
                    title=title,
                    employer=employer,
                    location=location,
                    description=block_text[:1500],
                    salary_text=salary_text,
                    source_url=href,
                    source_name=self.name,
                ))
            except Exception as e:
                print(f"[{self.name}] Error parsing job block: {e}")
                continue

        return postings
