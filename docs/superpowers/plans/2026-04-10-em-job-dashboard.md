# EM Physician Job Search Dashboard — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an automated job scraper + live web dashboard that aggregates Emergency Medicine physician job postings, filters them with AI, and displays results at a shareable URL.

**Architecture:** Python scraper collects jobs from multiple sources (APIs + HTML scraping), sends them through Claude API for intelligent classification/filtering, stores results as JSON in git, and a Next.js dashboard deployed on Vercel reads that data. GitHub Actions runs the scraper on a daily cron.

**Tech Stack:** Python 3.11+ (httpx, BeautifulSoup4, anthropic SDK, pyyaml), Next.js 14+ (App Router, TypeScript, Tailwind CSS), Vercel (hosting), GitHub Actions (cron), SerpApi (Google Jobs aggregation), Adzuna API (physician job data + salary benchmarks)

**Spec:** `JOBS/docs/superpowers/specs/2026-04-10-em-job-dashboard-design.md`

---

## File Structure

```
JOBS/
├── config.yaml                    # Job search preferences (Ryan edits this)
├── requirements.txt               # Python dependencies
├── run_scraper.py                 # Entry point: one command runs everything
├── scraper/
│   ├── __init__.py
│   ├── config_loader.py           # Loads and validates config.yaml
│   ├── classifier.py              # Claude API job classification
│   ├── deduplicator.py            # Prevents duplicate job entries
│   ├── models.py                  # Data classes for Job, RejectedJob
│   ├── runner.py                  # Orchestrates scrape → classify → dedupe → save
│   └── sources/
│       ├── __init__.py
│       ├── base.py                # Base class for all sources
│       ├── serpapi_google.py      # SerpApi Google Jobs source
│       ├── adzuna.py              # Adzuna API source
│       └── emcareers.py           # emCareers.org HTML scraper (ACEP/EMRA)
├── data/
│   ├── jobs.json                  # Matched jobs
│   └── rejected.json              # Filtered-out jobs with reasons
├── dashboard/
│   ├── package.json
│   ├── next.config.js
│   ├── tailwind.config.ts
│   ├── tsconfig.json
│   ├── public/
│   ├── app/
│   │   ├── layout.tsx             # Root layout with nav
│   │   ├── page.tsx               # Main job board view
│   │   ├── rejected/
│   │   │   └── page.tsx           # Rejected jobs view
│   │   └── job/
│   │       └── [id]/
│   │           └── page.tsx       # Job detail view
│   ├── components/
│   │   ├── JobCard.tsx            # Individual job card
│   │   ├── JobFilters.tsx         # Filter controls
│   │   ├── StatsBar.tsx           # Summary stats at top
│   │   └── SearchBar.tsx          # Keyword search
│   └── lib/
│       ├── types.ts               # TypeScript types matching Python models
│       └── jobs.ts                # Data loading and filtering helpers
├── .github/
│   └── workflows/
│       └── scrape.yml             # Daily cron workflow
├── .env.example                   # Template for API keys
├── .gitignore
└── README.md                      # Setup instructions for Ryan
```

---

## Phase 1 — MVP (Tasks 1-10)

### Task 1: Project Scaffolding & Configuration

**Files:**
- Create: `JOBS/config.yaml`
- Create: `JOBS/requirements.txt`
- Create: `JOBS/.env.example`
- Create: `JOBS/.gitignore`

- [ ] **Step 1: Initialize git repo**

```bash
cd JOBS
git init
```

- [ ] **Step 2: Create `.gitignore`**

Create `JOBS/.gitignore`:
```
__pycache__/
*.pyc
.env
venv/
node_modules/
.next/
.vercel/
```

- [ ] **Step 3: Create `.env.example`**

Create `JOBS/.env.example`:
```
ANTHROPIC_API_KEY=your_anthropic_api_key_here
SERPAPI_KEY=your_serpapi_key_here
ADZUNA_APP_ID=your_adzuna_app_id_here
ADZUNA_APP_KEY=your_adzuna_app_key_here
```

- [ ] **Step 4: Create `requirements.txt`**

Create `JOBS/requirements.txt`:
```
httpx>=0.27.0
beautifulsoup4>=4.12.0
anthropic>=0.40.0
pyyaml>=6.0
python-dotenv>=1.0.0
```

- [ ] **Step 5: Create `config.yaml`**

Create `JOBS/config.yaml`:
```yaml
locations:
  - name: "Bay Area, CA"
    priority: 1
    keywords:
      - "San Francisco"
      - "Oakland"
      - "San Jose"
      - "Palo Alto"
      - "Stanford"
      - "Mountain View"
      - "Redwood City"
      - "Fremont"
      - "Bay Area"
      - "UCSF"
      - "Santa Clara"
      - "Walnut Creek"
      - "Marin"
      - "San Mateo"
      - "Berkeley"
      - "Daly City"
  - name: "San Diego, CA"
    priority: 1
    keywords:
      - "San Diego"
      - "La Jolla"
      - "Chula Vista"
      - "Oceanside"
      - "Escondido"
      - "Carlsbad"
  - name: "California Coast"
    priority: 2
    keywords:
      - "Los Angeles"
      - "Santa Barbara"
      - "Monterey"
      - "Santa Cruz"
      - "Long Beach"
      - "Orange County"
      - "Irvine"
      - "Laguna"
      - "Ventura"
      - "Sacramento"
  - name: "Denver/Boulder, CO"
    priority: 3
    keywords:
      - "Denver"
      - "Boulder"
      - "Aurora"
      - "Lakewood"
      - "Colorado Springs"
      - "Fort Collins"
  - name: "Bozeman, MT"
    priority: 4
    keywords:
      - "Bozeman"
  - name: "Stamford, CT"
    priority: 5
    keywords:
      - "Stamford"
      - "Greenwich"
      - "Norwalk"
      - "Bridgeport"
      - "New Haven"
      - "Fairfield"
      - "Danbury"
  - name: "Boston, MA"
    priority: 6
    keywords:
      - "Boston"
      - "Cambridge"
      - "Quincy"
      - "Plymouth"
      - "Cape Cod"
      - "South Shore"
      - "Brockton"
      - "Fall River"
      - "New Bedford"
  - name: "Other East Coast"
    priority: 7
    min_salary_override: 400000
    keywords:
      - "New York"
      - "Philadelphia"
      - "Washington DC"
      - "Baltimore"
      - "Charlotte"
      - "Raleigh"
      - "Richmond"
      - "Atlanta"

salary:
  minimum: 300000
  target_low: 350000
  target_high: 400000

schedule:
  reject_nocturnist_only: true
  reject_some_nights: false

excluded_employers:
  - "HCA Healthcare"
  - "HCA"
  - "Envision"
  - "TeamHealth"

excluded_title_keywords:
  - "Physician Assistant"
  - "Nurse Practitioner"
  - "Advanced Practice"
  - "APP "
  - "Medical Director"
  - "Fellowship"
  - "Locum"
  - "Locums"
  - "NP "
  - "PA-C"
  - "PA "

institution_preferences:
  preferred:
    - "Academic Medical Center"
    - "Trauma Level I"
    - "Trauma Level II"
  acceptable:
    - "Trauma Level III"
    - "Private Hospital Group"
    - "Community Hospital"
  excluded:
    - "HCA"

search_queries:
  - "Emergency Medicine Physician"
  - "Emergency Department Physician"
  - "EM Attending Physician"
  - "Emergency Room Physician"
```

- [ ] **Step 6: Set up Python virtual environment**

```bash
cd JOBS
python -m venv venv
source venv/Scripts/activate  # Windows Git Bash
pip install -r requirements.txt
```

- [ ] **Step 7: Commit**

```bash
git add .gitignore .env.example requirements.txt config.yaml
git commit -m "feat: project scaffolding with config and dependencies"
```

---

### Task 2: Data Models

**Files:**
- Create: `JOBS/scraper/__init__.py`
- Create: `JOBS/scraper/models.py`

- [ ] **Step 1: Create scraper package**

Create `JOBS/scraper/__init__.py`:
```python
```

(Empty `__init__.py` to make it a package.)

- [ ] **Step 2: Write `models.py` with Job and RejectedJob data classes**

