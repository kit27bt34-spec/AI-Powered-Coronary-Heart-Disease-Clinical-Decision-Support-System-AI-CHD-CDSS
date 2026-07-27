"""
Centralized Event Bus & Event-Driven Broadcast System
Handles system event publishing, cache invalidation, background job dispatching,
and live WebSocket notifications across Doctor and Super Admin Portals.
"""

import asyncio
import logging
from typing import Dict, Any, Optional
from datetime import datetime

logger = logging.getLogger("EventBus")

class EventPublisher:
    """Publish-Subscribe Event Bus for AI-CHD-CDSS Platform Events."""

    def __init__(self):
        self._listeners = []

    async def publish(self, event_type: str, payload: Dict[str, Any], user_email: Optional[str] = None):
        """
        Publishes a system event.
        - Triggers cache invalidation
        - Broadcasts WebSocket messages to active dashboards
        - Logs background activity
        """
        event_data = {
            "event": event_type,
            "timestamp": datetime.utcnow().isoformat(),
            "payload": payload,
            "user": user_email or "system@hospital.org"
        }

        logger.info(f"[EVENT BUS] Published Event: {event_type} | User: {user_email}")

        # 1. Invalidate Redis Caches
        try:
            from backend.services.cache_service import CacheService
            CacheService.invalidate_dashboard_cache()
        except Exception as e:
            logger.warning(f"[EVENT BUS] Cache invalidation warning: {e}")

        # 2. Broadcast via WebSocket Manager
        try:
            from backend.websocket_manager import ws_manager
            await ws_manager.broadcast(event_data)
        except Exception as e:
            logger.warning(f"[EVENT BUS] WebSocket broadcast warning: {e}")

    def publish_sync(self, event_type: str, payload: Dict[str, Any], user_email: Optional[str] = None):
        """Synchronous helper wrapper for publishing events from standard routes."""
        try:
            loop = asyncio.get_event_loop()
            if loop.is_running():
                asyncio.create_task(self.publish(event_type, payload, user_email))
            else:
                loop.run_until_complete(self.publish(event_type, payload, user_email))
        except Exception:
            # Fallback if no loop in thread
            asyncio.run(self.publish(event_type, payload, user_email))

event_bus = EventPublisher()
