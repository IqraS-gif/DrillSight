"""
groq_pool.py — Multi-Key Load Balancing and Failover Pool for Groq API

Supports multiple Groq API keys configured via:
1. GROQ_API_KEYS="key1,key2,key3" (comma, semicolon, or space-separated)
2. GROQ_API_KEY="key1,key2" (comma-separated in standard key var)
3. GROQ_API_KEY_1, GROQ_API_KEY_2, GROQ_API_KEY_3, etc.

Features:
- Automatic failover / rotation when an API key hits:
  - 429 (Rate Limit Exceeded)
  - 401 (Invalid or Revoked API Key)
  - 402 / 403 (Payment Required / Quota Exceeded / Forbidden)
  - Network timeout / connection reset
- Thread-safe active key rotation
- Helper execute_with_groq_failover(...) for async requests
"""

import os
import re
import logging
import threading
from typing import List, Optional, Tuple, Dict, Any
import httpx

logger = logging.getLogger("groq_pool")


class GroqKeyPool:
    def __init__(self):
        self._lock = threading.Lock()
        self._index = 0
        self._cached_keys: List[str] = []
        self._reload_keys()

    def _clean_token(self, token: str) -> str:
        """Strips quotes, brackets, and whitespace from a key."""
        return re.sub(r"^[\s\"'\[]+|[\s\"'\]]+$", "", token).strip()

    def _reload_keys(self):
        """Discovers and parses all configured Groq API keys from environment."""
        keys = []

        # 1. Comma / newline / semicolon separated keys from GROQ_API_KEYS
        bulk_keys = os.getenv("GROQ_API_KEYS", "")
        if bulk_keys:
            for k in re.split(r"[,;\n]+", bulk_keys):
                k = self._clean_token(k)
                if k and k not in keys:
                    keys.append(k)

        # 2. Key(s) in GROQ_API_KEY (supports single key or comma-separated)
        primary_key = os.getenv("GROQ_API_KEY", "")
        if primary_key:
            for k in re.split(r"[,;\n]+", primary_key):
                k = self._clean_token(k)
                if k and k not in keys:
                    keys.append(k)

        # 3. Numbered keys like GROQ_API_KEY_1, GROQ_API_KEY_2, etc.
        for var_name, var_val in sorted(os.environ.items()):
            if re.match(r"^GROQ_API_KEY_\d+$", var_name, re.IGNORECASE):
                val = self._clean_token(var_val)
                if val and val not in keys:
                    keys.append(val)

        self._cached_keys = keys

    def get_keys(self) -> List[str]:
        """Returns list of all active configured keys."""
        with self._lock:
            self._reload_keys()
            return list(self._cached_keys)

    def get_current_key(self) -> Optional[str]:
        """Returns the currently selected key."""
        with self._lock:
            self._reload_keys()
            if not self._cached_keys:
                return None
            return self._cached_keys[self._index % len(self._cached_keys)]

    def rotate_to_next(self, failed_key: Optional[str] = None) -> Optional[str]:
        """
        Advances the pool to the next key.
        """
        with self._lock:
            self._reload_keys()
            if not self._cached_keys:
                return None
            if len(self._cached_keys) == 1:
                return self._cached_keys[0]

            self._index = (self._index + 1) % len(self._cached_keys)
            new_key = self._cached_keys[self._index]

            failed_hint = self.mask_key(failed_key)
            new_hint = self.mask_key(new_key)
            logger.warning(f"[GroqKeyPool] Switched key: {failed_hint} -> {new_hint} (Pool size: {len(self._cached_keys)})")
            print(f"[GroqKeyPool] Rotated key: {failed_hint} -> {new_hint} (Pool size: {len(self._cached_keys)})")
            return new_key

    def mask_key(self, key: Optional[str]) -> str:
        """Returns a masked version of the key for safe logging."""
        if not key:
            return "None"
        if len(key) <= 12:
            return f"{key[:3]}***"
        return f"{key[:8]}...{key[-4:]}"


# Global singleton instance
groq_pool = GroqKeyPool()


async def execute_with_groq_failover(
    url: str,
    headers: Optional[Dict[str, str]] = None,
    json_payload: Optional[Dict[str, Any]] = None,
    data_payload: Optional[Dict[str, Any]] = None,
    files_payload: Optional[Any] = None,
    timeout: float = 20.0,
    max_retries: Optional[int] = None,
) -> Tuple[Optional[httpx.Response], Optional[str]]:
    """
    Executes an HTTP POST against Groq API with automatic key failover on 429, 401, 402, 403, or 5xx.
    Iterates through all configured keys until one succeeds or all fail.

    Returns (response, active_key_used).
    """
    keys = groq_pool.get_keys()
    if not keys:
        logger.error("[GroqKeyPool] No Groq API keys available.")
        return None, None

    attempts = max_retries if max_retries is not None else len(keys)
    last_resp = None

    base_headers = dict(headers or {})

    for attempt in range(attempts):
        current_key = groq_pool.get_current_key()
        req_headers = dict(base_headers)
        req_headers["Authorization"] = f"Bearer {current_key}"

        try:
            async with httpx.AsyncClient(timeout=timeout) as client:
                if json_payload is not None:
                    resp = await client.post(url, headers=req_headers, json=json_payload)
                elif files_payload is not None:
                    resp = await client.post(url, headers=req_headers, data=data_payload, files=files_payload)
                else:
                    resp = await client.post(url, headers=req_headers, data=data_payload)

                last_resp = resp

                # Success
                if resp.status_code == 200:
                    return resp, current_key

                # Rate limited or auth failure -> failover to next key
                if resp.status_code in (429, 401, 402, 403) or resp.status_code >= 500:
                    logger.warning(
                        f"[GroqKeyPool] Key {groq_pool.mask_key(current_key)} failed (HTTP {resp.status_code}). "
                        f"Attempt {attempt + 1}/{attempts}. Rotating key..."
                    )
                    groq_pool.rotate_to_next(failed_key=current_key)
                    continue

                # Other 4xx errors (e.g. 400 Invalid Prompt) are returned directly without rotating
                return resp, current_key

        except (httpx.TimeoutException, httpx.NetworkError) as ex:
            logger.warning(
                f"[GroqKeyPool] Network/Timeout error with key {groq_pool.mask_key(current_key)}: {ex}. "
                f"Attempt {attempt + 1}/{attempts}. Rotating key..."
            )
            groq_pool.rotate_to_next(failed_key=current_key)

    return last_resp, None