Create `JOBS/scraper/models.py`:
```python
from dataclasses import dataclass, field, asdict
from datetime import datetime
import hashlib
import json


@dataclass
class Job:
    """A job posting that passed all filters."""
    id: str                          # Generated hash of employer+location+title
    title: str
    employer: str
    location: str                    # "City, State"
    location_region: str             # Mapped region name from config
    location_priority: int           # 1-8 based on preference list
    salary: str                      # "$350,000-$400,000", "Not Listed", etc.
    salary_numeric: int | None       # Midpoint number for filtering, None if unknown
    institution_type: str            # "Academic Medical Center", "Trauma Level I", etc.
    schedule_type: str               # "Day", "Swing", "Mixed", "Unclear"
    is_nocturnist_only: bool
    match_confidence: str            # "High", "Medium", "Low"
    analysis_notes: str              # Claude's interpretation notes
    source_url: str                  # Direct link to original posting
    source_name: str                 # "SerpApi", "Adzuna", "emCareers"
    description_snippet: str         # First ~500 chars of job description
    full_description: str            # Full job description text
    date_found: str                  # ISO format date string
    date_last_seen: str              # ISO format date string
    status: str = "active"           # "active" or "possibly_filled"
    is_new: bool = True              # True until next scrape run
    red_flags: list[str] = field(default_factory=list)
    missed_scrapes: int = 0          # Count of consecutive scrapes where not seen

    def to_dict(self) -> dict:
        return asdict(self)

    @staticmethod
    def generate_id(employer: str, location: str, title: str) -> str:
        key = f"{employer.lower().strip()}|{location.lower().strip()}|{title.lower().strip()}"
        return hashlib.sha256(key.encode()).hexdigest()[:12]


@dataclass
class RejectedJob:
    """A job posting that was filtered out."""
    id: str
    title: str
    employer: str
    location: str
    salary: str
    source_url: str
    source_name: str
    rejection_reason: str            # Specific reason: "HCA facility", "Nocturnist-only", etc.
    description_snippet: str
    date_found: str

    def to_dict(self) -> dict:
        return asdict(self)


@dataclass
class RawPosting:
    """Raw job posting data before classification."""
    title: str
    employer: str
    location: str
    description: str
    salary_text: str                 # Raw salary string from source
    source_url: str
    source_name: str


def load_jobs(filepath: str) -> list[Job]:
    """Load jobs from a JSON file."""
    try:
        with open(filepath, "r") as f:
            data = json.load(f)
        return [Job(**item) for item in data]
    except (FileNotFoundError, json.JSONDecodeError):
        return []


def save_jobs(jobs: list[Job], filepath: str) -> None:
    """Save jobs to a JSON file."""
    with open(filepath, "w") as f:
        json.dump([j.to_dict() for j in jobs], f, indent=2)


def load_rejected(filepath: str) -> list[RejectedJob]:
    """Load rejected jobs from a JSON file."""
    try:
        with open(filepath, "r") as f:
            data = json.load(f)
        return [RejectedJob(**item) for item in data]
    except (FileNotFoundError, json.JSONDecodeError):
        return []


def save_rejected(rejected: list[RejectedJob], filepath: str) -> None:
    """Save rejected jobs to a JSON file."""
    with open(filepath, "w") as f:
        json.dump([r.to_dict() for r in rejected], f, indent=2)
```

- [ ] **Step 3: Test models manually**

```bash
cd JOBS
python -c "
from scraper.models import Job, RejectedJob, RawPosting
j = Job(
    id=Job.generate_id('UCSF Health', 'San Francisco, CA', 'Emergency Medicine Physician'),
    title='Emergency Medicine Physician',
    employer='UCSF Health',
    location='San Francisco, CA',
    location_region='Bay Area, CA',
    location_priority=1,
    salary='\$400,000-\$450,000',
    salary_numeric=425000,
    institution_type='Academic Medical Center',
    schedule_type='Mixed',
    is_nocturnist_only=False,
    match_confidence='High',
    analysis_notes='Top-tier academic center in target region',
    source_url='https://example.com/job/123',
    source_name='SerpApi',
    description_snippet='Join our world-class emergency department...',
    full_description='Full description here...',
    date_found='2026-04-10',
    date_last_seen='2026-04-10',
)
print(f'ID: {j.id}')
print(f'Title: {j.title}')
print(f'Dict keys: {list(j.to_dict().keys())}')
print('Models working correctly.')
"
```

Expected: Prints the ID, title, dict keys, and success message.

- [ ] **Step 4: Commit**

```bash
git add scraper/
git commit -m "feat: add Job, RejectedJob, and RawPosting data models"
```

---

### Task 3: Config Loader

**Files:**
- Create: `JOBS/scraper/config_loader.py`

- [ ] **Step 1: Write `config_loader.py`**

Create `JOBS/scraper/config_loader.py`:
```python
import yaml
import os
from dotenv import load_dotenv


load_dotenv()


def load_config(config_path: str = "config.yaml") -> dict:
    """Load and return the config.yaml as a dict."""
    with open(config_path, "r") as f:
        return yaml.safe_load(f)


def get_location_keywords(config: dict) -> dict[str, dict]:
    """Build a lookup from keyword -> {name, priority, min_salary_override}.

    Returns a dict where keys are lowercased location keywords and values
    are dicts with region info.
    """
    lookup = {}
    for loc in config["locations"]:
        region_info = {
            "name": loc["name"],
            "priority": loc["priority"],
            "min_salary_override": loc.get("min_salary_override"),
        }
        for kw in loc["keywords"]:
            lookup[kw.lower()] = region_info
    return lookup


def match_location(location_text: str, config: dict) -> dict | None:
    """Match a location string against configured regions.

    Returns region info dict if matched, None otherwise.
    """
    lookup = get_location_keywords(config)
    location_lower = location_text.lower()
    for keyword, region_info in lookup.items():
        if keyword.lower() in location_lower:
            return region_info
    return None


def passes_hard_filters(title: str, employer: str, config: dict) -> tuple[bool, str]:
    """Check if a job passes hard keyword filters.

    Returns (passes, rejection_reason). If passes is True, rejection_reason is empty.
    """
    title_lower = title.lower()
    employer_lower = employer.lower()

    for excluded in config.get("excluded_title_keywords", []):
        if excluded.lower().strip() in title_lower:
            return False, f"Excluded title keyword: '{excluded.strip()}'"

    for excluded_emp in config.get("excluded_employers", []):
        if excluded_emp.lower() in employer_lower:
            return False, f"Excluded employer: '{excluded_emp}'"

    return True, ""


def get_api_key(key_name: str) -> str:
    """Get an API key from environment variables."""
    value = os.environ.get(key_name, "")
    if not value:
        print(f"WARNING: {key_name} not set in environment")
    return value
```

- [ ] **Step 2: Test config loading**

```bash
cd JOBS
python -c "
from scraper.config_loader import load_config, match_location, passes_hard_filters

config = load_config()
print(f'Locations configured: {len(config[\"locations\"])}')
print(f'Search queries: {config[\"search_queries\"]}')

# Test location matching
result = match_location('San Francisco, CA', config)
print(f'San Francisco match: {result}')

result = match_location('Boise, ID', config)
print(f'Boise match: {result}')

# Test hard filters
passes, reason = passes_hard_filters('Emergency Medicine Physician', 'UCSF Health', config)
print(f'EM Physician at UCSF: passes={passes}')

passes, reason = passes_hard_filters('Physician Assistant - Emergency', 'UCSF Health', config)
print(f'PA at UCSF: passes={passes}, reason={reason}')

passes, reason = passes_hard_filters('Emergency Medicine Physician', 'HCA Healthcare', config)
print(f'EM Physician at HCA: passes={passes}, reason={reason}')
"
```

Expected: Shows 8 locations, correct matches for SF (Bay Area, priority 1), None for Boise, passes for EM Physician at UCSF, rejects PA and HCA.

- [ ] **Step 3: Commit**

```bash
git add scraper/config_loader.py
git commit -m "feat: config loader with location matching and hard filters"
```

---

### Task 4: Source Base Class & SerpApi Google Jobs Source

**Files:**
- Create: `JOBS/scraper/sources/__init__.py`
- Create: `JOBS/scraper/sources/base.py`
- Create: `JOBS/scraper/sources/serpapi_google.py`

- [ ] **Step 1: Create sources package and base class**

Create `JOBS/scraper/sources/__init__.py`:
```python
```

Create `JOBS/scraper/sources/base.py`:
```python
from scraper.models import RawPosting


class BaseSource:
    """Base class for all job sources."""

    name: str = "base"

    async def fetch(self, config: dict) -> list[RawPosting]:
        """Fetch raw job postings from this source.

        Args:
            config: The loaded config.yaml dict.

        Returns:
            List of RawPosting objects.
        """
        raise NotImplementedError
```

- [ ] **Step 2: Write SerpApi Google Jobs source**

Create `JOBS/scraper/sources/serpapi_google.py`:
```python
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
                # Check description for salary hints
                salary_text = "Not listed"

            # Build source URL — SerpApi provides a job_id for Google's listing
            source_url = job.get("share_link", job.get("related_links", [{}])[0].get("link", ""))
            if not source_url:
                # Fallback: use apply options if available
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
```

- [ ] **Step 3: Test SerpApi source loads without errors**

```bash
cd JOBS
python -c "
from scraper.sources.serpapi_google import SerpApiGoogleSource
source = SerpApiGoogleSource()
print(f'Source name: {source.name}')
print('SerpApi source module loads correctly.')
"
```

Expected: Prints source name and success message. (Actual API calls tested in integration later.)

