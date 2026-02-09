"""
Branding API - serves banner gradient colors to SUTs
"""

import json
from pathlib import Path
from typing import List

from fastapi import APIRouter

router = APIRouter(tags=["branding"])

DEFAULT_BANNER_GRADIENT = [93, 135, 141, 183, 189, 231]
CONFIG_FILE = Path.home() / ".rpx" / "service_manager_config.json"


@router.get("/branding")
async def get_branding():
    """Return the banner gradient configuration for SUTs."""
    gradient = DEFAULT_BANNER_GRADIENT
    try:
        if CONFIG_FILE.exists():
            with open(CONFIG_FILE, "r", encoding="utf-8") as f:
                config = json.load(f)
            saved = config.get("banner_gradient")
            if isinstance(saved, list) and len(saved) == 6:
                gradient = saved
    except (json.JSONDecodeError, IOError):
        pass
    return {"banner_gradient": gradient}
