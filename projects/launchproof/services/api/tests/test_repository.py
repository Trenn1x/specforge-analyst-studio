from __future__ import annotations

from datetime import datetime, timedelta

import pytest

from app.models import (
    AssessmentRequest,
    DecisionRequest,
    EvidenceReceipt,
    GateStatus,
    GateUpdate,
    ReviewDecision,
    ReviewerRole,
)
from app.repository import (
    ApprovalRoleRequired,
    CommitConflict,
    IdempotencyConflict,
    InMemoryReleaseRepository,
    InvalidMutation,
    ReleaseNotFound,
)
from app.seed import seed_releases

NOW = datetime.fromisoformat("2026-09-04T12:00:00+00:00")
ATLAS_COMMIT = "8f3c9bd"
NIMBUS_COMMIT = "64ad20e"
NIMBUS_TIME = datetime.fromisoformat("2026-09-03T16:20:00+00:00")


def _receipt(observed_at: datetime = NOW) -> EvidenceReceipt:
    return EvidenceReceipt(
        observed_at=observed_at,
        actual="430 of 430 passed without retry",
        threshold="100% pass without retry",
        source_version="run-2042",
        label="Integration test result",
        why_it_matters="Deterministic tests are a trustworthy release signal.",
    )


def _update(
    *,
    gate_id: str = "tests",
    status: GateStatus = GateStatus.PASSED,
    result: str = "430 / 430 clean",
    observed_at: datetime = NOW,
) -> GateUpdate:
    return GateUpdate(
        gate_id=gate_id,
        status=status,
        result=result,
        evidence=_receipt(observed_at),
    )


def _assessment(
    result: str = "430 / 430 clean",
    *,
    expected_commit: str = ATLAS_COMMIT,
    observed_at: datetime = NOW,
) -> AssessmentRequest:
    return AssessmentRequest(
        expected_commit=expected_commit,
        actor="GitHub Actions",
        source="ci/run-2042",
        gate_updates=[_update(result=result, observed_at=observed_at)],
    )


def _decision(
    *,
    expected_commit: str = ATLAS_COMMIT,
    role: ReviewerRole = ReviewerRole.SECURITY,
    decision: ReviewDecision = ReviewDecision.APPROVE,
) -> DecisionRequest:
    return DecisionRequest(
        expected_commit=expected_commit,
        reviewer="M. Chen",
        role=role,
        decision=decision,
        note="Threat-model delta reviewed; no release-blocking findings.",
    )


def test_repository_reads_are_defensive_copies() -> None:
    repository = InMemoryReleaseRepository(seed_releases())
    first = repository.get_release("atlas-270")
    first.release.product = "mutated outside repository"

    second = repository.get_release("atlas-270")

    assert second.release.product == "Atlas"


def test_list_and_detail_apply_evidence_freshness_without_hiding_blockers() -> None:
    repository = InMemoryReleaseRepository(
        seed_releases(), now=lambda: NIMBUS_TIME + timedelta(hours=25)
    )

    nimbus = repository.get_release("nimbus-194")
    listed_nimbus = next(
        item for item in repository.list_releases().items if item.id == "nimbus-194"
    )
    relay = repository.get_release("relay-420")

    assert all(gate.status is GateStatus.PENDING for gate in nimbus.release.gates)
    assert nimbus.assessment.verdict.value == "Conditional"
    assert listed_nimbus.assessment == nimbus.assessment
    relay_blockers = [
        gate
        for gate in relay.release.gates
        if gate.id in {"tests", "ai-eval", "approval"}
    ]
    assert all(gate.status is GateStatus.BLOCKED for gate in relay_blockers)
    assert all(gate.result == "Action required" for gate in relay_blockers)


def test_idempotent_mutation_is_atomic_and_replayed() -> None:
    repository = InMemoryReleaseRepository(seed_releases(), now=lambda: NOW)

    first, first_replayed = repository.record_assessment(
        "atlas-270", _assessment(), "assessment-2042"
    )
    second, second_replayed = repository.record_assessment(
        "atlas-270", _assessment(), "assessment-2042"
    )

    assert first_replayed is False
    assert second_replayed is True
    assert second == first
    assert repository.get_release("atlas-270").release.audit.count(first.event) == 1