- [ ] **Step 4: Commit**

```bash
git add scraper/sources/
git commit -m "feat: base source class and SerpApi Google Jobs source"
```

---

### Task 5: Adzuna API Source

**Files:**
- Create: `JOBS/scraper/sources/adzuna.py`

- [ ] **Step 1: Write Adzuna API source**

Create `JOBS/scraper/sources/adzuna.py`:
```python
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
        # Adzuna US endpoint: /v1/api/jobs/us/search/{page}
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

            # Adzuna provides salary min/max
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
```

- [ ] **Step 2: Test Adzuna source loads**

```bash
cd JOBS
python -c "
from scraper.sources.adzuna import AdzunaSource, REGION_TO_STATES
source = AdzunaSource()
print(f'Source name: {source.name}')
print(f'States covered: {set(s for states in REGION_TO_STATES.values() for s in states)}')
print('Adzuna source module loads correctly.')
"
```

Expected: Prints source name, unique states list, and success message.

- [ ] **Step 3: Commit**

```bash
git add scraper/sources/adzuna.py
git commit -m "feat: Adzuna API job source"
```

---

### Task 6: emCareers.org HTML Scraper

**Files:**
- Create: `JOBS/scraper/sources/emcareers.py`

- [ ] **Step 1: Write emCareers scraper**

Create `JOBS/scraper/sources/emcareers.py`:
```python
import httpx
from bs4 import BeautifulSoup
from scraper.models import RawPosting
from scraper.sources.base import BaseSource


# emCareers (ACEP/EMRA joint board) uses slug-based URLs
# Base: https://www.emcareers.org/jobs/emergency-medicine/
# State filter: /jobs/emergency-medicine/california/
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
        # The exact selectors may need adjustment based on current site structure
        job_cards = soup.select("div.job-listing, article.job-card, div[class*='job']")

        if not job_cards:
            # Fallback: look for any list of links that look like job postings
            job_cards = soup.select("a[href*='/job/'], a[href*='/jobs/']")

        for card in job_cards:
            try:
                # Extract title
                title_el = card.select_one("h2, h3, h4, .job-title, [class*='title']")
                title = title_el.get_text(strip=True) if title_el else card.get_text(strip=True)[:100]

                # Extract employer
                employer_el = card.select_one(".company, .employer, [class*='company']")
                employer = employer_el.get_text(strip=True) if employer_el else "Unknown"

                # Extract location
                location_el = card.select_one(".location, [class*='location']")
                location = location_el.get_text(strip=True) if location_el else state.replace("-", " ").title()

                # Extract link
                link_el = card.select_one("a[href]") if card.name != "a" else card
                href = link_el.get("href", "") if link_el else ""
                if href and not href.startswith("http"):
                    href = f"{self.base_url}{href}"

                # Salary is rarely on the listing page; will be extracted from detail page
                salary_text = "Not listed"
                salary_el = card.select_one("[class*='salary'], [class*='compensation']")
                if salary_el:
                    salary_text = salary_el.get_text(strip=True)

                postings.append(RawPosting(
                    title=title,
                    employer=employer,
                    location=location,
                    description="",  # Will be filled from detail page or by classifier
                    salary_text=salary_text,
                    source_url=href,
                    source_name=self.name,
                ))
            except Exception as e:
                print(f"[{self.name}] Error parsing job card: {e}")
                continue

        return postings
```

- [ ] **Step 2: Test emCareers source loads**

```bash
cd JOBS
python -c "
from scraper.sources.emcareers import EmCareersSource
source = EmCareersSource()
print(f'Source name: {source.name}')
print(f'Base URL: {source.base_url}')
print('emCareers source module loads correctly.')
"
```

Expected: Prints source name, base URL, and success message.

- [ ] **Step 3: Commit**

```bash
git add scraper/sources/emcareers.py
git commit -m "feat: emCareers.org HTML scraper source"
```

---

### Task 7: Claude API Classifier

**Files:**
- Create: `JOBS/scraper/classifier.py`

This is the brain — takes raw postings, sends them to Claude for intelligent parsing and classification.

- [ ] **Step 1: Write `classifier.py`**

Create `JOBS/scraper/classifier.py`:
```python
import json
from datetime import date
from anthropic import Anthropic
from scraper.models import RawPosting, Job, RejectedJob
from scraper.config_loader import get_api_key, passes_hard_filters, match_location


def build_system_prompt(config: dict) -> str:
    """Build the system prompt for Claude with the full job criteria."""
    locations_desc = "\n".join(
        f"  - Priority {loc['priority']}: {loc['name']}"
        + (f" (requires salary >${loc['min_salary_override']:,})" if loc.get('min_salary_override') else "")
        for loc in config["locations"]
    )

    return f"""You are a job classification assistant for an Emergency Medicine physician job search.

CANDIDATE PROFILE:
- Emergency Medicine resident completing training at Mayo Clinic, June 2027
- Seeking full-time attending Emergency Medicine Physician positions
- NOT interested in: PA/NP/APP roles, Medical Director roles, Fellowships, Locum Tenens

LOCATION PREFERENCES (by priority):
{locations_desc}

SALARY REQUIREMENTS:
- Minimum: ${config['salary']['minimum']:,}
- Target range: ${config['salary']['target_low']:,} - ${config['salary']['target_high']:,}

SCHEDULE REQUIREMENTS:
- REJECT ONLY if the position is EXCLUSIVELY overnight/nocturnist shifts
- Mixed schedules with some night shifts are ACCEPTABLE
- Day shifts, swing shifts, rotating schedules are all fine

EXCLUDED EMPLOYERS: {', '.join(config.get('excluded_employers', []))}

INSTITUTION PREFERENCES:
- Preferred: {', '.join(config['institution_preferences']['preferred'])}
- Acceptable: {', '.join(config['institution_preferences']['acceptable'])}
- Excluded: {', '.join(config['institution_preferences']['excluded'])}

For each job posting, analyze the full text and return a JSON object with these exact fields:
{{
  "title": "cleaned job title",
  "employer": "hospital or group name",
  "location": "City, State",
  "location_region": "matched region name from preferences, or 'Unknown' if no match",
  "location_priority": 1-8 (or 99 if no region match),
  "salary": "salary as displayed, e.g. '$350,000-$400,000' or 'Not listed'",
  "salary_numeric": midpoint integer or null if unknown,
  "institution_type": "Academic Medical Center | Trauma Level I | Trauma Level II | Trauma Level III | Private Hospital Group | Community Hospital | Unknown",
  "schedule_type": "Day | Swing | Mixed | Nocturnist-only | Unclear",
  "is_nocturnist_only": true/false,
  "red_flags": ["list of any concerns: HCA-affiliated, APP-disguised, Director-disguised, Fellowship, etc."],
  "match_confidence": "High | Medium | Low",
  "rejection_reason": "specific reason if this job should be rejected, or null if it passes",
  "analysis_notes": "2-3 sentence explanation of your assessment"
}}

IMPORTANT:
- A job is "Nocturnist-only" ONLY if it exclusively requires overnight shifts. "Rotating", "some nights", "mixed schedule" = NOT nocturnist-only.
- If salary is not listed but the posting says "competitive", note that in analysis_notes but set salary_numeric to null.
- If you're unsure about institution type, make your best guess based on the employer name and any clues in the description.
- Be generous with match_confidence — if it's plausibly a good fit, rate it Medium or High.
- Return ONLY the JSON object, no other text."""


def classify_posting(client: Anthropic, raw: RawPosting, config: dict) -> Job | RejectedJob:
    """Classify a single raw posting using Claude.

    Returns either a Job (passed) or RejectedJob (filtered out).
    """
    today = date.today().isoformat()

    # Step 1: Apply hard filters first (cheap, no API call needed)
    passes, reason = passes_hard_filters(raw.title, raw.employer, config)
    if not passes:
        return RejectedJob(
            id=Job.generate_id(raw.employer, raw.location, raw.title),
            title=raw.title,
            employer=raw.employer,
            location=raw.location,
            salary=raw.salary_text,
            source_url=raw.source_url,
            source_name=raw.source_name,
            rejection_reason=reason,
            description_snippet=raw.description[:500] if raw.description else "",
            date_found=today,
        )

    # Step 2: Send to Claude for detailed classification
    posting_text = f"""JOB TITLE: {raw.title}
EMPLOYER: {raw.employer}
LOCATION: {raw.location}
SALARY: {raw.salary_text}
SOURCE: {raw.source_name}

DESCRIPTION:
{raw.description[:3000]}"""

    system_prompt = build_system_prompt(config)

    response = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=1024,
        system=system_prompt,
        messages=[{"role": "user", "content": posting_text}],
    )

    # Parse Claude's JSON response
    response_text = response.content[0].text.strip()
    # Strip markdown code fences if present
    if response_text.startswith("```"):
        response_text = response_text.split("\n", 1)[1]
        if response_text.endswith("```"):
            response_text = response_text[:-3]
        response_text = response_text.strip()

    try:
        result = json.loads(response_text)
    except json.JSONDecodeError:
        # If Claude's response isn't valid JSON, treat as low confidence
        return Job(
            id=Job.generate_id(raw.employer, raw.location, raw.title),
            title=raw.title,
            employer=raw.employer,
            location=raw.location,
            location_region="Unknown",
            location_priority=99,
            salary=raw.salary_text,
            salary_numeric=None,
            institution_type="Unknown",
            schedule_type="Unclear",
            is_nocturnist_only=False,
            match_confidence="Low",
            analysis_notes="Failed to parse Claude classification response",
            source_url=raw.source_url,
            source_name=raw.source_name,
            description_snippet=raw.description[:500] if raw.description else "",
            full_description=raw.description,
            date_found=today,
            date_last_seen=today,
            red_flags=["classification_error"],
        )

    # Step 3: Check if Claude says to reject
    if result.get("rejection_reason"):
        return RejectedJob(
            id=Job.generate_id(
                result.get("employer", raw.employer),
                result.get("location", raw.location),
                result.get("title", raw.title),
            ),
            title=result.get("title", raw.title),
            employer=result.get("employer", raw.employer),
            location=result.get("location", raw.location),
            salary=result.get("salary", raw.salary_text),
            source_url=raw.source_url,
            source_name=raw.source_name,
            rejection_reason=result["rejection_reason"],
            description_snippet=raw.description[:500] if raw.description else "",
            date_found=today,
        )

    # Step 4: Check location-specific salary override
    location_region = result.get("location_region", "Unknown")
    salary_numeric = result.get("salary_numeric")
    for loc in config.get("locations", []):
        if loc["name"] == location_region and loc.get("min_salary_override"):
            if salary_numeric and salary_numeric < loc["min_salary_override"]:
                return RejectedJob(
                    id=Job.generate_id(
                        result.get("employer", raw.employer),
                        result.get("location", raw.location),
                        result.get("title", raw.title),
                    ),
                    title=result.get("title", raw.title),
                    employer=result.get("employer", raw.employer),
                    location=result.get("location", raw.location),
                    salary=result.get("salary", raw.salary_text),
                    source_url=raw.source_url,
                    source_name=raw.source_name,
                    rejection_reason=f"Salary ${salary_numeric:,} below ${loc['min_salary_override']:,} minimum for {location_region}",
                    description_snippet=raw.description[:500] if raw.description else "",
                    date_found=today,
                )

    # Step 5: Return as a matched Job
    return Job(
        id=Job.generate_id(
            result.get("employer", raw.employer),
            result.get("location", raw.location),
            result.get("title", raw.title),
        ),
        title=result.get("title", raw.title),
        employer=result.get("employer", raw.employer),
        location=result.get("location", raw.location),
        location_region=result.get("location_region", "Unknown"),
        location_priority=result.get("location_priority", 99),
        salary=result.get("salary", raw.salary_text),
        salary_numeric=result.get("salary_numeric"),
        institution_type=result.get("institution_type", "Unknown"),
        schedule_type=result.get("schedule_type", "Unclear"),
        is_nocturnist_only=result.get("is_nocturnist_only", False),
        match_confidence=result.get("match_confidence", "Low"),
        analysis_notes=result.get("analysis_notes", ""),
        source_url=raw.source_url,
        source_name=raw.source_name,
        description_snippet=raw.description[:500] if raw.description else "",
        full_description=raw.description,
        date_found=today,
        date_last_seen=today,
        red_flags=result.get("red_flags", []),
    )


