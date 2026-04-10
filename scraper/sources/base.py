from scraper.models import RawPosting


class BaseSource:
    """Base class for all job sources."""

    name: str = "base"

    async def fetch(self, config: dict) -> list[RawPosting]:
        """Fetch raw job postings from this source.

        Args:
            config: The loaded config.yaml dict.

        Returns:
            List of RawPosting objects.
        """
        raise NotImplementedError
