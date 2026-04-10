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
