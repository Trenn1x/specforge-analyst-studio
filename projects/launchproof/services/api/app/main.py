"""LaunchProof FastAPI application."""

from __future__ import annotations

import json
import logging
import os
import re
import time
from collections import deque
from collections.abc import Awaitable, Callable
from typing import Annotated
from uuid import uuid4

from fastapi import Depends, FastAPI, Header, Path, Request, Response, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.types import ASGIApp

from app import __version__
from app.models import (
    AssessmentRequest,
    AssessmentResponse,
    AuditResponse,
    DecisionRequest,
    DecisionResponse,
    ErrorBody,
    ErrorIssue,
    ErrorResponse,
    HealthResponse,
    ReadinessResponse,
    ReleaseDetailResponse,
    ReleaseListResponse,
)
from app.repository import InMemoryReleaseRepository, RepositoryError
from app.seed import seed_releases

LOGGER = logging.getLogger("launchproof.api")
if not LOGGER.handlers:
    handler = logging.StreamHandler()
    handler.setFormatter(logging.Formatter("%(message)s"))
    LOGGER.addHandler(handler)
LOGGER.setLevel(os.getenv("LOG_LEVEL", "INFO").upper())
LOGGER.propagate = False

MAX_REQUEST_BYTES = 256 * 1024
REQUEST_ID_PATTERN = re.compile(r"^[A-Za-z0-9._:-]{8,128}$")
RELEASE_ID_PATTERN = r"^[a-z0-9][a-z0-9-]*$"
IDEMPOTENCY_KEY_PATTERN = r"^[A-Za-z0-9._:-]+$"
DEFAULT_ORIGINS = (
    "http://localhost:3000",
    "https://trenn1x.github.io",
)


def _allowed_origins() -> list[str]:
    configured = os.getenv("LAUNCHPROOF_ALLOWED_ORIGINS")
    values = configured.split(",") if configured else DEFAULT_ORIGINS
    return [value.strip().rstrip("/") for value in values if value.strip()]


def _error_response(
    *,
    request_id: str,
    status_code: int,
    code: str,
    message: str,
    issues: list[ErrorIssue] | None = None,
) -> JSONResponse:
    payload = ErrorResponse(
        error=ErrorBody(code=code, message=message, issues=issues),
        request_id=request_id,
    )
    return JSONResponse(status_code=status_code, content=payload.model_dump(mode="json"))


class RequestBodyLimitMiddleware:
    """Reject oversized bodies even when a client omits Content-Length."""

    def __init__(self, app: ASGIApp, max_bytes: int) -> None:
        self.app = app
        self.max_bytes = max_bytes

    async def __call__(self, scope: dict, receive: Callable, send: Callable) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        state = scope.setdefault("state", {})
        request_id = state.get("request_id") or _request_id_from_scope(scope)
        state["request_id"] = request_id

        declared_length = _header_value(scope, b"content-length")
        if declared_length is not None:
            try:
                if int(declared_length) > self.max_bytes:
                    await _send_asgi_error(
                        send,
                        request_id=request_id,
                        status_code=status.HTTP_413_CONTENT_TOO_LARGE,
                        code="payload_too_large",
                        message=f"Request bodies are limited to {self.max_bytes} bytes.",
                    )
                    return
            except ValueError:
                await _send_asgi_error(
                    send,
                    request_id=request_id,
                    status_code=status.HTTP_400_BAD_REQUEST,
                    code="invalid_content_length",
                    message="Content-Length must be an integer.",
                )
                return

        buffered_messages: deque[dict] = deque()
        received = 0
        while True:
            message = await receive()
            buffered_messages.append(message)
            if message["type"] == "http.request":
                received += len(message.get("body", b""))
                if received > self.max_bytes:
                    await _send_asgi_error(
                        send,
                        request_id=request_id,
                        status_code=status.HTTP_413_CONTENT_TOO_LARGE,
                        code="payload_too_large",
                        message=f"Request bodies are limited to {self.max_bytes} bytes.",
                    )
                    return
                if not message.get("more_body", False):
                    break
            elif message["type"] == "http.disconnect":
                break

        async def replay_receive() -> dict:
            if buffered_messages:
                return buffered_messages.popleft()
            return await receive()

        await self.app(scope, replay_receive, send)


def _header_value(scope: dict, name: bytes) -> str | None:
    for key, value in scope.get("headers", []):
        if key.lower() == name:
            return value.decode("latin-1")
    return None


def _request_id_from_scope(scope: dict) -> str:
    supplied = _header_value(scope, b"x-request-id")
    if supplied and REQUEST_ID_PATTERN.fullmatch(supplied):
        return supplied
    return f"req-{uuid4().hex}"


async def _send_asgi_error(
    send: Callable[[dict], Awaitable[None]],
    *,
    request_id: str,
    status_code: int,
    code: str,
    message: str,
) -> None:
    body = ErrorResponse(
        error=ErrorBody(code=code, message=message), request_id=request_id
    ).model_dump_json()
    headers = [
        (b"content-type", b"application/json"),
        (b"content-length", str(len(body.encode("utf-8"))).encode("ascii")),
        (b"x-request-id", request_id.encode("ascii")),
        (b"cache-control", b"no-store"),
    ]
    await send({"type": "http.response.start", "status": status_code, "headers": headers})
    await send({"type": "http.response.body", "body": body.encode("utf-8")})


def _repository(request: Request) -> InMemoryReleaseRepository:
    return request.app.state.repository


RepositoryDependency = Annotated[InMemoryReleaseRepository, Depends(_repository)]
ReleaseId = Annotated[
    str,
    Path(min_length=1, max_length=80, pattern=RELEASE_ID_PATTERN),
]
IdempotencyKey = Annotated[
    str,
    Header(
        alias="Idempotency-Key",
        min_length=8,
        max_length=128,
        pattern=IDEMPOTENCY_KEY_PATTERN,
    ),
]