def classify_batch(raw_postings: list[RawPosting], config: dict) -> tuple[list[Job], list[RejectedJob]]:
    """Classify a batch of raw postings.

    Returns (matched_jobs, rejected_jobs).
    """
    api_key = get_api_key("ANTHROPIC_API_KEY")
    if not api_key:
        print("ERROR: ANTHROPIC_API_KEY not set. Cannot classify jobs.")
        return [], []

    client = Anthropic(api_key=api_key)
    jobs = []
    rejected = []

    for i, raw in enumerate(raw_postings):
        print(f"  Classifying {i+1}/{len(raw_postings)}: {raw.title} at {raw.employer}...")
        try:
            result = classify_posting(client, raw, config)
            if isinstance(result, Job):
                jobs.append(result)
            else:
                rejected.append(result)
        except Exception as e:
            print(f"  ERROR classifying posting: {e}")
            # On error, add as low-confidence job rather than losing it
            today = date.today().isoformat()
            jobs.append(Job(
                id=Job.generate_id(raw.employer, raw.location, raw.title),
                title=raw.title,
                employer=raw.employer,
                location=raw.location,
                location_region="Unknown",
                location_priority=99,
                salary=raw.salary_text,
                salary_numeric=None,
                institution_type="Unknown",
                schedule_type="Unclear",
                is_nocturnist_only=False,
                match_confidence="Low",
                analysis_notes=f"Classification error: {e}",
                source_url=raw.source_url,
                source_name=raw.source_name,
                description_snippet=raw.description[:500] if raw.description else "",
                full_description=raw.description,
                date_found=today,
                date_last_seen=today,
                red_flags=["classification_error"],
            ))

    print(f"Classification complete: {len(jobs)} matched, {len(rejected)} rejected")
    return jobs, rejected
```

- [ ] **Step 2: Test classifier module loads**

```bash
cd JOBS
python -c "
from scraper.classifier import build_system_prompt, classify_batch
from scraper.config_loader import load_config
config = load_config()
prompt = build_system_prompt(config)
print(f'System prompt length: {len(prompt)} chars')
print(prompt[:200])
print('...')
print('Classifier module loads correctly.')
"
```

Expected: Prints prompt length, first 200 chars of the prompt, and success message.

- [ ] **Step 3: Commit**

```bash
git add scraper/classifier.py
git commit -m "feat: Claude API classifier for job posting analysis"
```

---

### Task 8: Deduplicator & Scraper Runner

**Files:**
- Create: `JOBS/scraper/deduplicator.py`
- Create: `JOBS/scraper/runner.py`
- Create: `JOBS/run_scraper.py`

- [ ] **Step 1: Write `deduplicator.py`**

Create `JOBS/scraper/deduplicator.py`:
```python
from datetime import date
from scraper.models import Job, RejectedJob


def deduplicate_raw(raw_postings: list) -> list:
    """Remove duplicate raw postings before classification (saves API calls).

    Deduplicates by lowercase(employer + location + title).
    """
    seen = set()
    unique = []
    for posting in raw_postings:
        key = f"{posting.employer.lower().strip()}|{posting.location.lower().strip()}|{posting.title.lower().strip()}"
        if key not in seen:
            seen.add(key)
            unique.append(posting)
    return unique


def merge_jobs(new_jobs: list[Job], existing_jobs: list[Job]) -> list[Job]:
    """Merge newly scraped jobs with existing jobs.

    - Existing jobs found again: update date_last_seen, mark is_new=False
    - New jobs not in existing: add them with is_new=True
    - Existing jobs NOT found in new scrape: increment missed_scrapes
    - Jobs with missed_scrapes >= 2: mark as possibly_filled
    """
    today = date.today().isoformat()
    existing_by_id = {job.id: job for job in existing_jobs}
    new_by_id = {job.id: job for job in new_jobs}

    merged = []

    # Process new jobs
    for job_id, new_job in new_by_id.items():
        if job_id in existing_by_id:
            # Job already existed — update it
            existing = existing_by_id[job_id]
            existing.date_last_seen = today
            existing.is_new = False
            existing.missed_scrapes = 0
            existing.status = "active"
            # Update fields that might have changed
            existing.salary = new_job.salary
            existing.salary_numeric = new_job.salary_numeric
            existing.source_url = new_job.source_url
            merged.append(existing)
        else:
            # Brand new job
            new_job.is_new = True
            new_job.date_found = today
            new_job.date_last_seen = today
            merged.append(new_job)

    # Process existing jobs not found in this scrape
    for job_id, existing in existing_by_id.items():
        if job_id not in new_by_id:
            existing.missed_scrapes += 1
            existing.is_new = False
            if existing.missed_scrapes >= 2:
                existing.status = "possibly_filled"
            merged.append(existing)

    return merged


def merge_rejected(new_rejected: list[RejectedJob], existing_rejected: list[RejectedJob]) -> list[RejectedJob]:
    """Merge new rejected jobs with existing rejected jobs.

    Simple dedup by ID — keep the most recent version.
    """
    by_id = {r.id: r for r in existing_rejected}
    for r in new_rejected:
        by_id[r.id] = r  # New version overwrites old
    return list(by_id.values())
