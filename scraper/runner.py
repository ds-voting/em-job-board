import asyncio
from scraper.config_loader import load_config
from scraper.models import load_jobs, save_jobs, load_rejected, save_rejected
from scraper.classifier import classify_batch
from scraper.deduplicator import deduplicate_raw, merge_jobs, merge_rejected
from scraper.sources.serpapi_google import SerpApiGoogleSource
from scraper.sources.adzuna import AdzunaSource
from scraper.sources.emcareers import EmCareersSource
from scraper.sources.practicelink import PracticeLinkSource


DATA_DIR = "data"
JOBS_FILE = f"{DATA_DIR}/jobs.json"
REJECTED_FILE = f"{DATA_DIR}/rejected.json"


async def fetch_all_sources(config: dict) -> list:
    """Fetch raw postings from all sources in parallel."""
    sources = [
        SerpApiGoogleSource(),
        AdzunaSource(),
        EmCareersSource(),
        PracticeLinkSource(),
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
    print("\n[3/6] Deduplicating raw postings...")
    unique_postings = deduplicate_raw(raw_postings)
    print(f"  Unique postings: {len(unique_postings)} (removed {len(raw_postings) - len(unique_postings)} duplicates)")

    # Pre-filter: apply hard filters before sending to Claude (free, no API calls)
    print("\n[4/6] Applying hard filters (free, no API cost)...")
    from scraper.config_loader import passes_hard_filters, match_location
    from scraper.models import Job, RejectedJob
    from datetime import date

    today = date.today().isoformat()
    needs_classification = []
    pre_rejected = []

    # Load existing data to skip already-classified postings
    existing_jobs = load_jobs(JOBS_FILE)
    existing_rejected = load_rejected(REJECTED_FILE)
    already_seen_ids = set(j.id for j in existing_jobs) | set(r.id for r in existing_rejected)
    skipped_existing = 0

    for raw in unique_postings:
        # Skip postings we've already classified
        raw_id = Job.generate_id(raw.employer, raw.location, raw.title)
        if raw_id in already_seen_ids:
            skipped_existing += 1
            continue

        # Check title/employer exclusions
        passes, reason = passes_hard_filters(raw.title, raw.employer, config)
        if not passes:
            pre_rejected.append(RejectedJob(
                id=raw_id,
                title=raw.title,
                employer=raw.employer,
                location=raw.location,
                salary=raw.salary_text,
                source_url=raw.source_url,
                source_name=raw.source_name,
                rejection_reason=reason,
                description_snippet=raw.description[:500] if raw.description else "",
                date_found=today,
            ))
            continue

        # Check if location matches any configured region
        loc_match = match_location(raw.location, config)
        if not loc_match:
            pre_rejected.append(RejectedJob(
                id=raw_id,
                title=raw.title,
                employer=raw.employer,
                location=raw.location,
                salary=raw.salary_text,
                source_url=raw.source_url,
                source_name=raw.source_name,
                rejection_reason=f"Location '{raw.location}' not in any target region",
                description_snippet=raw.description[:500] if raw.description else "",
                date_found=today,
            ))
            continue

        needs_classification.append(raw)

    print(f"  Already classified (skipped): {skipped_existing}")
    print(f"  Pre-filtered out: {len(pre_rejected)} (bad title/employer/location)")
    print(f"  Need Claude classification: {len(needs_classification)}")

    # Cost estimate and confirmation
    est_cost = len(needs_classification) * 0.01
    print(f"\n  Estimated Claude API cost: ${est_cost:.2f} ({len(needs_classification)} postings x ~$0.01 each)")
    if est_cost > 2.00:
        confirm = input(f"  This will cost ~${est_cost:.2f}. Continue? [y/N]: ").strip().lower()
        if confirm != "y":
            print("  Aborted. Reduce search_queries or locations in config.yaml to lower cost.")
            return

    # Classify with Claude
    print("\n[5/6] Classifying with Claude API...")
    new_jobs, new_rejected = classify_batch(needs_classification, config)

    # Combine pre-rejected with Claude-rejected
    new_rejected = pre_rejected + new_rejected

    # Merge with existing data
    print("\n[6/6] Merging with existing data...")

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
