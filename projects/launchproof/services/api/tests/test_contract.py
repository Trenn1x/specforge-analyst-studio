from __future__ import annotations

from app.main import create_app


def test_openapi_matches_the_frontend_release_contract() -> None:
    schemas = create_app().openapi()["components"]["schemas"]
    expected = {
        "EvidenceItem": {
            "id",
            "label",
            "actual",
            "threshold",
            "source",
            "source_version",
            "commit",
            "observed_at",
            "why_it_matters",
        },
        "ReleaseGate": {
            "id",
            "label",
            "status",
            "result",
            "summary",
            "weight",
            "automated",
            "evidence",
        },
        "AuditEvent": {"id", "actor", "action", "detail", "timestamp", "kind"},
        "ReleaseCandidate": {
            "id",
            "product",
            "version",
            "commit",
            "branch",
            "environment",
            "owner",
            "change_risk",
            "previous_score",
            "last_assessed",
            "gates",
            "audit",
        },
        "ReleaseAssessment": {
            "score",
            "verdict",
            "blocked",
            "warnings",
            "passed",
            "pending",
        },
        "ReleaseSummary": {
            "id",
            "product",
            "version",
            "environment",
            "owner",
            "change_risk",
            "last_assessed",
            "assessment",
        },
        "ReleaseListResponse": {"items", "count"},
        "ReleaseDetailResponse": {"release", "assessment"},
        "EvidenceReceipt": {
            "observed_at",
            "actual",
            "threshold",
            "source_version",
            "label",
            "why_it_matters",
        },
        "AssessmentResponse": {"release", "assessment", "event"},
    }

    for schema_name, fields in expected.items():
        schema = schemas[schema_name]
        assert set(schema["properties"]) == fields
        assert set(schema["required"]) == fields

    gate_update = schemas["GateUpdate"]
    assert set(gate_update["properties"]) == {
        "gate_id",
        "status",
        "result",
        "summary",
        "evidence",
    }
    assert set(gate_update["required"]) == {"gate_id", "status", "result", "evidence"}

    assessment_request = schemas["AssessmentRequest"]
    assert set(assessment_request["properties"]) == {
        "expected_commit",
        "actor",
        "source",
        "gate_updates",
    }
    assert set(assessment_request["required"]) == set(assessment_request["properties"])
