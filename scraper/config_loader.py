import yaml
import os
import re
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


def get_serpapi_keys() -> list[str]:
    """Return all configured SerpAPI keys, in order, for round-robin rotation.

    Reads SERPAPI_KEY_1, SERPAPI_KEY_2, ... (numeric order) plus a legacy plain
    SERPAPI_KEY if present. Each value is sanitized to its leading token, so
    trailing notes in .env (e.g. ``abc123 (maxxed out)``) are ignored. Duplicates
    and blanks are dropped.

    Having several free-tier keys lets the scraper rotate when one hits its
    monthly search cap instead of going dark.
    """
    numbered = []
    for name, value in os.environ.items():
        m = re.fullmatch(r"SERPAPI_KEY_(\d+)", name)
        if m and value.strip():
            numbered.append((int(m.group(1)), value))
    numbered.sort(key=lambda t: t[0])

    raw_values = [v for _, v in numbered]
    legacy = os.environ.get("SERPAPI_KEY", "")
    if legacy.strip():
        raw_values.append(legacy)

    keys: list[str] = []
    seen = set()
    for v in raw_values:
        token = v.strip().split()[0]  # drop trailing notes like "(maxxed out)"
        if token and token not in seen:
            seen.add(token)
            keys.append(token)
    return keys
