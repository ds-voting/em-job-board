# EM Job Board — Session Handoff

**Last session:** 2026-04-11
**Status:** Phase 1 + Phase 2 complete + GitHub Actions cron validated, Phase 3 not started

---

## ✅ Cron Pipeline — VALIDATED (2026-04-11)

**The GitHub Actions cron is now confirmed working end-to-end.** No immediate action required next session — just verify today's 7am CT run succeeded as a sanity check.

**Quick sanity check (optional at start of next session):**
```bash
gh run list --workflow=scrape.yml --limit 5
```
Expected: top entry `completed / success` from the scheduled run.

### What broke + what was fixed (2026-04-11)

The first scheduled cron (7am CT) failed. Root cause: the workflow was missing `permissions: contents: write`, so `github-actions[bot]` could check out but not push. Fixed in commit `19b90b0`:

- Added `permissions: contents: write` to the `scrape` job
- Added `dashboard/data/` to the `git add` command so Vercel gets fresh data on each run

A manual re-run immediately after the fix completed successfully (9m5s). Tomorrow's scheduled run should work.

**Secondary observation (non-blocking):** emCareers blocks GitHub Actions runner IPs with 403s on all state pages. The scraper handles this gracefully (logs and continues). That source is effectively dead from CI — not urgent to fix, but worth noting.

### Expected Daily Cost

- **~$0.10-$0.30 per daily run** once steady state (skip-existing optimization handles most postings for free)
- ~$3-9/month total
- Top up Anthropic balance with another $5-10 in the next 1-2 weeks

---

## Where We Are

### Live System
- **Dashboard URL:** https://em-job-board.vercel.app
- **GitHub repo:** https://github.com/ds-voting/em-job-board (public)
- **Local working dir:** `c:\Users\ryan\OneDrive\Desktop\Playground\JOBS`
- **Vercel project:** `ryan-7315s-projects/em-job-board`
- **GitHub Actions cron:** Runs daily at 12:00 UTC (7:00 AM CT)

### Job Stats (as of last scrape)
- **32 total matched jobs** across all 7 target regions
- **22 active matches** (10 marked "possibly_filled" from older scrapes)
- **1,123 rejected jobs** (most filtered for free by pre-filter, never sent to Claude)
- **Sources contributing:** Google Jobs (SerpApi), Adzuna, emCareers, PracticeLink

### API Spend Summary
- **Total spent so far:** ~$4.69 across multiple runs (one was a duplicate-process accident)
- **Per-run cost now:** ~$0.30-$0.70 depending on new postings found
- **Remaining budget:** ~$5 in Anthropic key after most recent top-up
- **Optimization in place:** Pre-filter applies hard rules + skips already-classified postings BEFORE calling Claude. Cuts API costs by ~90% (e.g., 432 raw postings → only 30 needing Claude classification on first run, 700+ → 60-70 on subsequent runs).

---

## What's Built (Phase 1 + Phase 2 — DONE)

### Backend (Python Scraper)
- `run_scraper.py` — Single-command entry point
- `scraper/models.py` — Job, RejectedJob, RawPosting dataclasses
- `scraper/config_loader.py` — YAML config + location matching + hard filters
- `scraper/classifier.py` — Claude Sonnet 4 classification with full system prompt
- `scraper/deduplicator.py` — Dedup logic + merge with existing data + possibly_filled tracking
- `scraper/runner.py` — Pipeline orchestration with cost guard prompt
- `scraper/sources/serpapi_google.py` — Google Jobs via SerpApi
- `scraper/sources/adzuna.py` — Adzuna physician job API
- `scraper/sources/emcareers.py` — ACEP/EMRA HTML scraper
- `scraper/sources/practicelink.py` — PracticeLink HTML scraper with regex city/salary extraction

