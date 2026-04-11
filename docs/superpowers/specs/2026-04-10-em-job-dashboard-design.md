# EM Physician Job Search Dashboard — Design Spec

**Date:** 2026-04-10
**Status:** ✅ Phase 1 + Phase 2 SHIPPED — Phase 3 not started
**Live URL:** <https://em-job-board.vercel.app>
**Repo:** <https://github.com/ds-voting/em-job-board>
**Author:** Ryan (operator) + Claude (builder)

---

## Context

Ryan's significant other is in her final year of Emergency Medicine residency at Mayo Clinic in Rochester, MN. She completes her program in June 2027 and is beginning her job search for a full-time Emergency Medicine Physician position. She hasn't started searching yet, so this tool will be her primary job search instrument.

Ryan is not a developer but will manage the technical side (running scripts, editing config). She needs a polished, bookmarkable URL she can check from her phone or any device — no terminal interaction.

**Goal:** Build an automated job aggregation and filtering system with a live web dashboard that surfaces the best EM physician opportunities matching her specific criteria.

---

## Job Criteria

### Must Match
- **Title:** Emergency Medicine Physician (attending-level)
- **Type:** Full-time with benefits (no locum tenens)
- **Schedule:** NOT exclusively overnight/nocturnist. Mixed schedules with some nights are acceptable.
- **Salary:** Minimum $300,000. Target range $350k-$400k.
- **Institution:** Academic Medical Centers, Trauma Centers (Level I preferred), Private Hospital Groups. No HCA hospitals. Prefer Level I/II/III within one hour of a major metro area.

### Must Exclude
- Midlevel APP roles (PA, NP)
- Medical Director roles
- EM Fellowship positions
- Locum tenens
- HCA facilities
- Nocturnist-only / exclusively overnight positions

### Location Preferences (Priority Order)
1. **California Bay Area** — North Bay, South Bay, West Bay preferred. East Bay considered. (Highest priority)
2. **San Diego, CA** — Within the San Diego metro area. (Highest priority)
3. **California Coast** — Within 30-40 min of the coast.
4. **Colorado** — Denver/Boulder area preferred, open to others.
5. **Bozeman, MT**
6. **Connecticut** — Near Stamford, CT.
7. **Massachusetts** — Near and south of Boston, coastal preferred.
8. **Other East Coast** — Only if salary >$400k.

---

## Architecture

### System Overview

```
GitHub Actions (daily cron)
        |
        v
Python Scraper ──> Claude API (parsing & classification)
        |                    |
        v                    v
    jobs.json          rejected.json
    (git repo)          (git repo)
        |
        v
Next.js Dashboard (Vercel, free tier)
        |
        v
    Shareable URL
```

### Two Codebases, One Repo
- **Scraper (Python):** Runs on schedule or manually. Collects, deduplicates, classifies jobs. Commits updated data to the repo.
- **Dashboard (Next.js):** Deployed on Vercel. Reads from the committed JSON data files. Rebuilds automatically when data is pushed.

---

## Component Design

### 1. Scraper (`scraper/`)

**Entry point:** `python run_scraper.py`

One command does everything: scrapes all sources, classifies via Claude, deduplicates, updates data files, and pushes to trigger a dashboard rebuild.

**Job Sources (Priority Order):**

| Tier | Source | Method | Notes |
|------|--------|--------|-------|
| 1 | PracticeLink | API preferred, scrape fallback | Largest physician job board |
| 1 | PracticeMatch | API preferred, scrape fallback | Second largest |
| 1 | ACEP Career Center | Scrape | EM-specific, highly relevant |
| 1 | EMRA Match | Scrape | Targets graduating residents |
| 2 | Health eCareers | API/Scrape | Large physician aggregator |
| 2 | Doximity | API if available | May require account |
| 2 | Indeed/LinkedIn | API preferred | Broad but noisy |
| 2 | Hospital career pages | Scrape | Top-priority systems directly |

Each source is an independent module (`scraper/sources/<name>.py`). If one fails, the others continue. Failed sources log a warning and retry on the next run.

Sources are scraped in parallel for speed.

**Scraper modules use:**
- `httpx` for HTTP requests (async-capable)
- `BeautifulSoup4` for HTML parsing
- Source-specific APIs where available (always preferred over scraping)

### 2. Classifier (`scraper/classifier.py`)

Uses the Claude API to read each raw job posting and extract structured data.

**For each posting, Claude extracts:**