```

- [ ] **Step 2: Write `runner.py`**

Create `JOBS/scraper/runner.py`:
```python
import asyncio
from scraper.config_loader import load_config
from scraper.models import load_jobs, save_jobs, load_rejected, save_rejected
from scraper.classifier import classify_batch
from scraper.deduplicator import deduplicate_raw, merge_jobs, merge_rejected
from scraper.sources.serpapi_google import SerpApiGoogleSource
from scraper.sources.adzuna import AdzunaSource
from scraper.sources.emcareers import EmCareersSource


DATA_DIR = "data"
JOBS_FILE = f"{DATA_DIR}/jobs.json"
REJECTED_FILE = f"{DATA_DIR}/rejected.json"


async def fetch_all_sources(config: dict) -> list:
    """Fetch raw postings from all sources in parallel."""
    sources = [
        SerpApiGoogleSource(),
        AdzunaSource(),
        EmCareersSource(),
    ]

    all_postings = []
    # Run all sources concurrently
    tasks = [source.fetch(config) for source in sources]
    results = await asyncio.gather(*tasks, return_exceptions=True)

    for source, result in zip(sources, results):
        if isinstance(result, Exception):
            print(f"[{source.name}] FAILED: {result}")
        else:
            all_postings.extend(result)

    return all_postings


async def run_scrape():
    """Main scrape pipeline: fetch → dedupe → classify → merge → save."""
    print("=" * 60)
    print("EM Physician Job Scraper")
    print("=" * 60)

    # Load config
    print("\n[1/5] Loading configuration...")
    config = load_config()
    print(f"  Locations: {len(config['locations'])}")
    print(f"  Search queries: {len(config['search_queries'])}")

    # Fetch from all sources
    print("\n[2/5] Fetching from all sources...")
    raw_postings = await fetch_all_sources(config)
    print(f"  Total raw postings: {len(raw_postings)}")

    if not raw_postings:
        print("\nNo postings found from any source. Check API keys and network.")
        return

    # Deduplicate raw postings
    print("\n[3/5] Deduplicating raw postings...")
    unique_postings = deduplicate_raw(raw_postings)
    print(f"  Unique postings: {len(unique_postings)} (removed {len(raw_postings) - len(unique_postings)} duplicates)")

    # Classify with Claude
    print("\n[4/5] Classifying with Claude API...")
    new_jobs, new_rejected = classify_batch(unique_postings, config)

    # Load existing data and merge
    print("\n[5/5] Merging with existing data...")
    existing_jobs = load_jobs(JOBS_FILE)
    existing_rejected = load_rejected(REJECTED_FILE)

    merged_jobs = merge_jobs(new_jobs, existing_jobs)
    merged_rejected = merge_rejected(new_rejected, existing_rejected)

    # Save
    save_jobs(merged_jobs, JOBS_FILE)
    save_rejected(merged_rejected, REJECTED_FILE)

    # Summary
    new_count = sum(1 for j in merged_jobs if j.is_new)
    print("\n" + "=" * 60)
    print("SCRAPE COMPLETE")
    print(f"  Total matched jobs: {len(merged_jobs)}")
    print(f"  New jobs this run: {new_count}")
    print(f"  Rejected jobs: {len(merged_rejected)}")
    print(f"  Possibly filled: {sum(1 for j in merged_jobs if j.status == 'possibly_filled')}")
    print("=" * 60)
```

- [ ] **Step 3: Write `run_scraper.py` entry point**

Create `JOBS/run_scraper.py`:
```python
#!/usr/bin/env python3
"""Entry point for the EM Physician Job Scraper.

Usage:
    python run_scraper.py
"""

import asyncio
import os
import sys

# Ensure we're running from the JOBS directory
os.chdir(os.path.dirname(os.path.abspath(__file__)))

# Create data directory if it doesn't exist
os.makedirs("data", exist_ok=True)

from scraper.runner import run_scrape

if __name__ == "__main__":
    asyncio.run(run_scrape())
```

- [ ] **Step 4: Create initial empty data files**

```bash
mkdir -p /c/Users/ryan/OneDrive/Desktop/Playground/JOBS/data
echo "[]" > /c/Users/ryan/OneDrive/Desktop/Playground/JOBS/data/jobs.json
echo "[]" > /c/Users/ryan/OneDrive/Desktop/Playground/JOBS/data/rejected.json
```

- [ ] **Step 5: Test that the full scraper pipeline loads**

```bash
cd JOBS
python -c "
from scraper.runner import run_scrape
print('All scraper modules loaded successfully.')
print('Run python run_scraper.py to execute a full scrape.')
"
```

Expected: Prints success message confirming all imports work.

- [ ] **Step 6: Commit**

```bash
git add scraper/deduplicator.py scraper/runner.py run_scraper.py data/
git commit -m "feat: deduplicator, scraper runner, and entry point"
```

---

### Task 9: Next.js Dashboard — Project Setup & Data Layer

**Files:**
- Create: `JOBS/dashboard/package.json`
- Create: `JOBS/dashboard/next.config.js`
- Create: `JOBS/dashboard/tailwind.config.ts`
- Create: `JOBS/dashboard/tsconfig.json`
- Create: `JOBS/dashboard/postcss.config.js`
- Create: `JOBS/dashboard/lib/types.ts`
- Create: `JOBS/dashboard/lib/jobs.ts`

- [ ] **Step 1: Scaffold the Next.js project**

```bash
cd /c/Users/ryan/OneDrive/Desktop/Playground/JOBS
npx create-next-app@latest dashboard --typescript --tailwind --eslint --app --src-dir=false --import-alias="@/*" --no-turbopack
```

When prompted, accept defaults. This creates the full Next.js project structure.

- [ ] **Step 2: Create TypeScript types matching Python models**

Create `JOBS/dashboard/lib/types.ts`:
```typescript
export interface Job {
  id: string;
  title: string;
  employer: string;
  location: string;
  location_region: string;
  location_priority: number;
  salary: string;
  salary_numeric: number | null;
  institution_type: string;
  schedule_type: string;
  is_nocturnist_only: boolean;
  match_confidence: "High" | "Medium" | "Low";
  analysis_notes: string;
  source_url: string;
  source_name: string;
  description_snippet: string;
  full_description: string;
  date_found: string;
  date_last_seen: string;
  status: "active" | "possibly_filled";
  is_new: boolean;
  red_flags: string[];
  missed_scrapes: number;
}

export interface RejectedJob {
  id: string;
  title: string;
  employer: string;
  location: string;
  salary: string;
  source_url: string;
  source_name: string;
  rejection_reason: string;
  description_snippet: string;
  date_found: string;
}

export type Region =
  | "Bay Area, CA"
  | "San Diego, CA"
  | "California Coast"
  | "Denver/Boulder, CO"
  | "Bozeman, MT"
  | "Stamford, CT"
  | "Boston, MA"
  | "Other East Coast"
  | "Unknown";

export type MatchConfidence = "High" | "Medium" | "Low";

export type InstitutionType =
  | "Academic Medical Center"
  | "Trauma Level I"
  | "Trauma Level II"
  | "Trauma Level III"
  | "Private Hospital Group"
  | "Community Hospital"
  | "Unknown";
```

- [ ] **Step 3: Create data loading helpers**

Create `JOBS/dashboard/lib/jobs.ts`:
```typescript
import { Job, RejectedJob } from "./types";
import fs from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "..", "data");

export function getJobs(): Job[] {
  try {
    const raw = fs.readFileSync(path.join(DATA_DIR, "jobs.json"), "utf-8");
    return JSON.parse(raw) as Job[];
  } catch {
    return [];
  }
}

export function getRejectedJobs(): RejectedJob[] {
  try {
    const raw = fs.readFileSync(path.join(DATA_DIR, "rejected.json"), "utf-8");
    return JSON.parse(raw) as RejectedJob[];
  } catch {
    return [];
  }
}

export function getJobById(id: string): Job | undefined {
  const jobs = getJobs();
  return jobs.find((j) => j.id === id);
}

export function getStats(jobs: Job[]) {
  const active = jobs.filter((j) => j.status === "active");
  const newJobs = active.filter((j) => j.is_new);

  const byRegion: Record<string, number> = {};
  for (const job of active) {
    const region = job.location_region || "Unknown";
    byRegion[region] = (byRegion[region] || 0) + 1;
  }

  const lastScrape = jobs.reduce((latest, j) => {
    return j.date_last_seen > latest ? j.date_last_seen : latest;
  }, "");

  return {
    totalActive: active.length,
    newCount: newJobs.length,
    byRegion,
    lastScrape,
    possiblyFilled: jobs.filter((j) => j.status === "possibly_filled").length,
  };
}

export function getPriorityColor(priority: number): string {
  if (priority <= 1) return "bg-amber-400 text-amber-900";      // Gold
  if (priority <= 3) return "bg-slate-300 text-slate-800";       // Silver
  return "bg-orange-300 text-orange-900";                         // Bronze
}