def create_app(repository: InMemoryReleaseRepository | None = None) -> FastAPI:
    api = FastAPI(
        title="LaunchProof API",
        summary="Evidence-driven release readiness",
        description=(
            "A small production-shaped API for automated release assessments, "
            "accountable human decisions, and auditable evidence."
        ),
        version=__version__,
        contact={"name": "Tom Verdier", "url": "https://github.com/Trenn1x"},
        license_info={"name": "MIT"},
    )
    api.state.repository = repository or InMemoryReleaseRepository(seed_releases())

    api.add_middleware(RequestBodyLimitMiddleware, max_bytes=MAX_REQUEST_BYTES)
    api.add_middleware(
        CORSMiddleware,
        allow_origins=_allowed_origins(),
        allow_credentials=False,
        allow_methods=["GET", "POST", "OPTIONS"],
        allow_headers=["Content-Type", "Idempotency-Key", "X-Request-ID"],
        expose_headers=["Idempotency-Replayed", "Location", "X-Request-ID"],
        max_age=600,
    )

    @api.middleware("http")
    async def request_observability(request: Request, call_next: Callable) -> Response:
        started = time.perf_counter()
        request_id = getattr(request.state, "request_id", None) or _request_id_from_scope(
            request.scope
        )
        request.state.request_id = request_id
        response = await call_next(request)
        duration_ms = round((time.perf_counter() - started) * 1_000, 2)
        response.headers["X-Request-ID"] = request_id
        response.headers["Cache-Control"] = "no-store"
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        LOGGER.info(
            json.dumps(
                {
                    "event": "request.completed",
                    "request_id": request_id,
                    "method": request.method,
                    "path": request.url.path,
                    "status_code": response.status_code,
                    "duration_ms": duration_ms,
                },
                separators=(",", ":"),
            )
        )
        return response

    @api.exception_handler(RepositoryError)
    async def repository_error_handler(request: Request, error: RepositoryError) -> JSONResponse:
        request_id = getattr(request.state, "request_id", f"req-{uuid4().hex}")
        return _error_response(
            request_id=request_id,
            status_code=error.status_code,
            code=error.code,
            message=error.message,
        )

    @api.exception_handler(RequestValidationError)
    async def validation_error_handler(
        request: Request, error: RequestValidationError
    ) -> JSONResponse:
        request_id = getattr(request.state, "request_id", f"req-{uuid4().hex}")
        issues = [
            ErrorIssue(
                field=".".join(str(part) for part in issue["loc"]),
                message=issue["msg"],
                type=issue["type"],
            )
            for issue in error.errors()
        ]
        return _error_response(
            request_id=request_id,
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            code="validation_error",
            message="The request did not match the API contract.",
            issues=issues,
        )

    @api.get("/health/live", response_model=HealthResponse, tags=["health"])
    async def liveness() -> HealthResponse:
        return HealthResponse(status="ok", service="launchproof-api", version=__version__)

    @api.get("/health/ready", response_model=ReadinessResponse, tags=["health"])
    async def readiness(repository: RepositoryDependency) -> ReadinessResponse:
        return ReadinessResponse(
            status="ok",
            service="launchproof-api",
            version=__version__,
            release_count=repository.release_count,
        )

    @api.get("/v1/releases", response_model=ReleaseListResponse, tags=["releases"])
    async def list_releases(repository: RepositoryDependency) -> ReleaseListResponse:
        return repository.list_releases()

    @api.get(
        "/v1/releases/{release_id}",
        response_model=ReleaseDetailResponse,
        tags=["releases"],
    )
    async def get_release(
        release_id: ReleaseId, repository: RepositoryDependency
    ) -> ReleaseDetailResponse:
        return repository.get_release(release_id)

    @api.get(
        "/v1/releases/{release_id}/audit",
        response_model=AuditResponse,
        tags=["audit"],
    )
    async def get_audit(release_id: ReleaseId, repository: RepositoryDependency) -> AuditResponse:
        events = repository.get_audit(release_id)
        return AuditResponse(items=events, count=len(events))

    @api.post(
        "/v1/releases/{release_id}/assessments",
        response_model=AssessmentResponse,
        status_code=status.HTTP_201_CREATED,
        tags=["assessments"],
    )
    async def create_assessment(
        release_id: ReleaseId,
        payload: AssessmentRequest,
        repository: RepositoryDependency,
        response: Response,
        idempotency_key: IdempotencyKey,
    ) -> AssessmentResponse:
        result, replayed = repository.record_assessment(
            release_id, payload, idempotency_key
        )
        response.status_code = status.HTTP_200_OK if replayed else status.HTTP_201_CREATED
        response.headers["Idempotency-Replayed"] = str(replayed).lower()
        response.headers["Location"] = f"/v1/releases/{release_id}"
        return result

    @api.post(
        "/v1/releases/{release_id}/decisions",
        response_model=DecisionResponse,
        status_code=status.HTTP_201_CREATED,
        tags=["decisions"],
    )
    async def create_decision(
        release_id: ReleaseId,
        payload: DecisionRequest,
        repository: RepositoryDependency,
        response: Response,
        idempotency_key: IdempotencyKey,
    ) -> DecisionResponse:
        result, replayed = repository.record_decision(release_id, payload, idempotency_key)
        response.status_code = status.HTTP_200_OK if replayed else status.HTTP_201_CREATED
        response.headers["Idempotency-Replayed"] = str(replayed).lower()
        response.headers["Location"] = f"/v1/releases/{release_id}"
        return result

    return api


app = create_app()
