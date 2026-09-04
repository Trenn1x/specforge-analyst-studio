from __future__ import annotations

from fastapi.testclient import TestClient

ASSESSMENT = {
    "expected_commit": "8f3c9bd",
    "actor": "GitHub Actions",
    "source": "ci/run-2042",
    "gate_updates": [
        {
            "gate_id": "tests",
            "status": "passed",
            "result": "430 / 430 clean",
            "summary": "The suite passed without retry.",
            "evidence": {
                "observed_at": "2026-09-04T12:00:00Z",
                "actual": "430 of 430 passed without retry",
                "threshold": "100% pass without retry",
                "source_version": "run-2042",
                "label": "Integration test result",
                "why_it_matters": "Deterministic tests are a trustworthy release signal.",
            },
        }
    ],
}

DECISION = {
    "expected_commit": "8f3c9bd",
    "reviewer": "M. Chen",
    "role": "security",
    "decision": "approve",
    "note": "Threat-model delta reviewed; no release-blocking findings.",
}


def test_health_endpoints_and_response_headers(client: TestClient) -> None:
    request_id = "candidate-demo-123"
    live = client.get("/health/live", headers={"X-Request-ID": request_id})
    ready = client.get("/health/ready")

    assert live.status_code == 200
    assert live.json() == {
        "status": "ok",
        "service": "launchproof-api",
        "version": "0.1.0",
    }
    assert live.headers["x-request-id"] == request_id
    assert live.headers["cache-control"] == "no-store"
    assert live.headers["x-content-type-options"] == "nosniff"
    assert ready.json()["release_count"] == 3
    assert ready.headers["x-request-id"].startswith("req-")


def test_invalid_request_id_is_replaced(client: TestClient) -> None:
    response = client.get("/health/live", headers={"X-Request-ID": "bad id"})

    assert response.status_code == 200
    assert response.headers["x-request-id"].startswith("req-")


def test_list_get_and_audit_endpoints(client: TestClient) -> None:
    releases = client.get("/v1/releases")
    detail = client.get("/v1/releases/atlas-270")
    audit = client.get("/v1/releases/atlas-270/audit")

    assert releases.status_code == 200
    assert releases.json()["count"] == 3
    assert releases.json()["items"][0]["id"] == "atlas-270"
    assert releases.json()["items"][0]["assessment"]["score"] == 85
    assert detail.json()["release"]["product"] == "Atlas"
    assert detail.json()["assessment"]["verdict"] == "Conditional"
    assert audit.json()["count"] == 1
    assert audit.json()["items"][0]["kind"] == "automation"


def test_missing_release_returns_structured_error(client: TestClient) -> None:
    response = client.get(
        "/v1/releases/missing-release", headers={"X-Request-ID": "missing-release-123"}
    )

    assert response.status_code == 404
    assert response.json() == {
        "error": {
            "code": "release_not_found",
            "message": "The requested release does not exist.",
            "issues": None,
        },
        "request_id": "missing-release-123",
    }


def test_assessment_is_created_then_replayed_without_duplicate_audit(
    client: TestClient,
) -> None:
    headers = {"Idempotency-Key": "ci-assessment-2042"}

    created = client.post(
        "/v1/releases/atlas-270/assessments", json=ASSESSMENT, headers=headers
    )
    replayed = client.post(
        "/v1/releases/atlas-270/assessments", json=ASSESSMENT, headers=headers
    )
    audit = client.get("/v1/releases/atlas-270/audit")

    assert created.status_code == 201
    assert created.headers["idempotency-replayed"] == "false"
    assert created.headers["location"] == "/v1/releases/atlas-270"
    assert created.json()["assessment"]["score"] == 90
    assert replayed.status_code == 200
    assert replayed.headers["idempotency-replayed"] == "true"
    assert replayed.json() == created.json()
    assert audit.json()["count"] == 2


def test_idempotency_key_collision_returns_conflict(client: TestClient) -> None:
    headers = {"Idempotency-Key": "ci-assessment-2042"}
    client.post("/v1/releases/atlas-270/assessments", json=ASSESSMENT, headers=headers)
    changed = {
        **ASSESSMENT,
        "gate_updates": [
            {
                **ASSESSMENT["gate_updates"][0],
                "status": "blocked",
                "result": "2 failures",
            }
        ],
    }

    response = client.post(
        "/v1/releases/atlas-270/assessments", json=changed, headers=headers
    )

    assert response.status_code == 409
    assert response.json()["error"]["code"] == "idempotency_conflict"


