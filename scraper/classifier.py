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