def test_assessment_appends_normalized_evidence_bound_to_source_and_commit() -> None:
    repository = InMemoryReleaseRepository(seed_releases(), now=lambda: NOW)
    before = repository.get_release("atlas-270").release
    previous_gate = next(gate for gate in before.gates if gate.id == "tests")

    response, _ = repository.record_assessment(
        "atlas-270", _assessment(), "normalized-evidence-2042"
    )

    gate = next(gate for gate in response.release.gates if gate.id == "tests")
    receipt = gate.evidence[-1]
    assert len(gate.evidence) == len(previous_gate.evidence) + 1
    assert receipt.source == "ci/run-2042"
    assert receipt.source_version == "run-2042"
    assert receipt.commit == ATLAS_COMMIT
    assert receipt.observed_at == NOW
    assert receipt.actual == "430 of 430 passed without retry"


def test_stale_non_blocking_evidence_becomes_pending() -> None:
    repository = InMemoryReleaseRepository(seed_releases(), now=lambda: NOW)
    stale = NOW - timedelta(hours=24, seconds=1)

    response, _ = repository.record_assessment(
        "atlas-270",
        _assessment(observed_at=stale),
        "stale-assessment-2042",
    )

    gate = next(gate for gate in response.release.gates if gate.id == "tests")
    assert gate.status is GateStatus.PENDING
    assert gate.result == "Evidence expired; refresh required"
    assert gate.evidence[-1].observed_at == stale
    assert "Stale evidence left tests pending" in response.event.detail


def test_stale_blocking_evidence_remains_blocking() -> None:
    repository = InMemoryReleaseRepository(seed_releases(), now=lambda: NOW)
    payload = AssessmentRequest(
        expected_commit=ATLAS_COMMIT,
        actor="GitHub Actions",
        source="ci/run-2042",
        gate_updates=[
            _update(
                status=GateStatus.BLOCKED,
                result="2 failures",
                observed_at=NOW - timedelta(days=2),
            )
        ],
    )

    response, _ = repository.record_assessment(
        "atlas-270", payload, "stale-blocker-2042"
    )

    gate = next(gate for gate in response.release.gates if gate.id == "tests")
    assert gate.status is GateStatus.BLOCKED
    assert gate.result == "2 failures"


def test_materially_future_evidence_is_rejected() -> None:
    repository = InMemoryReleaseRepository(seed_releases(), now=lambda: NOW)

    with pytest.raises(InvalidMutation, match="more than five minutes in the future"):
        repository.record_assessment(
            "atlas-270",
            _assessment(observed_at=NOW + timedelta(minutes=6)),
            "future-evidence-2042",
        )


def test_evidence_timestamp_must_include_timezone() -> None:
    with pytest.raises(ValueError, match="observed_at must include a timezone"):
        _receipt(datetime(2026, 9, 4, 12, 0, 0))


def test_automated_update_invalidates_prior_human_approval() -> None:
    repository = InMemoryReleaseRepository(seed_releases(), now=lambda: NOW)

    response, _ = repository.record_assessment(
        "nimbus-194",
        _assessment(expected_commit=NIMBUS_COMMIT),
        "nimbus-reassessment-194",
    )

    approval = next(gate for gate in response.release.gates if gate.id == "approval")
    assert approval.status is GateStatus.PENDING
    assert approval.result == "Re-approval required"
    assert "prior human approval was invalidated" in response.event.detail
    assert response.assessment.verdict.value == "Conditional"


def test_reused_key_with_different_payload_conflicts() -> None:
    repository = InMemoryReleaseRepository(seed_releases(), now=lambda: NOW)
    repository.record_assessment("atlas-270", _assessment(), "assessment-2042")

    with pytest.raises(IdempotencyConflict):
        repository.record_assessment(
            "atlas-270", _assessment("Changed result"), "assessment-2042"
        )


def test_expected_commit_prevents_stale_mutations() -> None:
    repository = InMemoryReleaseRepository(seed_releases(), now=lambda: NOW)

    with pytest.raises(CommitConflict, match="release is at 8f3c9bd"):
        repository.record_assessment(
            "atlas-270",
            _assessment(expected_commit="abcdef0"),
            "stale-client-assessment",
        )

    with pytest.raises(CommitConflict):
        repository.record_decision(
            "atlas-270",
            _decision(expected_commit="abcdef0"),
            "stale-client-decision",
        )


def test_idempotency_store_is_bounded() -> None:
    repository = InMemoryReleaseRepository(
        seed_releases(), now=lambda: NOW, idempotency_capacity=1
    )
    repository.record_assessment("atlas-270", _assessment(), "assessment-one")
    repository.record_assessment("atlas-270", _assessment(), "assessment-two")

    _, replayed = repository.record_assessment(
        "atlas-270", _assessment(), "assessment-one"
    )

    assert replayed is False


