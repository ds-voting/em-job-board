# EM Job Board — Session Handoff

**Last session:** 2026-07-10
**Status:** Dashboard sort-by-date-captured shipped and live. Pipeline audit found Google Jobs (SerpAPI) has returned **zero raw postings since 2026-05-12** — smoke-tested and confirmed to be a Google-side issue (not our keys/quota/code); user independently confirmed it's not SF-specific. Decision: sit tight, no scraper changes, revisit ~2026-07-17.

---

## 2026-07-10 — Sort control + Google Jobs pipeline audit

**Accomplished**
- Added a "Sort" control to the dashboard (Best Match / Newest Captured / Oldest Captured, keyed on `date_found`) in `JobFilters.tsx`/`page.tsx`. Verified in-browser in all 3 modes, merged to master (`1c1fe81`), confirmed live on Vercel production.
- Dispatched an Opus subagent to audit pipeline health (cron runs, classifier model pin, SerpAPI key rotation/validity) without spending scrape/classification budget. Found: this week's Anthropic billing outage (07-08/07-09) self-resolved and the fail-loud guard worked correctly (no bad data committed); all 3 SerpAPI keys healthy/valid; classifier model pin current (not retired).
- Ran 8 live SerpAPI smoke-test calls (2 batches against one key, ~242/250 left on it after) to diagnose why the Google Jobs source has contributed nothing since 2026-05-12. Confirmed root cause: SerpAPI/Google returns "Fully empty" for every EM-physician phrasing tried (5 variants: the 3 configured `search_queries` plus "ER Physician" / "Emergency Room Physician" / "Emergency Medicine Doctor") in a metro (SF Bay Area) where a generic `q="Physician"` control query returns 10 real results — so it's not a wording, key, or config issue. User independently confirmed via manual browser search that the collapse isn't SF-specific — it's a Google-side problem, not local to our setup.

**Decisions**
- Sit tight: no scraper code changes (not disabling/short-circuiting the Google Jobs source). The waste (~24 credits/run × 5 weekday runs ≈ 120/week going to a dead source) is bounded and harmless — total usage (~528/mo) stays well under the ~750/mo pooled 3-key budget even with it included, so there's no risk of exhausting keys while waiting.
- Revisit around **2026-07-17** by reading the next weekday cron run's log for the `[Google Jobs] Fetched N raw postings` line — costs zero additional SerpAPI credits, since the cron sends the same queries every run regardless of whether anyone's watching.
- Did not investigate the separate, unconfirmed concern surfaced during the audit — that `runner.py` may skip re-classifying postings already present in `jobs.json`, making the "re-found → active" path in `deduplicator.py` dead code (everything would drift to `possibly_filled` after 2 misses regardless of whether it was actually re-found). Flagged for a future session.

**Open questions**
- Is the Google Jobs collapse permanent (Google changing/deprecating the Jobs vertical for this query family) or temporary? Unknown — that's what the 2026-07-17 check is for.
- Does the `runner.py`/`deduplicator.py` re-classification skip actually happen as suspected? Plausible from a read-through during the audit, not confirmed by a test.

**Next step**
- Around 2026-07-17 (or whenever next picked up), run `gh run list --workflow=scrape.yml --limit 5` then `gh run view <latest-weekday-run-id> --log` and check the `[Google Jobs] Fetched N raw postings` line. If still 0, decide whether to pause the Google Jobs source or keep monitoring; if recovered, no action needed. Full smoke-test evidence and reasoning is in memory `project_google_jobs_zero_results`.

---

## 2026-07-10 — Dashboard visual redesign (colors, type, layout)

