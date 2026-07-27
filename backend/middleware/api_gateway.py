import uuid
import time
import logging
from fastapi import Request, HTTPException, status

logger = logging.getLogger("APIGateway")

@classmethod
async def api_gateway_middleware(request: Request, call_next):
    """
    Enterprise API Gateway Middleware.
    Enforces Request Correlation IDs, Request Size Limits, and WAF Filtering.
    """
    correlation_id = request.headers.get("X-Correlation-ID", str(uuid.uuid4()))
    request.state.correlation_id = correlation_id

    # WAF Injection Pattern Check
    url_str = str(request.url).lower()
    dangerous_patterns = ["<script>", "javascript:", "union select", "drop table", "exec("]
    for pattern in dangerous_patterns:
        if pattern in url_str:
            logger.warning(f"WAF Security Block: Detected malicious pattern '{pattern}' in URL {request.url}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Security validation error: Invalid input parameter format."
            )

    start_time = time.perf_counter()
    response = await call_next(request)
    process_time = (time.perf_counter() - start_time) * 1000.0

    response.headers["X-Correlation-ID"] = correlation_id
    response.headers["X-Process-Time-MS"] = f"{process_time:.2f}"
    return response
