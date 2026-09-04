"""Validated API models for release evidence and decisions."""

from __future__ import annotations

from datetime import UTC, datetime
from enum import StrEnum
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

COMMIT_PATTERN = r"^[0-9a-f]{7,64}$"


def _normalized_utc(value: datetime) -> datetime:
    if value.tzinfo is None or value.utcoffset() is None:
        raise ValueError("observed_at must include a timezone")
    return value.astimezone(UTC)


class StrictModel(BaseModel):
    """Reject unknown fields so clients cannot silently misspell policy inputs."""

    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)


class GateStatus(StrEnum):
    PASSED = "passed"
    WARNING = "warning"
    BLOCKED = "blocked"
    PENDING = "pending"


class ReleaseVerdict(StrEnum):
    READY = "Ready"
    CONDITIONAL = "Conditional"
    HOLD = "Hold"


class AuditKind(StrEnum):
    AUTOMATION = "automation"
    HUMAN = "human"
    SYSTEM = "system"


class ChangeRisk(StrEnum):
    LOW = "Low"
    MEDIUM = "Medium"
    HIGH = "High"


class ReviewDecision(StrEnum):
    APPROVE = "approve"
    REQUEST_CHANGES = "request_changes"


class ReviewerRole(StrEnum):
    QA = "qa"
    SECURITY = "security"
    RELEASE_MANAGER = "release-manager"


class EvidenceItem(StrictModel):
    id: str = Field(min_length=1, max_length=80)
    label: str = Field(min_length=1, max_length=120)
    actual: str = Field(min_length=1, max_length=500)
    threshold: str = Field(min_length=1, max_length=500)
    source: str = Field(min_length=1, max_length=160)
    source_version: str = Field(min_length=1, max_length=120)
    commit: str = Field(pattern=COMMIT_PATTERN)
    observed_at: datetime
    why_it_matters: str = Field(min_length=1, max_length=800)

    _normalize_observed_at = field_validator("observed_at")(_normalized_utc)


class ReleaseGate(StrictModel):
    id: str = Field(min_length=1, max_length=80, pattern=r"^[a-z0-9][a-z0-9-]*$")
    label: str = Field(min_length=1, max_length=120)
    status: GateStatus
    result: str = Field(min_length=1, max_length=500)
    summary: str = Field(min_length=1, max_length=800)
    weight: int = Field(ge=1, le=100)
    automated: bool
    evidence: list[EvidenceItem] = Field(max_length=50)


class AuditEvent(StrictModel):
    id: str = Field(min_length=1, max_length=120)
    actor: str = Field(min_length=1, max_length=120)
    action: str = Field(min_length=1, max_length=160)
    detail: str = Field(min_length=1, max_length=1000)
    timestamp: datetime
    kind: AuditKind


class ReleaseCandidate(StrictModel):
    id: str = Field(min_length=1, max_length=80, pattern=r"^[a-z0-9][a-z0-9-]*$")
    product: str = Field(min_length=1, max_length=120)
    version: str = Field(min_length=1, max_length=80)
    commit: str = Field(pattern=COMMIT_PATTERN)
    branch: str = Field(min_length=1, max_length=200)
    environment: str = Field(min_length=1, max_length=80)
    owner: str = Field(min_length=1, max_length=120)
    change_risk: ChangeRisk
    previous_score: int = Field(ge=0, le=100)
    last_assessed: datetime
    gates: list[ReleaseGate] = Field(min_length=1, max_length=50)
    audit: list[AuditEvent] = Field(max_length=500)

    @model_validator(mode="after")
    def gate_ids_are_unique(self) -> ReleaseCandidate:
        gate_ids = [gate.id for gate in self.gates]
        if len(gate_ids) != len(set(gate_ids)):
            raise ValueError("gate ids must be unique")
        return self


class ReleaseAssessment(StrictModel):
    score: int = Field(ge=0, le=100)
    verdict: ReleaseVerdict
    blocked: int = Field(ge=0)
    warnings: int = Field(ge=0)
    passed: int = Field(ge=0)
    pending: int = Field(ge=0)


class ReleaseSummary(StrictModel):
    id: str
    product: str
    version: str
    environment: str
    owner: str
    change_risk: ChangeRisk
    last_assessed: datetime
    assessment: ReleaseAssessment


class ReleaseListResponse(StrictModel):
    items: list[ReleaseSummary]
    count: int = Field(ge=0)


class ReleaseDetailResponse(StrictModel):
    release: ReleaseCandidate
    assessment: ReleaseAssessment


class EvidenceReceipt(StrictModel):
    observed_at: datetime
    actual: str = Field(min_length=1, max_length=500)
    threshold: str = Field(min_length=1, max_length=500)
    source_version: str = Field(min_length=1, max_length=120)
    label: str = Field(min_length=1, max_length=120)
    why_it_matters: str = Field(min_length=1, max_length=800)

    _normalize_observed_at = field_validator("observed_at")(_normalized_utc)


class GateUpdate(StrictModel):
    gate_id: str = Field(min_length=1, max_length=80, pattern=r"^[a-z0-9][a-z0-9-]*$")
    status: GateStatus
    result: str = Field(min_length=1, max_length=500)
    summary: str | None = Field(default=None, min_length=1, max_length=800)
    evidence: EvidenceReceipt


class AssessmentRequest(StrictModel):
    expected_commit: str = Field(pattern=COMMIT_PATTERN)
    actor: str = Field(min_length=2, max_length=120)
    source: str = Field(min_length=2, max_length=160)
    gate_updates: list[GateUpdate] = Field(min_length=1, max_length=20)

    @model_validator(mode="after")
    def updated_gate_ids_are_unique(self) -> AssessmentRequest:
        gate_ids = [update.gate_id for update in self.gate_updates]
        if len(gate_ids) != len(set(gate_ids)):
            raise ValueError("gate_updates cannot contain duplicate gate ids")
        return self


class AssessmentResponse(StrictModel):
    release: ReleaseCandidate
    assessment: ReleaseAssessment
    event: AuditEvent


class DecisionRequest(StrictModel):
    expected_commit: str = Field(pattern=COMMIT_PATTERN)
    reviewer: str = Field(min_length=2, max_length=120)
    role: ReviewerRole
    decision: ReviewDecision
    note: str = Field(min_length=4, max_length=1000)


class DecisionResponse(StrictModel):
    release: ReleaseCandidate
    assessment: ReleaseAssessment
    event: AuditEvent


class AuditResponse(StrictModel):
    items: list[AuditEvent]
    count: int = Field(ge=0)


class HealthResponse(StrictModel):
    status: Literal["ok"]
    service: Literal["launchproof-api"]
    version: str


class ReadinessResponse(HealthResponse):
    release_count: int = Field(ge=0)


class ErrorIssue(StrictModel):
    field: str
    message: str
    type: str


class ErrorBody(StrictModel):
    code: str
    message: str
    issues: list[ErrorIssue] | None = None


class ErrorResponse(StrictModel):
    error: ErrorBody
    request_id: str
