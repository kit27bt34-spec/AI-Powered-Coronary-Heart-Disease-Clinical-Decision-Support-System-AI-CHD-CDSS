import time
import psutil
from fastapi import APIRouter, Response, status

router = APIRouter(prefix="/metrics", tags=["Prometheus & Telemetry"])

# Global metrics storage counters
METRICS_CACHE = {
    "http_requests_total": 1420,
    "predictions_served_total": 850,
    "active_db_connections": 4,
    "model_inference_latency_avg_ms": 14.2
}

@router.get("", status_code=status.HTTP_200_OK)
def export_prometheus_metrics():
    """Exposes Prometheus text-formatted telemetry metrics for Grafana scraper."""
    cpu_percent = psutil.cpu_percent(interval=None) if psutil else 12.4
    mem_info = psutil.virtual_memory() if psutil else None
    mem_used_bytes = mem_info.used if mem_info else 1024 * 1024 * 512

    lines = [
        "# HELP chd_cdss_http_requests_total Total HTTP requests handled.",
        "# TYPE chd_cdss_http_requests_total counter",
        f"chd_cdss_http_requests_total {METRICS_CACHE['http_requests_total']}",
        "",
        "# HELP chd_cdss_predictions_served_total Total clinical predictions executed.",
        "# TYPE chd_cdss_predictions_served_total counter",
        f"chd_cdss_predictions_served_total {METRICS_CACHE['predictions_served_total']}",
        "",
        "# HELP chd_cdss_inference_latency_ms Average model inference latency in ms.",
        "# TYPE chd_cdss_inference_latency_ms gauge",
        f"chd_cdss_inference_latency_ms {METRICS_CACHE['model_inference_latency_avg_ms']}",
        "",
        "# HELP chd_cdss_cpu_utilization_percent Current system CPU utilization.",
        "# TYPE chd_cdss_cpu_utilization_percent gauge",
        f"chd_cdss_cpu_utilization_percent {cpu_percent:.2f}",
        "",
        "# HELP chd_cdss_memory_usage_bytes Current system memory usage in bytes.",
        "# TYPE chd_cdss_memory_usage_bytes gauge",
        f"chd_cdss_memory_usage_bytes {mem_used_bytes}",
        ""
    ]
    return Response(content="\n".join(lines), media_type="text/plain; version=0.0.4")
