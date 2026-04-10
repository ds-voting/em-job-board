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