| Field | Description |
|-------|-------------|
| `title` | Cleaned job title |
| `employer` | Hospital/group name |
| `location` | City, State |
| `location_region` | Mapped to our priority regions |
| `location_priority` | 1-8 based on preference list |
| `salary` | Exact figure, range, or "not_listed" |
| `salary_numeric` | Parsed number for filtering (midpoint of range) |
| `institution_type` | Academic, Trauma I/II/III, Community, Private Group |
| `schedule_type` | Day, Swing, Mixed, Nocturnist-only, Unclear |
| `is_nocturnist_only` | Boolean — true only if exclusively overnight |
| `red_flags` | List: HCA, APP-disguised, Director-disguised, Fellowship |
| `match_confidence` | High / Medium / Low |
| `rejection_reason` | If filtered out, specific reason why |
| `analysis_notes` | Brief notes on how Claude interpreted the posting |
| `source_url` | Direct link to original posting |
| `date_found` | When the scraper first discovered this job |
| `date_last_seen` | When the scraper last confirmed this job exists |
| `status` | active / possibly_filled (disappeared from source) |

**Filtering logic:**
1. Hard filters applied first (keyword exclusions for APP/Director/Fellowship/locum, HCA check)
2. Claude reads the full posting for nuanced classification (nocturnist-only detection, salary inference, institution type, location matching)
3. Jobs that pass get a match confidence score
4. Jobs that fail get a specific rejection reason

**Nocturnist rule (clarified):** A job is rejected ONLY if it is exclusively overnight shifts. Jobs mentioning "some nights", "rotating schedule", or "mixed shifts" pass through. Claude is prompted to make this distinction carefully.

### 3. Deduplicator (`scraper/deduplicator.py`)

- Matching key: employer name + location + normalized title
- If a job already exists in `jobs.json`, update `date_last_seen` and any changed fields
- If a previously seen job disappears from its source for 2+ consecutive scrapes, mark as `possibly_filled`
- New jobs get a `is_new` flag for the dashboard "New" badge

### 4. Data Store (`data/`)

Two JSON files committed to the git repo:

- **`jobs.json`** — All jobs that passed filtering. Array of job objects.
- **`rejected.json`** — All jobs that failed filtering. Same structure plus `rejection_reason`.

Why JSON in git (not a database):
- Zero infrastructure cost
- Full version history (when jobs appeared, changed, disappeared)
- Simple to inspect and debug
- Perfectly adequate for this data volume (hundreds of jobs, not millions)

### 5. Configuration (`config.yaml`)

Ryan edits this file to adjust preferences. The scraper and classifier both read from it.

```yaml
locations:
  - name: "Bay Area, CA"
    priority: 1
    keywords: ["San Francisco", "Oakland", "San Jose", "Palo Alto",
               "Stanford", "Mountain View", "Redwood City", "Fremont",
               "Bay Area", "UCSF", "Santa Clara", "Walnut Creek",
               "Marin", "San Mateo", "Berkeley"]
  - name: "San Diego, CA"
    priority: 1
    keywords: ["San Diego", "La Jolla", "Chula Vista", "Oceanside",
               "Escondido", "Carlsbad"]
  - name: "California Coast"
    priority: 2
    keywords: ["Los Angeles", "Santa Barbara", "Monterey", "Santa Cruz",
               "Long Beach", "Orange County", "Irvine", "Laguna"]
  - name: "Denver/Boulder, CO"
    priority: 3
    keywords: ["Denver", "Boulder", "Aurora", "Lakewood",
               "Colorado Springs", "Fort Collins"]
  - name: "Bozeman, MT"
    priority: 4
    keywords: ["Bozeman"]
  - name: "Stamford, CT"
    priority: 5
    keywords: ["Stamford", "Greenwich", "Norwalk", "Bridgeport",
               "New Haven", "Fairfield"]
  - name: "Boston, MA"
    priority: 6
    keywords: ["Boston", "Cambridge", "Quincy", "Plymouth",
               "Cape Cod", "South Shore", "Brockton", "Fall River",
               "New Bedford"]
  - name: "Other East Coast"
    priority: 7
    min_salary_override: 400000
    keywords: ["New York", "Philadelphia", "Washington DC",
               "Baltimore", "Charlotte", "Raleigh"]

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

excluded_titles_keywords:
  - "Physician Assistant"
  - "Nurse Practitioner"
  - "Advanced Practice"
  - "APP "
  - "Medical Director"
  - "Fellowship"
  - "Locum"

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
```

### 6. Dashboard (`dashboard/`)

**Tech:** Next.js 14+ with App Router, Tailwind CSS, deployed to Vercel free tier.

**Pages:**

#### Main Job Board (`/`)
- Summary stats bar at top:
  - Total active matched jobs
  - New jobs since last scrape
  - Breakdown by region (small badges)
  - Last scrape timestamp