export function getConfidenceColor(confidence: string): string {
  switch (confidence) {
    case "High":
      return "bg-green-100 text-green-800";
    case "Medium":
      return "bg-yellow-100 text-yellow-800";
    case "Low":
      return "bg-red-100 text-red-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
}
```

- [ ] **Step 4: Commit**

```bash
cd /c/Users/ryan/OneDrive/Desktop/Playground/JOBS
git add dashboard/lib/
git commit -m "feat: dashboard TypeScript types and data loading layer"
```

---

### Task 10: Next.js Dashboard — Pages & Components

**Files:**
- Create: `JOBS/dashboard/app/layout.tsx`
- Create: `JOBS/dashboard/app/page.tsx`
- Create: `JOBS/dashboard/app/rejected/page.tsx`
- Create: `JOBS/dashboard/app/job/[id]/page.tsx`
- Create: `JOBS/dashboard/components/JobCard.tsx`
- Create: `JOBS/dashboard/components/JobFilters.tsx`
- Create: `JOBS/dashboard/components/StatsBar.tsx`
- Create: `JOBS/dashboard/components/SearchBar.tsx`

- [ ] **Step 1: Update root layout**

Edit `JOBS/dashboard/app/layout.tsx` (replace the default content):
```tsx
import type { Metadata } from "next";
import "./globals.css";
import Link from "next/link";

export const metadata: Metadata = {
  title: "EM Job Board",
  description: "Emergency Medicine Physician Job Search Dashboard",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-gray-50 min-h-screen">
        <nav className="bg-white border-b border-gray-200 px-4 py-3">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <Link href="/" className="text-xl font-bold text-gray-900">
              EM Job Board
            </Link>
            <div className="flex gap-4">
              <Link
                href="/"
                className="text-gray-600 hover:text-gray-900 font-medium"
              >
                Jobs
              </Link>
              <Link
                href="/rejected"
                className="text-gray-600 hover:text-gray-900 font-medium"
              >
                Rejected
              </Link>
            </div>
          </div>
        </nav>
        <main className="max-w-7xl mx-auto px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
```

- [ ] **Step 2: Create StatsBar component**

Create `JOBS/dashboard/components/StatsBar.tsx`:
```tsx
interface StatsBarProps {
  totalActive: number;
  newCount: number;
  byRegion: Record<string, number>;
  lastScrape: string;
  possiblyFilled: number;
}

export default function StatsBar({
  totalActive,
  newCount,
  byRegion,
  lastScrape,
  possiblyFilled,
}: StatsBarProps) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
      <div className="flex flex-wrap gap-6 items-center">
        <div>
          <div className="text-2xl font-bold text-gray-900">{totalActive}</div>
          <div className="text-sm text-gray-500">Active Jobs</div>
        </div>
        {newCount > 0 && (
          <div>
            <div className="text-2xl font-bold text-green-600">{newCount}</div>
            <div className="text-sm text-gray-500">New</div>
          </div>
        )}
        {possiblyFilled > 0 && (
          <div>
            <div className="text-2xl font-bold text-orange-500">
              {possiblyFilled}
            </div>
            <div className="text-sm text-gray-500">Possibly Filled</div>
          </div>
        )}
        <div className="flex-1" />
        <div className="flex flex-wrap gap-2">
          {Object.entries(byRegion)
            .sort(([, a], [, b]) => b - a)
            .map(([region, count]) => (
              <span
                key={region}
                className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
              >
                {region}: {count}
              </span>
            ))}
        </div>
        {lastScrape && (
          <div className="text-xs text-gray-400">
            Last updated: {lastScrape}
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create JobCard component**

Create `JOBS/dashboard/components/JobCard.tsx`:
```tsx
import Link from "next/link";
import { Job } from "@/lib/types";
import { getPriorityColor, getConfidenceColor } from "@/lib/jobs";

interface JobCardProps {
  job: Job;
}

export default function JobCard({ job }: JobCardProps) {
  return (
    <Link
      href={`/job/${job.id}`}
      className="block bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-gray-900 truncate">
              {job.title}
            </h3>
            {job.is_new && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                New
              </span>
            )}
            {job.status === "possibly_filled" && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                Possibly Filled
              </span>
            )}
          </div>
          <p className="text-sm text-gray-600 mt-1">{job.employer}</p>
        </div>
        <span
          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getConfidenceColor(job.match_confidence)}`}
        >
          {job.match_confidence}
        </span>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <span
          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(job.location_priority)}`}
        >
          {job.location}
        </span>
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
          {job.salary}
        </span>
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
          {job.institution_type}
        </span>
      </div>

      {job.red_flags.length > 0 && (
        <div className="mt-2 flex gap-1">
          {job.red_flags.map((flag) => (
            <span
              key={flag}
              className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800"
            >
              {flag}
            </span>
          ))}
        </div>
      )}

      <p className="mt-2 text-xs text-gray-400">
        {job.source_name} &middot; Found {job.date_found}
      </p>
    </Link>
  );
}
```

- [ ] **Step 4: Create SearchBar component**

Create `JOBS/dashboard/components/SearchBar.tsx`:
```tsx
"use client";

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
}

export default function SearchBar({ value, onChange }: SearchBarProps) {
  return (
    <input
      type="text"
      placeholder="Search jobs by title, employer, location..."
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
    />
  );
}
```

- [ ] **Step 5: Create JobFilters component**

Create `JOBS/dashboard/components/JobFilters.tsx`:
```tsx
"use client";

interface JobFiltersProps {
  regions: string[];
  selectedRegion: string;
  onRegionChange: (region: string) => void;
  selectedConfidence: string;
  onConfidenceChange: (confidence: string) => void;
  selectedInstitution: string;
  onInstitutionChange: (institution: string) => void;
}

export default function JobFilters({
  regions,
  selectedRegion,
  onRegionChange,
  selectedConfidence,
  onConfidenceChange,
  selectedInstitution,
  onInstitutionChange,
}: JobFiltersProps) {
  return (
    <div className="flex flex-wrap gap-3 mb-4">
      <select
        value={selectedRegion}
        onChange={(e) => onRegionChange(e.target.value)}
        className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
      >
        <option value="">All Regions</option>
        {regions.map((r) => (
          <option key={r} value={r}>
            {r}
          </option>
        ))}
      </select>

      <select
        value={selectedConfidence}
        onChange={(e) => onConfidenceChange(e.target.value)}
        className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
      >
        <option value="">All Confidence</option>
        <option value="High">High</option>
        <option value="Medium">Medium</option>
        <option value="Low">Low</option>
      </select>

      <select
        value={selectedInstitution}
        onChange={(e) => onInstitutionChange(e.target.value)}
        className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
      >
        <option value="">All Institutions</option>
        <option value="Academic Medical Center">Academic Medical Center</option>
        <option value="Trauma Level I">Trauma Level I</option>
        <option value="Trauma Level II">Trauma Level II</option>
        <option value="Trauma Level III">Trauma Level III</option>
        <option value="Private Hospital Group">Private Hospital Group</option>
        <option value="Community Hospital">Community Hospital</option>
      </select>
    </div>
  );
}
```

- [ ] **Step 6: Create main job board page**

Replace `JOBS/dashboard/app/page.tsx`:
```tsx
"use client";

import { useState, useEffect, useMemo } from "react";
import StatsBar from "@/components/StatsBar";
import JobCard from "@/components/JobCard";
import SearchBar from "@/components/SearchBar";
import JobFilters from "@/components/JobFilters";
import { Job } from "@/lib/types";

export default function HomePage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [search, setSearch] = useState("");
  const [region, setRegion] = useState("");
  const [confidence, setConfidence] = useState("");
  const [institution, setInstitution] = useState("");

  useEffect(() => {
    fetch("/api/jobs")
      .then((res) => res.json())
      .then(setJobs)
      .catch(console.error);
  }, []);

  const regions = useMemo(
    () => [...new Set(jobs.map((j) => j.location_region).filter(Boolean))].sort(),
    [jobs]
  );

  const filtered = useMemo(() => {
    let result = jobs;

    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (j) =>
          j.title.toLowerCase().includes(q) ||
          j.employer.toLowerCase().includes(q) ||
          j.location.toLowerCase().includes(q)
      );
    }
    if (region) result = result.filter((j) => j.location_region === region);
    if (confidence)
      result = result.filter((j) => j.match_confidence === confidence);
    if (institution)
      result = result.filter((j) => j.institution_type === institution);

    // Sort: High confidence first, then by location priority, then by date
    return result.sort((a, b) => {
      const confOrder = { High: 0, Medium: 1, Low: 2 };
      const confDiff =
        (confOrder[a.match_confidence] ?? 3) -
        (confOrder[b.match_confidence] ?? 3);
      if (confDiff !== 0) return confDiff;
      const priDiff = a.location_priority - b.location_priority;
      if (priDiff !== 0) return priDiff;
      return b.date_found.localeCompare(a.date_found);
    });
  }, [jobs, search, region, confidence, institution]);

  const stats = useMemo(() => {
    const active = jobs.filter((j) => j.status === "active");
    const byRegion: Record<string, number> = {};
    for (const job of active) {
      const r = job.location_region || "Unknown";
      byRegion[r] = (byRegion[r] || 0) + 1;
    }
    return {
      totalActive: active.length,
      newCount: active.filter((j) => j.is_new).length,
      byRegion,
      lastScrape: jobs.reduce(
        (l, j) => (j.date_last_seen > l ? j.date_last_seen : l),
        ""
      ),
      possiblyFilled: jobs.filter((j) => j.status === "possibly_filled")
        .length,
    };
  }, [jobs]);

  return (
    <>
      <StatsBar {...stats} />
      <div className="mb-4">
        <SearchBar value={search} onChange={setSearch} />
      </div>
      <JobFilters
        regions={regions}
        selectedRegion={region}
        onRegionChange={setRegion}
        selectedConfidence={confidence}
        onConfidenceChange={setConfidence}
        selectedInstitution={institution}
        onInstitutionChange={setInstitution}
      />
      <div className="text-sm text-gray-500 mb-3">
        Showing {filtered.length} of {jobs.length} jobs
      </div>
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {filtered.map((job) => (
          <JobCard key={job.id} job={job} />
        ))}
      </div>
      {filtered.length === 0 && jobs.length > 0 && (
        <p className="text-center text-gray-400 py-12">
          No jobs match your current filters.
        </p>
      )}
      {jobs.length === 0 && (
        <p className="text-center text-gray-400 py-12">
          No jobs yet. Run the scraper to populate data.
        </p>
      )}
    </>
  );
}
```

- [ ] **Step 7: Create API route to serve job data**

Create `JOBS/dashboard/app/api/jobs/route.ts`:
```typescript
import { NextResponse } from "next/server";
import { getJobs } from "@/lib/jobs";

export async function GET() {
  const jobs = getJobs();
  return NextResponse.json(jobs);
}
```

Create `JOBS/dashboard/app/api/rejected/route.ts`:
```typescript
import { NextResponse } from "next/server";
import { getRejectedJobs } from "@/lib/jobs";

export async function GET() {
  const rejected = getRejectedJobs();
  return NextResponse.json(rejected);
}
```

- [ ] **Step 8: Create rejected jobs page**

Create `JOBS/dashboard/app/rejected/page.tsx`:
```tsx
"use client";

import { useState, useEffect, useMemo } from "react";
import { RejectedJob } from "@/lib/types";

export default function RejectedPage() {
  const [rejected, setRejected] = useState<RejectedJob[]>([]);
  const [reasonFilter, setReasonFilter] = useState("");

  useEffect(() => {
    fetch("/api/rejected")
      .then((res) => res.json())
      .then(setRejected)
      .catch(console.error);
  }, []);

  const reasons = useMemo(
    () => [...new Set(rejected.map((r) => r.rejection_reason))].sort(),
    [rejected]
  );

  const filtered = useMemo(() => {
    if (!reasonFilter) return rejected;
    return rejected.filter((r) => r.rejection_reason === reasonFilter);
  }, [rejected, reasonFilter]);

  return (
    <>
      <h1 className="text-2xl font-bold text-gray-900 mb-4">Rejected Jobs</h1>
      <p className="text-sm text-gray-500 mb-4">
        These jobs were found but filtered out. Review them to make sure nothing
        good is being wrongly excluded.
      </p>

      <select
        value={reasonFilter}
        onChange={(e) => setReasonFilter(e.target.value)}
        className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white mb-4"
      >
        <option value="">All Reasons ({rejected.length})</option>
        {reasons.map((r) => (
          <option key={r} value={r}>
            {r} ({rejected.filter((j) => j.rejection_reason === r).length})
          </option>
        ))}
      </select>

      <div className="space-y-3">
        {filtered.map((job) => (
          <div
            key={job.id}
            className="bg-white rounded-lg border border-gray-200 p-4"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="font-semibold text-gray-900">{job.title}</h3>
                <p className="text-sm text-gray-600">{job.employer}</p>
                <p className="text-sm text-gray-500">{job.location}</p>
              </div>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 whitespace-nowrap">
                {job.rejection_reason}
              </span>
            </div>
            {job.source_url && (
              <a
                href={job.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-600 hover:underline mt-2 inline-block"
              >
                View original posting
              </a>
            )}
          </div>
        ))}
      </div>
      {filtered.length === 0 && (
        <p className="text-center text-gray-400 py-12">No rejected jobs.</p>
      )}
    </>
  );
}
```

- [ ] **Step 9: Create job detail page**

Create `JOBS/dashboard/app/job/[id]/page.tsx`:
```tsx
import { getJobById, getConfidenceColor, getPriorityColor } from "@/lib/jobs";
import { notFound } from "next/navigation";
import Link from "next/link";

export default async function JobDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const job = getJobById(id);

  if (!job) {
    notFound();
  }

  return (
    <>
      <Link
        href="/"
        className="text-blue-600 hover:underline text-sm mb-4 inline-block"
      >
        &larr; Back to all jobs
      </Link>

      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{job.title}</h1>
            <p className="text-lg text-gray-600 mt-1">{job.employer}</p>
          </div>
          <span
            className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getConfidenceColor(job.match_confidence)}`}
          >
            {job.match_confidence} Confidence
          </span>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <span
            className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getPriorityColor(job.location_priority)}`}
          >
            {job.location} ({job.location_region})
          </span>
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800">
            {job.salary}
          </span>
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-800">
            {job.institution_type}
          </span>
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
            {job.schedule_type}
          </span>
        </div>

        {job.red_flags.length > 0 && (
          <div className="mt-3 flex gap-1">
            {job.red_flags.map((flag) => (
              <span
                key={flag}
                className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800"
              >
                {flag}
              </span>
            ))}
          </div>
        )}

        <div className="mt-6 border-t border-gray-200 pt-4">
          <h2 className="font-semibold text-gray-900 mb-2">
            AI Analysis Notes
          </h2>
          <p className="text-sm text-gray-700">{job.analysis_notes}</p>
        </div>

        {job.full_description && (
          <div className="mt-4 border-t border-gray-200 pt-4">
            <h2 className="font-semibold text-gray-900 mb-2">
              Full Description
            </h2>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">
              {job.full_description}
            </p>
          </div>
        )}

        <div className="mt-6 border-t border-gray-200 pt-4 flex flex-wrap gap-4">
          <a
            href={job.source_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm"
          >
            View Original Posting &rarr;
          </a>
        </div>

        <div className="mt-4 text-xs text-gray-400">
          Source: {job.source_name} &middot; First found: {job.date_found}{" "}
          &middot; Last seen: {job.date_last_seen} &middot; Status: {job.status}
        </div>
      </div>
    </>
  );
}
```

