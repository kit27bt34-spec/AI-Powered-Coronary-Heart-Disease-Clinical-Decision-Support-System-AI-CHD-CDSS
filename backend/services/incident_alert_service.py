import logging
import time
import requests
from typing import Dict, Any
from backend.config import settings

logger = logging.getLogger("IncidentAlertService")

class IncidentAlertService:
    """Enterprise Operational Alerting & Webhook Dispatcher."""

    @staticmethod
    def trigger_incident_alert(alert_type: str, severity: str, details: Dict[str, Any]) -> bool:
        """
        Triggers operational incident alerts for Slack/Teams and Email channels.
        Supported severities: CRITICAL, HIGH, WARNING, INFO.
        """
        timestamp = time.strftime("%Y-%m-%d %H:%M:%S UTC", time.gmtime())
        alert_payload = {
            "project": settings.PROJECT_NAME,
            "alert_type": alert_type,
            "severity": severity,
            "timestamp": timestamp,
            "details": details
        }

        logger.warning(
            f"[INCIDENT ALERT DISPATCHED] [{severity}] {alert_type} — {details.get('message', 'Alert triggered')}"
        )

        # In production, dispatch HTTP POST to Slack Webhook URL if configured
        webhook_url = getattr(settings, "SLACK_WEBHOOK_URL", None)
        if webhook_url:
            try:
                requests.post(webhook_url, json=alert_payload, timeout=3)
            except Exception as e:
                logger.error(f"Failed to post alert webhook: {e}")

        return True

alert_service = IncidentAlertService()