**Accomplished**
- Redesigned the dashboard's visual system end-to-end on a feature branch, purely frontend (no data/scraper/classifier changes): a 3-accent semantic color system replaces the old 8-color arbitrary badge palette — signal red (`#be123c`) used *only* for interactive elements (brand mark, links, CTAs, focus rings), vital teal (`#0b6e64`) used *only* for High-confidence matches, caution amber (`#8a5a0b`) used *only* for red-flag warnings; everything else (location, salary, institution, status) is neutral ink/slate.
- Replaced unstyled fallback Arial with Space Grotesk (display) + Inter (body) via `next/font/google`.
- Fixed several real sub-AA-contrast text colors (`text-slate-400` captions, `text-ink/50` header subtitle) that were part of the user's "hard to read text" complaint — bumped to `slate-500`+ (~4.6:1+).
- Swapped emoji icons for consistent inline SVGs; removed the decorative gradient corner blob on cards and the 4-tier priority color-coding (priority still drives sort order, just doesn't need its own hue).
- Verified with `tsc --noEmit`, `eslint`, `next build`, and live Chrome DevTools screenshots (desktop + mobile, all 3 pages: matches, job detail, rejected) before merge.
- Merged `design/dashboard-refresh-2026-07-10` → `master`, reconciling with 7 days of unrelated weekday-cron data commits (2026-06-30 through 2026-07-10, zero file overlap) that landed on `origin/master` mid-session. Pushed; Vercel auto-deployed and was confirmed live at https://em-job-board.vercel.app showing both the new design and current data (193 possibly-filled, last updated 2026-07-10).

**Decisions**
- `/advisor` (opus) was unavailable this session; used an opus subagent as the fallback second-opinion reviewer instead, per user instruction.
- That review caught that my first palette draft overloaded red/teal with multiple meanings (interactive vs. data-semantic) and had two accent colors that would've failed contrast — revised to a strict one-hue-one-meaning rule before writing any code.
- Deliberately avoided the editorial/cream/serif direction rejected in an earlier session (see memory `feedback_jobs_dashboard_aesthetic`) — stayed utilitarian/fast-scanning per that standing feedback, took the "restraint" risk (quiet neutral UI, color only where it's earned) rather than a loud one.

**Open questions**
- None blocking — design was reviewed and explicitly approved by the user before merge.

**Next step**
- No specific thread was left mid-flight. Resume from the "Suggested Next Session Starting Points" list further down this file (cron sanity check, Phase 3 salary intelligence, more job sources, Mayo alumni research spike, or a rejected-jobs review pass) — none of those were touched this session.

---

## ✅ Cron Pipeline — LIVE (re-enabled 2026-06-29)

The `schedule` trigger is active again in `.github/workflows/scrape.yml` and the workflow is enabled at the GitHub platform level. It now runs **weekdays only** (`0 12 * * 1-5` UTC / 7 AM CT) — changed from daily so SerpAPI usage stays under the 3-key free budget (see the rotation section below). `workflow_dispatch` also still works for manual runs.

**Verified before re-enabling:** all 3 API providers healthy (SerpAPI 250 searches left/0 used this month, Anthropic key valid + funded, Adzuna OK), and two manual `workflow_dispatch` runs confirmed the pipeline end-to-end (zero classification errors, sensible rejections, no junk committed).

### 🐛 Incident fixed this session — classifier was calling a retired model

The cron was paused 2026-06-16 over a vague "keys need rotation" concern, but the keys were fine. The real, latent problem: **`scraper/classifier.py` hard-coded `model="claude-sonnet-4-20250514"`, which Anthropic retired sometime after 2026-06-15.** Every classification call started returning `404 not_found_error`.

Worse, the classifier **fails open**: on a classification exception (`classifier.py:239-263`) it appends the posting to the *matched* list with a `classification_error` flag instead of dropping it. So the first manual run this session silently committed **38 misclassified postings** (RNs, techs, a rheumatologist) to the live board as "matched" — and a green workflow status hid it.

**Fix (commit `c5731b7`):** updated the model to `claude-sonnet-4-6` (current Sonnet) and reverted the polluted data to the clean pre-run baseline. Re-enable commit: `de96a8f`. A corrective run (`28383418643`) then logged **0 classification errors** and correctly rejected today's batch.

### ✅ Hardening done this session (the fail-open fix)

The fail-open behavior was the real risk — a transient API error on the unattended daily cron would again silently mark postings as matched-junk. Now fixed (commit `42917cc`):
- **Fail closed:** `classify_batch` drops an errored posting (logged, retried next run) instead of defaulting it to "matched". `classify_posting` raises on unparseable JSON instead of fabricating a job.
- **Fail loud:** if ≥ half of classification attempts fail (min 2), it raises `SystemicClassificationError` → `run_scraper.py` exits non-zero → CI step goes red → commit/push is skipped. A dead model/bad key now fails visibly instead of shipping junk.
- Verified with a mock-client test (systemic→raise+no-commit; lone error→dropped; all-good→unaffected).

The ~81 `classification_error` entries from the 2026-05-05 transient outage were **removed** (commit `8d8821a`, 272 → 191). Still-open ones will be re-found and properly classified.

### Dashboard change this session — possibly-filled now visible

`dashboard/app/page.tsx` previously listed `status==="active"` only, so after the pause the board looked empty. Added a "Show possibly filled" toggle (default **on**) in `JobFilters.tsx`; active jobs sort above possibly-filled. StatsBar "Active Matches" still counts active only. Commit `9f8d763`. Verified live: 191 cards render, toggle works. Design doc: `docs/superpowers/specs/2026-06-29-harden-classifier-and-show-possibly-filled.md`.

### SerpAPI multi-key rotation (built 2026-06-29)

Instead of paying, we run **3 free-tier keys** (`SERPAPI_KEY_1/2/3` in `.env` and as GH secrets) = ~750 searches/mo. `scraper/sources/serpapi_google.py` rotates: it uses one key until SerpAPI reports it's out (HTTP 429 or "ran out" JSON error), then advances to the next; if all are exhausted it stops gracefully. Keys load via `get_serpapi_keys()` in `config_loader.py` (reads `SERPAPI_KEY_<n>` in order + legacy `SERPAPI_KEY`, sanitizing trailing `.env` notes).

**Cadence math:** ~24 searches/run (3 queries × 8 regions). The cron is now **weekdays only** (`0 12 * * 1-5`, ~22 runs/mo ≈ 528 searches) to stay under 750 with margin for manual re-runs. Daily (744/750) would fit but with ~no buffer.

**Note:** the 3 keys reset on *staggered* monthly dates (separate accounts), so it's ~750/mo capacity, not a single calendar-month bucket — the rotator's fallback handles that. If we ever outgrow this, the researched paid options are JSearch ($25/mo, 10k) or DataForSEO (~$1/mo, $50 prepaid); the cheaper lever is consolidating the 8 per-region searches.
- After cleanup the matched set is mostly `possibly_filled` (192 matched as of 2026-06-29: 1 active + 191 possibly-filled, all visible on the board). The "Active Matches" stat stays low until the weekday cron re-confirms still-open postings over the coming days. Expected, not a bug.

**Previously validated (2026-04-11):** cron ran end-to-end successfully after the `permissions: contents: write` fix.

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
- **GitHub Actions cron:** Runs weekdays (Mon–Fri) at 12:00 UTC (7:00 AM CT)

### Job Stats (as of 2026-06-29)
- **192 total matched jobs** — 1 active, 191 possibly_filled (all `possibly_filled` after the 2-week pause; will re-activate as the weekday cron re-confirms them)
- **4,373 rejected jobs** (most filtered for free by pre-filter, never sent to Claude)
- **Matched by source:** Google Jobs (SerpApi) 104, emCareers 35, PracticeLink 27, Adzuna 26 — SerpApi is the top *matched* source, so the key rotation matters
- **Sources contributing:** Google Jobs (SerpApi, multi-key rotation), Adzuna, emCareers (0 from CI — IP-blocked), PracticeLink

### API Spend Summary
- **Total spent so far:** ~$4.69 across multiple runs (one was a duplicate-process accident)
- **Per-run cost now:** ~$0.30-$0.70 depending on new postings found
- **Remaining budget:** Anthropic key confirmed *funded* as of 2026-06-29 (a billed validation call succeeded); exact balance not checked. The model fix + skip-existing keep per-run cost low.
- **Optimization in place:** Pre-filter applies hard rules + skips already-classified postings BEFORE calling Claude. Cuts API costs by ~90% (e.g., 432 raw postings → only 30 needing Claude classification on first run, 700+ → 60-70 on subsequent runs).

---

## What's Built (Phase 1 + Phase 2 — DONE)

### Backend (Python Scraper)
- `run_scraper.py` — Single-command entry point
- `scraper/models.py` — Job, RejectedJob, RawPosting dataclasses
- `scraper/config_loader.py` — YAML config + location matching + hard filters
- `scraper/classifier.py` — Claude classification (model `claude-sonnet-4-6`); fails closed + raises `SystemicClassificationError` on systemic failure
- `scraper/deduplicator.py` — Dedup logic + merge with existing data + possibly_filled tracking
- `scraper/runner.py` — Pipeline orchestration with cost guard prompt
- `scraper/sources/serpapi_google.py` — Google Jobs via SerpApi, with multi-key rotation (`get_serpapi_keys()`)
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
- `.github/workflows/scrape.yml` — Weekday (Mon–Fri) GitHub Actions cron with secrets
- GitHub Actions secrets set: `ANTHROPIC_API_KEY`, `SERPAPI_KEY_1/2/3` (rotated), `ADZUNA_APP_ID`, `ADZUNA_APP_KEY` (legacy single `SERPAPI_KEY` secret still present but unused)
- **Vercel needs NO API keys** — it only hosts the static dashboard, which reads the JSON committed by the Action. All secrets live in GitHub, not Vercel.
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
3. GitHub Actions cron does the same thing automatically on weekdays at 7am CT

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

1. **Quick cron sanity check.** Run `gh run list --workflow=scrape.yml --limit 5` and confirm the most recent *scheduled* (weekday) run is `success`. Fully verified 2026-06-29 (classifier + rotator). If a run goes red, that's now intentional fail-loud behavior — check the "Run scraper" log for `SystemicClassificationError` (model/key problem) before assuming a flake.

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