- Filter controls: region, salary range, institution type, match confidence
- Search bar for keyword filtering
- Job cards in a responsive grid/list:
  - Job title + employer
  - Location with color-coded priority badge (gold = priority 1, silver = priority 2-3, bronze = 4+)
  - Salary or "Not Listed"
  - Institution type tag
  - Match confidence indicator
  - "New" badge for recently found jobs
  - "Possibly Filled" indicator for disappeared jobs
  - Click to view details

#### Rejected Jobs (`/rejected`)
- Same card layout but with rejection reason prominently displayed
- Filterable by rejection reason category
- Allows her to spot-check that nothing good is being wrongly excluded

#### Job Detail (`/job/[id]`)
- Full parsed details
- Claude's analysis notes
- Original job description text
- Direct link to original posting on source site

**Mobile responsive:** Card layout adapts from grid on desktop to single-column stack on mobile. She'll check this from her phone.

### 7. Scheduling (`/.github/workflows/scrape.yml`)

GitHub Actions workflow:
- Default: runs daily at 7:00 AM CT (her timezone in Rochester)
- Can be triggered manually via GitHub Actions UI ("Run workflow" button)
- Configurable cron expression for daily/weekly/custom
- On completion: commits updated data files and pushes, triggering Vercel rebuild

---

## Phasing

### Phase 1 — MVP (This Week)
- Scraper with 2-3 Tier 1 sources (PracticeLink, ACEP, EMRA)
- Claude-powered classification and filtering
- `config.yaml` with all her criteria
- Basic dashboard: job list, filters, rejected view, job detail
- Manual scraper runs (`python run_scraper.py`)
- Deployed to Vercel with a shareable URL
- README with setup instructions for Ryan

### Phase 2 — Full Build (Week 2)
- All Tier 1 + Tier 2 sources active
- GitHub Actions daily cron automation
- Deduplication and "possibly filled" tracking
- Polished dashboard: stats summary, mobile optimization, "New" badges
- Error handling and scrape failure logging

### Phase 3 — Future Roadmap
- **Salary estimation:** For jobs with no listed salary, estimate based on location, role, and comparable postings in the dataset
- **Salary competitiveness analysis:** For jobs with listed salary, compare against expected range for that region and role (is this above/below market?)
- **Mayo Clinic alumni cross-referencing:** Cross-reference physicians at target institutions with Mayo Clinic alumni directories to identify warm connections
- **Recruiter/hiring manager discovery:** Attempt to find contact info for the hiring manager or recruiter listed on the posting
- **Email notifications:** Optional email digest of new jobs (daily/weekly)

---

## Cost Estimate

| Item | Monthly Cost |
|------|-------------|
| Claude API (job classification, ~100-200 jobs/month) | $5-15 |
| Vercel hosting (free tier) | $0 |
| GitHub Actions (free tier for public/private repos) | $0 |
| Domain name (optional, e.g., jobs.yourdomain.com) | $0-1 |
| **Total** | **$5-16/month** |

Well within the $50/month budget. Phase 3 features (salary analysis, warm leads) may add $5-10/month in additional API calls.

---

## Tech Stack Summary

| Component | Technology |
|-----------|-----------|
| Scraper | Python 3.11+, httpx, BeautifulSoup4, pyyaml |
| Job Classification | Claude API (Anthropic Python SDK) |
| Data Store | JSON files in git |
| Dashboard | Next.js 14+, Tailwind CSS, TypeScript |
| Hosting | Vercel (free tier) |
| Scheduling | GitHub Actions (cron) |
| Version Control | Git + GitHub |

---

## Verification Plan

### MVP Verification (Phase 1)
1. Run `python run_scraper.py` and confirm it produces `jobs.json` and `rejected.json` with real job data
2. Inspect `jobs.json` — verify jobs match criteria (correct locations, no excluded titles, no HCA)
3. Inspect `rejected.json` — verify each rejected job has a clear, accurate reason
4. Open the Vercel dashboard URL — confirm jobs display correctly
5. Test filters on the dashboard (by region, salary, institution type)
6. Click through to a job detail page and verify the source link works
7. Open the dashboard on a phone and verify mobile layout
8. Edit `config.yaml` (e.g., add a location), re-run scraper, confirm the change takes effect

### Full Build Verification (Phase 2)
1. Verify GitHub Actions cron runs successfully on schedule
2. Confirm deduplication works (same job from two sources appears once)
3. Verify "possibly filled" marking after a job disappears
4. Confirm "New" badges appear for freshly found jobs
5. Verify all Tier 1 + Tier 2 sources are producing results
6. Check scrape failure logging when a source is intentionally unavailable
