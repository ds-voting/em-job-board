# Harden classifier + show possibly-filled jobs — Design

**Date:** 2026-06-29
**Context:** Follow-up to the 2026-06-29 incident where the classifier called a retired
Claude model, every call 404'd, and the fail-open error path defaulted 38 misclassified
postings to "matched" on the live board — while the GitHub Actions run still showed green.

## 1. Harden the classifier (`scraper/classifier.py`)

Two failure vectors caused the incident; fix both.

- **Fail closed (per-posting).** In `classify_batch`, a posting that raises during
  classification is no longer appended to the matched list. It is logged and dropped, so
  it is retried on the next run rather than polluting the board. The old behavior
  fabricated a `Job` tagged `red_flags=["classification_error"]`; that path is removed.
  `classify_posting` likewise now *raises* on unparseable JSON instead of fabricating a
  matched job.
- **Fail loud (systemic).** After the loop, if `errors >= 2 and errors * 2 >= attempted`
  (≥ half of attempts failed), raise `SystemicClassificationError`. This propagates out of
  `run_scrape` → `run_scraper.py` exits non-zero → the CI "Run scraper" step goes red →
  the "Commit and push" step is skipped → no misclassified data is committed. A dead model
  or bad key now fails visibly instead of silently shipping junk.

Net: one-off hiccups are silently retried next run; a systemic outage aborts the run.

## 2. One-time data cleanup

Remove the ~81 entries flagged `classification_error` (from a transient 2026-05-05 model
outage) from `data/jobs.json` and `dashboard/data/jobs.json` (272 → 191). They lack proper
classification metadata; any still-open ones will be re-found and properly classified by
the now-fixed pipeline. (Decision: remove all 81.)

## 3. Show possibly-filled jobs on the board (`dashboard/`)

The homepage filtered the list to `status === "active"` only, so after a pause (all jobs
`possibly_filled`) the board looked empty. `JobCard` already renders an orange
"Possibly Filled" badge and `/api/jobs` already returns all jobs.

- `app/page.tsx`: add a `showFilled` toggle (default **on**). The rendered list draws from
  active + possibly-filled when on, active-only when off. Active jobs sort before
  possibly-filled. The StatsBar's "Active Matches" count is unchanged (still active-only).
- `components/JobFilters.tsx`: add a "Show possibly filled" checkbox.

## Verification

- Classifier hardening: standalone test (mock failing client) — systemic failure raises &
  commits nothing; a lone transient error is dropped (not matched); all-success unaffected.
- Dashboard: `next build` passes (TypeScript + static generation) on Next.js 16.2.3.
- Live board confirmed after deploy.

## Out of scope (flagged separately)

- SerpAPI cost reduction / source diversification (researched separately; no code change yet).