- [ ] **Step 10: Test the dashboard builds**

```bash
cd /c/Users/ryan/OneDrive/Desktop/Playground/JOBS/dashboard
npm run build
```

Expected: Build completes successfully. May show warnings about no data, which is fine.

- [ ] **Step 11: Commit**

```bash
cd /c/Users/ryan/OneDrive/Desktop/Playground/JOBS
git add dashboard/
git commit -m "feat: Next.js dashboard with job board, rejected view, and job detail pages"
```

---

## Phase 2 — Full Build (Tasks 11-14)

### Task 11: GitHub Actions Cron Workflow

**Files:**
- Create: `JOBS/.github/workflows/scrape.yml`

- [ ] **Step 1: Create the workflow file**

```bash
mkdir -p /c/Users/ryan/OneDrive/Desktop/Playground/JOBS/.github/workflows
```

Create `JOBS/.github/workflows/scrape.yml`:
```yaml
name: Daily Job Scrape

on:
  schedule:
    # Run daily at 12:00 UTC (7:00 AM CT)
    - cron: "0 12 * * *"
  workflow_dispatch: # Allow manual trigger from GitHub UI

jobs:
  scrape:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Set up Python
        uses: actions/setup-python@v5
        with:
          python-version: "3.11"

      - name: Install dependencies
        run: pip install -r requirements.txt

      - name: Run scraper
        env:
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
          SERPAPI_KEY: ${{ secrets.SERPAPI_KEY }}
          ADZUNA_APP_ID: ${{ secrets.ADZUNA_APP_ID }}
          ADZUNA_APP_KEY: ${{ secrets.ADZUNA_APP_KEY }}
        run: python run_scraper.py

      - name: Commit and push updated data
        run: |
          git config user.name "Job Scraper Bot"
          git config user.email "bot@example.com"
          git add data/jobs.json data/rejected.json
          git diff --staged --quiet || git commit -m "data: update job listings $(date -u +%Y-%m-%d)"
          git push
```

- [ ] **Step 2: Commit**

```bash
cd /c/Users/ryan/OneDrive/Desktop/Playground/JOBS
git add .github/
git commit -m "feat: GitHub Actions daily cron workflow for automated scraping"
```

