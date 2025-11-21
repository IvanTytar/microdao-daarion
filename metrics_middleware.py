"""
Prometheus Metrics Middleware for DAGI Router
"""
import time
from prometheus_client import Counter, Histogram, Gauge, generate_latest, CONTENT_TYPE_LATEST
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
import logging

logger = logging.getLogger(__name__)

# ============================================================================
# Metrics Definitions
# ============================================================================

# Request counters
http_requests_total = Counter(
    'http_requests_total',
    'Total HTTP requests',
    ['method', 'endpoint', 'status']
)

# Request latency histogram
http_request_duration_seconds = Histogram(
    'http_request_duration_seconds',
    'HTTP request latency in seconds',
    ['method', 'endpoint']
)

# Active requests gauge
http_requests_in_progress = Gauge(
    'http_requests_in_progress',
    'Number of HTTP requests in progress',
    ['method', 'endpoint']
)

# LLM-specific metrics
llm_requests_total = Counter(
    'llm_requests_total',
    'Total LLM requests',
    ['agent_id', 'provider', 'status']
)

llm_request_duration_seconds = Histogram(
    'llm_request_duration_seconds',
    'LLM request latency in seconds',
    ['agent_id', 'provider']
)

llm_tokens_total = Counter(
    'llm_tokens_total',
    'Total LLM tokens used',
    ['agent_id', 'provider', 'type']  # type: prompt/completion
)

llm_errors_total = Counter(
    'llm_errors_total',
    'Total LLM errors',
    ['agent_id', 'provider', 'error_type']
)

# Router-specific metrics
router_agent_requests = Counter(
    'router_agent_requests',
    'Total requests per agent',
    ['agent_id', 'mode']
)

router_provider_usage = Counter(
    'router_provider_usage',
    'Provider usage counts',
    ['provider']
)

# ============================================================================
# Middleware
# ============================================================================

class PrometheusMiddleware(BaseHTTPMiddleware):
    """
    FastAPI middleware for Prometheus metrics collection
    """
    
    async def dispatch(self, request: Request, call_next):
        # Skip metrics endpoint itself
        if request.url.path == "/metrics":
            return await call_next(request)
        
        # Extract endpoint (path template)
        endpoint = request.url.path
        method = request.method
        
        # Track in-progress requests
        http_requests_in_progress.labels(method=method, endpoint=endpoint).inc()
        
        # Measure request duration
        start_time = time.time()
        
        try:
            response = await call_next(request)
            status_code = response.status_code
        except Exception as e:
            logger.error(f"Request failed: {e}")
            status_code = 500
            raise
        finally:
            # Record metrics
            duration = time.time() - start_time
            
            http_requests_total.labels(
                method=method,
                endpoint=endpoint,
                status=status_code
            ).inc()
            
            http_request_duration_seconds.labels(
                method=method,
                endpoint=endpoint
            ).observe(duration)
            
            http_requests_in_progress.labels(method=method, endpoint=endpoint).dec()
        
        return response


# ============================================================================
# Metrics Endpoint
# ============================================================================

def metrics_endpoint():
    """
    Generate Prometheus metrics in text format
    """
    return Response(
        content=generate_latest(),
        media_type=CONTENT_TYPE_LATEST
    )


# ============================================================================
# Helper Functions
# ============================================================================

def track_llm_request(agent_id: str, provider: str, duration: float, tokens: dict = None, error: str = None):
    """
    Track LLM request metrics
    
    Args:
        agent_id: Agent identifier (e.g., "daarwizz", "helion")
        provider: LLM provider (e.g., "ollama", "deepseek")
        duration: Request duration in seconds
        tokens: Token usage dict with "prompt" and "completion" keys
        error: Error type if request failed
    """
    status = "error" if error else "success"
    
    llm_requests_total.labels(
        agent_id=agent_id,
        provider=provider,
        status=status
    ).inc()
    
    if not error:
        llm_request_duration_seconds.labels(
            agent_id=agent_id,
            provider=provider
        ).observe(duration)
        
        if tokens:
            llm_tokens_total.labels(
                agent_id=agent_id,
                provider=provider,
                type="prompt"
            ).inc(tokens.get("prompt", 0))
            
            llm_tokens_total.labels(
                agent_id=agent_id,
                provider=provider,
                type="completion"
            ).inc(tokens.get("completion", 0))
    else:
        llm_errors_total.labels(
            agent_id=agent_id,
            provider=provider,
            error_type=error
        ).inc()


def track_agent_request(agent_id: str, mode: str):
    """
    Track agent request
    
    Args:
        agent_id: Agent identifier
        mode: Request mode (chat, doc_parse, rag_query, etc.)
    """
    router_agent_requests.labels(
        agent_id=agent_id,
        mode=mode
    ).inc()


def track_provider_usage(provider: str):
    """
    Track provider usage
    
    Args:
        provider: Provider name
    """
    router_provider_usage.labels(provider=provider).inc()