### Frontend (Next.js Dashboard)
- `dashboard/app/page.tsx` — Main job board (search, filter, sort)
- `dashboard/app/rejected/page.tsx` — Rejected jobs with click-to-filter reasons
- `dashboard/app/job/[id]/page.tsx` — Job detail with AI analysis
- `dashboard/app/layout.tsx` — Polished header with gradient brand mark
- `dashboard/components/` — JobCard, StatsBar, SearchBar, JobFilters
- `dashboard/lib/jobs.ts` — Data loader (reads `./data/` then `../data/` fallback)
- `dashboard/lib/utils.ts` — Color helpers (priority/confidence badges)
- `dashboard/data/` — Committed alongside dashboard so Vercel can see it

### Operations
- `.github/workflows/scrape.yml` — Daily GitHub Actions cron with secrets
- GitHub Actions secrets set: `ANTHROPIC_API_KEY`, `SERPAPI_KEY`, `ADZUNA_APP_ID`, `ADZUNA_APP_KEY`
- Vercel environment variables set (same 4 keys, encrypted)
- Vercel project linked to GitHub repo for auto-deploys on push

### Configuration
- `config.yaml` — All job criteria (locations, salary, exclusions)
- 8 priority regions configured with expanded keyword lists
- 3 search queries: "Emergency Medicine Physician", "Emergency Department Physician", "EM Attending Physician"
- Excluded employers: HCA Healthcare, HCA, Envision, TeamHealth
- Excluded title keywords: PA, NP, APP, Medical Director, Fellowship, Locum, Locums

---

## Critical Operational Notes

### Running the Scraper Locally
```bash
cd /c/Users/ryan/OneDrive/Desktop/Playground/JOBS
source venv/Scripts/activate
python run_scraper.py
```
- Will auto-prompt for confirmation if estimated cost exceeds $2.00
- Writes to both `data/` and `dashboard/data/` so Vercel always has fresh data
- After running, commit + push the data files to trigger Vercel rebuild:
  ```bash
  git add data/ dashboard/data/ && git commit -m "data: refresh job listings" && git push
  ```

### IMPORTANT — Cost Safety
- **Always check `tasklist | grep python` before running** to make sure no other instance is going (we burned $1+ once on a double-run)
- The pre-filter now skips already-classified postings, so re-running is cheap
- Budget guard: scraper auto-prompts if cost > $2.00

### How Data Flows
1. Scraper writes to `data/` (canonical) AND `dashboard/data/` (for Vercel)
2. When you `git push`, Vercel auto-deploys the dashboard with fresh `dashboard/data/`
3. GitHub Actions cron does the same thing automatically every day at 7am CT

---

## What's NOT Built — Phase 3 Roadmap

These are documented in the spec but not implemented:

### High-Impact (recommended next)
1. **Salary estimation for unlisted salaries**
   - Many jobs show "Not listed" — Claude could estimate based on location, role, comparable postings in dataset
   - Add `estimated_salary` and `estimation_confidence` fields to Job model
   - Display estimated range in dashboard with a "~" prefix or "(estimated)" tag

2. **Salary competitiveness analysis**
   - For jobs WITH listed salary, compare against regional benchmarks
   - Add `salary_rating` field: "Above Market", "At Market", "Below Market"
   - Use a green/yellow/red badge in the JobCard

### Medium-Impact
3. **Mayo Clinic alumni cross-reference (warm leads)**
   - This was the original "killer feature" idea
   - Would need a source for physician directories at target institutions
   - Doximity has profiles but requires login; LinkedIn requires partner access
   - Possible approach: scrape hospital staff pages, cross-reference names against Mayo alumni directory if accessible
   - Add `warm_leads` field with names + matched institutions
   - **Research needed first** — feasibility unclear

4. **Recruiter/hiring manager contact discovery**
   - Some job postings already include recruiter names (we saw "Ryan Hanscom" in one)
   - Claude could extract these into a structured `contacts` field during classification
   - Display contact info on job detail page

### Low-Priority Polish
5. **Email notifications** — Daily/weekly digest of new matches via SendGrid or Resend
6. **Saved/starred jobs** — Let her mark favorites (would need a backend store, even tiny)
7. **Notes per job** — Let her jot thoughts on each posting (same backend store)
8. **More sources:**
   - Direct hospital career pages (UCSF, Stanford, Mass General Brigham, UCHealth)
   - Doximity if she's willing to provide login cookies
   - Health eCareers