---

### Task 12: Vercel Deployment Configuration

**Files:**
- Create: `JOBS/vercel.json`
- Modify: `JOBS/dashboard/next.config.js`

- [ ] **Step 1: Create Vercel config**

Create `JOBS/vercel.json`:
```json
{
  "buildCommand": "cd dashboard && npm run build",
  "outputDirectory": "dashboard/.next",
  "installCommand": "cd dashboard && npm install",
  "framework": "nextjs",
  "rootDirectory": "dashboard"
}
```

- [ ] **Step 2: Update `next.config.js` for data access**

Edit `JOBS/dashboard/next.config.js` to ensure it can read the data directory:
```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  // Allow reading from the data directory one level up
  experimental: {
    serverComponentsExternalPackages: [],
  },
};

module.exports = nextConfig;
```

- [ ] **Step 3: Commit**

```bash
cd /c/Users/ryan/OneDrive/Desktop/Playground/JOBS
git add vercel.json dashboard/next.config.js
git commit -m "feat: Vercel deployment configuration"
```

---

### Task 13: README with Setup Instructions

**Files:**
- Create: `JOBS/README.md`

- [ ] **Step 1: Write the README**

Create `JOBS/README.md`:
```markdown
# EM Physician Job Search Dashboard

Automated job aggregation and filtering for Emergency Medicine physician positions. Scrapes multiple job boards, uses AI to classify and filter results, and displays everything on a clean web dashboard.

## Quick Start

### 1. Install Python dependencies

```bash
cd JOBS
python -m venv venv
source venv/Scripts/activate  # Windows Git Bash
# source venv/bin/activate    # Mac/Linux
pip install -r requirements.txt
```

### 2. Set up API keys

Copy `.env.example` to `.env` and fill in your keys:

```bash
cp .env.example .env
```

You need:
- **ANTHROPIC_API_KEY** — Get from [console.anthropic.com](https://console.anthropic.com/)
- **SERPAPI_KEY** — Get from [serpapi.com](https://serpapi.com/) (free tier: 100 searches/month)
- **ADZUNA_APP_ID** and **ADZUNA_APP_KEY** — Get from [developer.adzuna.com](https://developer.adzuna.com/)

### 3. Run the scraper

```bash
python run_scraper.py
```

This fetches jobs from all sources, classifies them with AI, and saves results to `data/jobs.json` and `data/rejected.json`.

### 4. View the dashboard locally

```bash
cd dashboard
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 5. Deploy to Vercel

1. Push this repo to GitHub
2. Go to [vercel.com](https://vercel.com) and import the repo
3. Set the root directory to `dashboard`
4. Deploy — you'll get a public URL to share

## Customizing Job Criteria

Edit `config.yaml` to change:
- **Locations** — Add/remove cities, adjust priorities
- **Salary** — Change minimum and target range
- **Excluded employers** — Add hospital systems to block
- **Search queries** — Modify the search terms used

After editing, run `python run_scraper.py` again.

## Automated Daily Scraping

The GitHub Actions workflow (`.github/workflows/scrape.yml`) runs the scraper daily at 7:00 AM CT. To enable it:

1. Push to GitHub
2. Go to Settings > Secrets and variables > Actions
3. Add these secrets: `ANTHROPIC_API_KEY`, `SERPAPI_KEY`, `ADZUNA_APP_ID`, `ADZUNA_APP_KEY`
4. The scraper will run automatically and commit updated data

You can also trigger a manual run from the Actions tab.

## Cost

~$10-20/month total:
- Claude API (job classification): $5-15/month
- SerpApi: Free tier (100 searches/month) or ~$5/month
- Adzuna API: Free tier
- Vercel hosting: Free
- GitHub Actions: Free
```

- [ ] **Step 2: Commit**

```bash
cd /c/Users/ryan/OneDrive/Desktop/Playground/JOBS
git add README.md
git commit -m "docs: README with setup instructions"
```

---

### Task 14: End-to-End Integration Test

This task verifies the full pipeline works.

- [ ] **Step 1: Set up API keys in `.env`**

```bash
cd /c/Users/ryan/OneDrive/Desktop/Playground/JOBS
cp .env.example .env
# Then edit .env and add your real API keys
```

- [ ] **Step 2: Run the scraper**

```bash
cd /c/Users/ryan/OneDrive/Desktop/Playground/JOBS
source venv/Scripts/activate
python run_scraper.py
```

Expected: Output showing each step (loading config, fetching from sources, classifying, merging). Should produce non-empty `data/jobs.json` and `data/rejected.json`.

- [ ] **Step 3: Inspect the data**

```bash
python -c "
import json
with open('data/jobs.json') as f:
    jobs = json.load(f)
with open('data/rejected.json') as f:
    rejected = json.load(f)
print(f'Matched jobs: {len(jobs)}')
print(f'Rejected jobs: {len(rejected)}')
if jobs:
    j = jobs[0]
    print(f'First job: {j[\"title\"]} at {j[\"employer\"]} in {j[\"location\"]}')
    print(f'  Salary: {j[\"salary\"]}')
    print(f'  Confidence: {j[\"match_confidence\"]}')
    print(f'  Region: {j[\"location_region\"]} (priority {j[\"location_priority\"]})')
if rejected:
    r = rejected[0]
    print(f'First rejection: {r[\"title\"]} — {r[\"rejection_reason\"]}')
"
```

Expected: Shows count of matched and rejected jobs, details of first entries.

- [ ] **Step 4: Start the dashboard and verify**

```bash
cd /c/Users/ryan/OneDrive/Desktop/Playground/JOBS/dashboard
npm run dev
```

Then open http://localhost:3000 and verify:
- Jobs appear in the main view
- Filters work (region, confidence, institution type)
- Search bar filters correctly
- Click a job card to see detail page
- Source URL link works
- Navigate to /rejected to see filtered-out jobs
- Check on mobile (resize browser or use dev tools)

- [ ] **Step 5: Commit data from first scrape**

```bash
cd /c/Users/ryan/OneDrive/Desktop/Playground/JOBS
git add data/jobs.json data/rejected.json
git commit -m "data: initial job scrape results"
```

- [ ] **Step 6: Push to GitHub and deploy to Vercel**

```bash
# Create GitHub repo first (via gh CLI or github.com)
gh repo create em-job-board --private --source=. --push

# Then import to Vercel:
# 1. Go to vercel.com → New Project → Import from GitHub
# 2. Select the em-job-board repo
# 3. Set root directory to "dashboard"
# 4. Deploy
```

- [ ] **Step 7: Add GitHub Actions secrets**

In the GitHub repo → Settings → Secrets and variables → Actions, add:
- `ANTHROPIC_API_KEY`
- `SERPAPI_KEY`
- `ADZUNA_APP_ID`
- `ADZUNA_APP_KEY`

- [ ] **Step 8: Trigger a manual workflow run to verify automation**

```bash
gh workflow run scrape.yml
gh run list --limit 1
```

Expected: The workflow runs, scrapes, and commits updated data. Vercel auto-redeploys.

---

## Phase 3 — Future Roadmap (Not Implemented Now)

These are documented for future sessions:

1. **Salary Estimation** — For jobs with "Not Listed" salary, use Claude to estimate based on location, institution type, and comparable postings in the dataset. Add an `estimated_salary` field.

2. **Salary Competitiveness Analysis** — For jobs with listed salary, compare against regional benchmarks. Add a `salary_rating` field ("Above Market", "At Market", "Below Market").

3. **Mayo Clinic Alumni Cross-Reference** — Research physician directories (Doximity profiles, hospital staff pages, Mayo alumni association) to find connections at target institutions. Add a `warm_leads` field to Job.

4. **Recruiter/Hiring Manager Discovery** — Extract contact info from job postings, hospital HR pages, and LinkedIn.

5. **Email Notifications** — Daily/weekly digest of new jobs via SendGrid or Resend.

---

## Verification Checklist

### Phase 1 MVP
- [ ] `python run_scraper.py` produces `jobs.json` and `rejected.json` with real data
- [ ] Jobs in `jobs.json` match criteria (correct locations, no excluded titles, no HCA)
- [ ] Rejected jobs each have a clear, accurate rejection reason
- [ ] Dashboard displays jobs at http://localhost:3000
- [ ] Filters work (region, salary, institution type, confidence)
- [ ] Job detail page shows full info + source link
- [ ] Mobile layout works (responsive)
- [ ] Dashboard deployed to Vercel with shareable URL

### Phase 2 Full Build
- [ ] GitHub Actions cron runs daily at 7 AM CT
- [ ] Automated scrape commits updated data and triggers Vercel rebuild
- [ ] Deduplication works (same job from two sources appears once)
- [ ] "New" badges appear for freshly found jobs
- [ ] "Possibly Filled" appears after a job disappears for 2+ scrapes
- [ ] All three sources (SerpApi, Adzuna, emCareers) produce results
