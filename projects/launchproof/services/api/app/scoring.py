"""Pure release-scoring policy shared by API mutations and reads."""

from __future__ import annotations

from collections.abc import Sequence

from app.models import GateStatus, ReleaseAssessment, ReleaseGate, ReleaseVerdict

STATUS_MULTIPLIER: dict[GateStatus, float] = {
    GateStatus.PASSED: 1.0,
    GateStatus.WARNING: 0.68,
    GateStatus.BLOCKED: 0.2,
    GateStatus.PENDING: 0.4,
}


def calculate_score(gates: Sequence[ReleaseGate]) -> int:
    """Calculate a deterministic, normalized weighted score."""

    total_weight = sum(gate.weight for gate in gates)
    if total_weight == 0:
        return 0

    earned = sum(gate.weight * STATUS_MULTIPLIER[gate.status] for gate in gates)
    return round((earned / total_weight) * 100)


def get_verdict(gates: Sequence[ReleaseGate], score: int) -> ReleaseVerdict:
    """Apply the explicit release policy after scoring."""

    has_blocker = any(gate.status is GateStatus.BLOCKED for gate in gates)
    has_pending = any(gate.status is GateStatus.PENDING for gate in gates)

    if has_blocker and score < 78:
        return ReleaseVerdict.HOLD
    if has_blocker or has_pending or score < 92:
        return ReleaseVerdict.CONDITIONAL
    return ReleaseVerdict.READY


def assess(gates: Sequence[ReleaseGate]) -> ReleaseAssessment:
    score = calculate_score(gates)
    return ReleaseAssessment(
        score=score,
        verdict=get_verdict(gates, score),
        blocked=sum(gate.status is GateStatus.BLOCKED for gate in gates),
        warnings=sum(gate.status is GateStatus.WARNING for gate in gates),
        passed=sum(gate.status is GateStatus.PASSED for gate in gates),
        pending=sum(gate.status is GateStatus.PENDING for gate in gates),
    )
