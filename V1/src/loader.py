"""
Data loader — reads source bank and JD files from disk.

This is the only place in the pipeline that touches the filesystem for input data.
In Phase 2, this gets replaced with a Supabase query — nothing else changes.
"""

import json
from pathlib import Path


def load_source_bank(path: str = "data/source_bank.json") -> dict:
    """Load the full source bank from JSON. Returns the parsed dict."""
    p = Path(path)
    if not p.exists():
        raise FileNotFoundError(f"Source bank not found at {p.resolve()}")
    with open(p) as f:
        return json.load(f)


def load_jd(path: str) -> str:
    """Load a job description text file. Returns the raw string."""
    p = Path(path)
    if not p.exists():
        raise FileNotFoundError(f"Job description not found at {p.resolve()}")
    return p.read_text().strip()
