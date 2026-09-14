"""
Security protocols, headers, request size limits, and IP rate limiting for Saksham API.
"""

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse
from fastapi import Request
from slowapi import Limiter
import os

# Maximum payload limits (in bytes)
MAX_UPLOAD_SIZE = 10 * 1024 * 1024  # 10 MB for documents
MAX_JSON_SIZE = 2 * 1024 * 1024     # 2 MB for JSON bodies


def get_real_client_ip(request: Request) -> str:
    """
    Extract the real client IP address from proxy headers (X-Forwarded-For, X-Real-IP)
    with fallback to direct socket client host.
    """
    forwarded_for = request.headers.get("X-Forwarded-For")
    if forwarded_for:
        client_ip = forwarded_for.split(",")[0].strip()
        if client_ip:
            return client_ip

    real_ip = request.headers.get("X-Real-IP")
    if real_ip:
        return real_ip.strip()

    if request.client and request.client.host:
        return request.client.host

    return "127.0.0.1"


# Global rate limiter instance keyed by client IP
limiter = Limiter(
    key_func=get_real_client_ip,
    default_limits=["120/minute"],
    headers_enabled=False,
    storage_uri="memory://",
)


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """
    Inject modern HTTP security headers to protect against clickjacking,
    MIME-sniffing, XSS, and information leakage.
    """

    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)

        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "geolocation=(), camera=(), microphone=()"

        if request.url.scheme == "https" or request.headers.get("x-forwarded-proto") == "https":
            response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"

        return response


class RequestSizeLimitMiddleware(BaseHTTPMiddleware):
    """
    Protect the application from memory exhaustion / DoS attacks by capping
    incoming request payload sizes.
    """

    async def dispatch(self, request: Request, call_next):
        content_length = request.headers.get("Content-Length")
        if content_length:
            try:
                length = int(content_length)
                max_size = MAX_UPLOAD_SIZE if "/upload-document" in request.url.path else MAX_JSON_SIZE
                if length > max_size:
                    return JSONResponse(
                        status_code=413,
                        content={
                            "detail": f"Payload too large. Maximum allowed size is {max_size // (1024 * 1024)}MB."
                        },
                    )
            except ValueError:
                pass

        return await call_next(request)
