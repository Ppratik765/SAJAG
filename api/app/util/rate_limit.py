"""In-memory per-IP rate limiting utilities for Sajag API.

NOTICE: These rate limits are in-memory and per-instance. They are maintained
within the process memory and are not distributed across separate worker
processes or server replicas.
"""

from __future__ import annotations

import time
from typing import Dict, List
from fastapi import HTTPException, Request

from app.config.settings import trust_proxy

# In-memory sliding window history: key -> list of request timestamps
_rate_limits: Dict[str, List[float]] = {}


def get_client_ip(request: Request) -> str:
    """Extract client IP from request.
    
    If TRUST_PROXY=true, uses the first hop from X-Forwarded-For.
    Otherwise uses the direct client host.
    """
    if trust_proxy():
        forwarded = request.headers.get("x-forwarded-for")
        if forwarded:
            return forwarded.split(",")[0].strip()
    if request.client and request.client.host:
        return request.client.host
    return "127.0.0.1"


def reset_rate_limits() -> None:
    """Clear all stored rate limit history. Used for tests."""
    _rate_limits.clear()


def check_rate_limit(
    client_ip: str,
    route_name: str,
    max_requests: int,
    window_seconds: float = 60.0,
) -> None:
    """Check and record request against per-IP sliding window rate limit.
    
    Raises HTTPException(429) if limit exceeded within window_seconds.
    """
    key = f"{route_name}:{client_ip}"
    now = time.time()
    cutoff = now - window_seconds
    history = [t for t in _rate_limits.get(key, []) if t > cutoff]
    
    if len(history) >= max_requests:
        raise HTTPException(
            status_code=429,
            detail={
                "code": "rate_limit_exceeded",
                "message": f"Rate limit of {max_requests} requests per minute exceeded.",
            },
        )
    
    history.append(now)
    _rate_limits[key] = history
