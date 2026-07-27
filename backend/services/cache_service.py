"""
Redis Cache & Memory Cache Service
Provides Redis caching layer for Super Admin Dashboard KPIs, prediction analytics,
hospital telemetry, and risk distribution with automatic 60-second TTL & invalidation.
"""

import time
import json
import logging
from typing import Any, Optional

logger = logging.getLogger("CacheService")

# Try to connect to Redis if redis package is available
try:
    import redis
    redis_client = redis.Redis(host="localhost", port=6379, db=0, socket_timeout=1, decode_responses=True)
    # Test connection
    redis_client.ping()
    REDIS_AVAILABLE = True
    logger.info("Redis cache service connected successfully.")
except Exception as e:
    redis_client = None
    REDIS_AVAILABLE = False
    logger.info(f"Redis unavailable, falling back to in-memory TTL cache: {e}")


class MemoryCache:
    """In-memory cache fallback when Redis is not available."""
    def __init__(self):
        self._store = {}
        self._ttls = {}

    def get(self, key: str) -> Optional[str]:
        if key in self._store:
            if time.time() > self._ttls.get(key, 0):
                del self._store[key]
                del self._ttls[key]
                return None
            return self._store[key]
        return None

    def setex(self, key: str, ttl: int, value: str):
        self._store[key] = value
        self._ttls[key] = time.time() + ttl

    def delete(self, key: str):
        self._store.pop(key, None)
        self._ttls.pop(key, None)

    def clear(self):
        self._store.clear()
        self._ttls.clear()

memory_cache = MemoryCache()


class CacheService:
    CACHE_KEY_STATS = "chd_dashboard:stats_all"
    DEFAULT_TTL = 60  # seconds

    @classmethod
    def get_dashboard_stats(cls, role: str = "Super Admin") -> Optional[dict]:
        key = f"{cls.CACHE_KEY_STATS}:{role}"
        try:
            if REDIS_AVAILABLE and redis_client:
                data = redis_client.get(key)
            else:
                data = memory_cache.get(key)

            if data:
                return json.loads(data)
        except Exception as e:
            logger.warning(f"Cache get error: {e}")
        return None

    @classmethod
    def set_dashboard_stats(cls, stats: dict, role: str = "Super Admin", ttl: int = DEFAULT_TTL):
        key = f"{cls.CACHE_KEY_STATS}:{role}"
        try:
            payload = json.dumps(stats)
            if REDIS_AVAILABLE and redis_client:
                redis_client.setex(key, ttl, payload)
            else:
                memory_cache.setex(key, ttl, payload)
        except Exception as e:
            logger.warning(f"Cache set error: {e}")

    @classmethod
    def invalidate_dashboard_cache(cls):
        try:
            if REDIS_AVAILABLE and redis_client:
                keys = redis_client.keys("chd_dashboard:*")
                if keys:
                    redis_client.delete(*keys)
            else:
                memory_cache.clear()
            logger.info("Dashboard cache invalidated.")
        except Exception as e:
            logger.warning(f"Cache invalidation error: {e}")
