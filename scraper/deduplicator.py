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