9. **Better job titles parsing** — Some PracticeLink entries have weird title formatting
10. **Mobile responsive review** — Should test on actual phone

---

## Known Issues / Tech Debt

1. **PracticeLink city extraction is regex-based** and occasionally produces "Unknown, CA" when the regex can't find a clean city pattern. Could be improved by following the job detail URL for each listing (more requests though).

2. **emCareers description field is empty** for most jobs because it's only on the detail page, not the listing page. Claude classifies them with limited info — they tend to be Medium confidence.

3. **Some jobs reappear with different IDs** when they get re-listed by recruiters with slight title changes (e.g., "Emergency Medicine Physician" vs "EM Physician"). The deduplicator's hash-based key is strict.

4. **The "Other East Coast" min_salary_override of $400k** isn't enforced anywhere yet — Claude knows about it from the system prompt but the runner doesn't double-check after classification.

5. **Vercel auto-deploys ARE working** — confirmed by the 2026-04-11 manual re-run: data push triggered a Vercel redeploy.

6. **emCareers (ACEP/EMRA) is blocked from GitHub Actions runner IPs** — returns 403 on all state pages when running in CI. Scraper handles it gracefully (logs and continues), so no crashes, but that source contributes 0 jobs from automated runs. Options if we want it back: proxy/residential IP, fetch via a different approach, or just accept the loss.

7. ~~**We have NO test for the GitHub Actions workflow yet.**~~ ✅ Validated 2026-04-11.

---

## Files to Read When Resuming

1. **This file** (`docs/superpowers/HANDOFF.md`) — Current status
2. **`docs/superpowers/specs/2026-04-10-em-job-dashboard-design.md`** — Original design with full criteria
3. **`docs/superpowers/plans/2026-04-10-em-job-dashboard.md`** — Original 14-task implementation plan (Phase 1 + 2 complete)
4. **`config.yaml`** — Current job search criteria
5. **`README.md`** — User-facing setup instructions

---

## Suggested Next Session Starting Points

In priority order, pick whichever feels right:

1. **Quick cron sanity check.** Run `gh run list --workflow=scrape.yml --limit 5` and confirm the most recent scheduled run is `success`. The pipeline was validated on 2026-04-11 so this should be a formality — if it failed again, check the logs for a new issue.

2. **Add Phase 3 salary intelligence.** Both salary estimation and competitiveness analysis are achievable in 1-2 hours and would be huge wins for her decision-making. She'd be able to instantly see which "Not listed" jobs are likely above $400k and which listed salaries are below market.

3. **Add 1-2 more job sources.** Direct hospital career pages for UCSF, Stanford, Mass General would catch jobs that don't show up on aggregators.

4. **Mayo alumni cross-reference research spike.** Spend 30 min researching what data sources are accessible (alumni directories, physician staff pages, etc.) and build a quick prototype.

5. **Address the rejected jobs review pass.** Have her actually look at the rejected page to see if anything good is being wrongly excluded. Adjust the config or filtering logic accordingly.

---

## Sign-Off Notes

**What worked well:**
- Pre-filter optimization saved a fortune on Claude API costs
- Subagent-driven development approach moved fast through 14 tasks
- Modular source architecture made adding PracticeLink trivial
- Polish-the-UI-after-data-works was the right call

**What could've gone better:**
- The double-process accident burned ~$1 unnecessarily — added cost guard prompt + always check `tasklist` before running
- Vercel deployment took longer than expected due to monorepo + free tier collaboration constraints — solved by going public
- Should have done a tiny smoke-test scrape (1 query, 1 location) BEFORE the full first run to verify the pipeline worked end-to-end. We hit the 400 error from SerpApi mid-classification and had to debug from a partial state.

**Lessons for next session:**
- Always smoke-test pipelines with minimal scope before full runs when there's API spend involved
- Check for stale background processes before kicking off any new long-running command
- Public repo > private repo for personal projects with no secrets — avoids Vercel free tier headaches
