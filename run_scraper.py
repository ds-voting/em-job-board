#!/usr/bin/env python3
"""Entry point for the EM Physician Job Scraper.

Usage:
    python run_scraper.py
"""

import asyncio
import os
import sys

# Ensure we're running from the JOBS directory
os.chdir(os.path.dirname(os.path.abspath(__file__)))

# Create data directory if it doesn't exist
os.makedirs("data", exist_ok=True)

from scraper.runner import run_scrape

if __name__ == "__main__":
    asyncio.run(run_scrape())