def test_automation_cannot_overwrite_human_approval(client: TestClient) -> None:
    payload = {
        "expected_commit": "8f3c9bd",
        "actor": "CI bot",
        "source": "ci",
        "gate_updates": [
            {
                **ASSESSMENT["gate_updates"][0],
                "gate_id": "approval",
                "status": "passed",
                "result": "self-approved",
            }
        ],
    }

    response = client.post(
        "/v1/releases/atlas-270/assessments",
        json=payload,
        headers={"Idempotency-Key": "bypass-attempt-001"},
    )

    assert response.status_code == 400
    assert response.json()["error"]["code"] == "invalid_mutation"
    detail = client.get("/v1/releases/atlas-270").json()
    approval = next(gate for gate in detail["release"]["gates"] if gate["id"] == "approval")
    assert approval["status"] == "blocked"


def test_human_decision_can_make_release_ready_and_is_replay_safe(
    client: TestClient,
) -> None:
    headers = {"Idempotency-Key": "security-approval-270"}
    created = client.post(
        "/v1/releases/atlas-270/decisions", json=DECISION, headers=headers
    )
    replayed = client.post(
        "/v1/releases/atlas-270/decisions", json=DECISION, headers=headers
    )

    assert created.status_code == 201
    assert created.json()["assessment"] == {
        "score": 94,
        "verdict": "Ready",
        "blocked": 0,
        "warnings": 1,
        "passed": 6,
        "pending": 0,
    }
    assert created.json()["event"]["kind"] == "human"
    assert created.json()["event"]["action"] == "Approved security gate"
    assert replayed.status_code == 200
    assert replayed.json() == created.json()


def test_commit_conflict_and_approval_role_are_structured(client: TestClient) -> None:
    stale = {**ASSESSMENT, "expected_commit": "abcdef0"}
    commit_conflict = client.post(
        "/v1/releases/atlas-270/assessments",
        json=stale,
        headers={"Idempotency-Key": "stale-commit-001"},
    )
    unauthorized = {**DECISION, "role": "qa"}
    role_denied = client.post(
        "/v1/releases/atlas-270/decisions",
        json=unauthorized,
        headers={"Idempotency-Key": "qa-approval-001"},
    )

    assert commit_conflict.status_code == 409
    assert commit_conflict.json()["error"]["code"] == "commit_conflict"
    assert role_denied.status_code == 403
    assert role_denied.json()["error"]["code"] == "approval_role_required"


def test_validation_errors_are_concise_and_structured(client: TestClient) -> None:
    missing_key = client.post("/v1/releases/atlas-270/assessments", json=ASSESSMENT)
    duplicate_gates = {
        **ASSESSMENT,
        "gate_updates": [ASSESSMENT["gate_updates"][0], ASSESSMENT["gate_updates"][0]],
    }
    duplicate = client.post(
        "/v1/releases/atlas-270/assessments",
        json=duplicate_gates,
        headers={"Idempotency-Key": "duplicate-gates-001"},
    )

    assert missing_key.status_code == 422
    assert missing_key.json()["error"]["code"] == "validation_error"
    assert any(
        issue["field"] == "header.Idempotency-Key"
        for issue in missing_key.json()["error"]["issues"]
    )
    assert duplicate.status_code == 422
    assert "duplicate gate ids" in duplicate.json()["error"]["issues"][0]["message"]


def test_payload_limit_rejects_oversized_requests(client: TestClient) -> None:
    oversized = {**DECISION, "note": "x" * (257 * 1024)}

    response = client.post(
        "/v1/releases/atlas-270/decisions",
        json=oversized,
        headers={"Idempotency-Key": "oversized-decision-001"},
    )

    assert response.status_code == 413
    assert response.json()["error"]["code"] == "payload_too_large"


def test_payload_limit_also_handles_streams_without_content_length(
    client: TestClient,
) -> None:
    def chunks():
        for _ in range(300):
            yield b"x" * 1024

    response = client.post(
        "/v1/releases/atlas-270/decisions",
        content=chunks(),
        headers={
            "Content-Type": "application/json",
            "Idempotency-Key": "streamed-decision-001",
        },
    )

    assert response.status_code == 413
    assert response.json()["error"]["code"] == "payload_too_large"


def test_cors_is_restricted_to_configured_frontend(client: TestClient) -> None:
    allowed = client.options(
        "/v1/releases",
        headers={
            "Origin": "https://trenn1x.github.io",
            "Access-Control-Request-Method": "GET",
        },
    )
    denied = client.options(
        "/v1/releases",
        headers={
            "Origin": "https://untrusted.example",
            "Access-Control-Request-Method": "GET",
        },
    )

    assert allowed.status_code == 200
    assert allowed.headers["access-control-allow-origin"] == "https://trenn1x.github.io"
    assert "access-control-allow-origin" not in denied.headers