def test_manual_gate_rejects_automated_updates() -> None:
    repository = InMemoryReleaseRepository(seed_releases(), now=lambda: NOW)
    payload = AssessmentRequest(
        expected_commit=ATLAS_COMMIT,
        actor="untrusted bot",
        source="ci",
        gate_updates=[
            _update(gate_id="approval", status=GateStatus.PASSED, result="self-approved")
        ],
    )

    with pytest.raises(InvalidMutation, match="requires a human decision"):
        repository.record_assessment("atlas-270", payload, "manual-bypass-key")


def test_unknown_release_and_gate_have_clear_errors() -> None:
    repository = InMemoryReleaseRepository(seed_releases(), now=lambda: NOW)
    with pytest.raises(ReleaseNotFound):
        repository.get_release("does-not-exist")

    payload = AssessmentRequest(
        expected_commit=ATLAS_COMMIT,
        actor="GitHub Actions",
        source="ci",
        gate_updates=[_update(gate_id="unknown", result="green")],
    )
    with pytest.raises(InvalidMutation, match="Unknown gate"):
        repository.record_assessment("atlas-270", payload, "unknown-gate-key")


def test_human_decision_records_evidence_and_audit() -> None:
    repository = InMemoryReleaseRepository(seed_releases(), now=lambda: NOW)

    response, replayed = repository.record_decision(
        "atlas-270", _decision(), "security-approval-270"
    )

    approval = next(gate for gate in response.release.gates if gate.id == "approval")
    assert replayed is False
    assert approval.status is GateStatus.PASSED
    assert approval.evidence[-1].source == "LaunchProof decision API"
    assert approval.evidence[-1].commit == ATLAS_COMMIT
    assert response.event.kind.value == "human"
    assert response.event.action == "Approved security gate"
    assert response.assessment.verdict.value == "Ready"


def test_decision_expires_untouched_evidence_before_approval() -> None:
    decision_time = NIMBUS_TIME + timedelta(hours=25)
    repository = InMemoryReleaseRepository(seed_releases(), now=lambda: decision_time)

    response, _ = repository.record_decision(
        "nimbus-194",
        _decision(expected_commit=NIMBUS_COMMIT),
        "security-reapproval-nimbus",
    )

    approval = next(gate for gate in response.release.gates if gate.id == "approval")
    automated = [gate for gate in response.release.gates if gate.automated]
    assert approval.status is GateStatus.PASSED
    assert all(gate.status is GateStatus.PENDING for gate in automated)
    assert response.assessment.pending == 6
    assert response.assessment.verdict.value == "Conditional"


def test_only_security_role_can_approve_security_gate() -> None:
    repository = InMemoryReleaseRepository(seed_releases(), now=lambda: NOW)

    with pytest.raises(ApprovalRoleRequired):
        repository.record_decision(
            "atlas-270",
            _decision(role=ReviewerRole.QA),
            "qa-cannot-approve-security",
        )

    approval = next(
        gate
        for gate in repository.get_release("atlas-270").release.gates
        if gate.id == "approval"
    )
    assert approval.status is GateStatus.BLOCKED


def test_any_role_may_request_changes() -> None:
    repository = InMemoryReleaseRepository(seed_releases(), now=lambda: NOW)
    payload = DecisionRequest(
        expected_commit=NIMBUS_COMMIT,
        reviewer="Priya R.",
        role=ReviewerRole.QA,
        decision=ReviewDecision.REQUEST_CHANGES,
        note="Rollback evidence needs another pass.",
    )

    response, _ = repository.record_decision("nimbus-194", payload, "qa-review-nimbus")

    approval = next(gate for gate in response.release.gates if gate.id == "approval")
    assert approval.status is GateStatus.BLOCKED
    assert response.assessment.verdict.value == "Conditional"


def test_nimbus_passed_seed_evidence_is_internally_consistent() -> None:
    nimbus = next(release for release in seed_releases() if release.id == "nimbus-194")
    tests_gate = next(gate for gate in nimbus.gates if gate.id == "tests")
    approval = next(gate for gate in nimbus.gates if gate.id == "approval")

    assert tests_gate.status is GateStatus.PASSED
    assert tests_gate.result == "430 / 430 clean"
    assert tests_gate.evidence[-1].actual == "430 of 430 passed without retry"
    assert "without retries" in tests_gate.summary
    assert approval.status is GateStatus.PASSED
    assert approval.result == "QA + security approved"
    assert approval.summary == "QA approved by Priya R.; security approved by S. Park."
    assert approval.evidence[-1].actual == approval.summary
    assert all(
        evidence.commit == NIMBUS_COMMIT
        for gate in nimbus.gates
        for evidence in gate.evidence
    )
