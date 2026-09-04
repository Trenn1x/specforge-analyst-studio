"""Small, deterministic data set used by the local API demonstration."""

from __future__ import annotations

from datetime import datetime

from app.models import (
    AuditEvent,
    AuditKind,
    ChangeRisk,
    EvidenceItem,
    GateStatus,
    ReleaseCandidate,
    ReleaseGate,
)

SEED_TIME = datetime.fromisoformat("2026-09-03T18:42:00+00:00")


def _evidence(
    gate_id: str,
    actual: str,
    threshold: str,
    source: str,
    why_it_matters: str,
    commit: str,
    observed_at: datetime,
) -> EvidenceItem:
    return EvidenceItem(
        id=f"{gate_id}-seed-evidence",
        label=f"{gate_id.replace('-', ' ').title()} result",
        actual=actual,
        threshold=threshold,
        source=source,
        source_version="seed-v1",
        commit=commit,
        observed_at=observed_at,
        why_it_matters=why_it_matters,
    )


def _base_gates(commit: str, observed_at: datetime) -> list[ReleaseGate]:
    return [
        ReleaseGate(
            id="build",
            label="Build",
            status=GateStatus.PASSED,
            result="2m 43s",
            summary="A clean runner produced a reproducible release artifact.",
            weight=12,
            automated=True,
            evidence=[
                _evidence(
                    "build",
                    "Completed in 2m 43s; digest recorded",
                    "Under 5 minutes with an immutable digest",
                    "GitHub Actions run 1842",
                    "The reviewed artifact must be the artifact that is deployed.",
                    commit,
                    observed_at,
                )
            ],
        ),
        ReleaseGate(
            id="tests",
            label="Automated tests",
            status=GateStatus.WARNING,
            result="428 / 430 clean",
            summary="Two integration tests needed a retry and have an owner.",
            weight=18,
            automated=True,
            evidence=[
                _evidence(
                    "tests",
                    "428 passed; 2 passed on retry",
                    "100% pass without retry",
                    "Vitest and API integration suite",
                    "A flaky green build is weaker evidence than a deterministic one.",
                    commit,
                    observed_at,
                )
            ],
        ),
        ReleaseGate(
            id="security",
            label="Security",
            status=GateStatus.PASSED,
            result="0 critical / high",
            summary="Dependency and secret scans found no release blocker.",
            weight=18,
            automated=True,
            evidence=[
                _evidence(
                    "security",
                    "0 critical; 0 high; no verified secrets",
                    "No critical or high findings; zero verified secrets",
                    "OSV Scanner and Gitleaks",
                    "Known exposure and leaked credentials are hard release stops.",
                    commit,
                    observed_at,
                )
            ],
        ),
        ReleaseGate(
            id="performance",
            label="Performance",
            status=GateStatus.PASSED,
            result="p95 184ms",
            summary="Latency remained inside the agreed performance budget.",
            weight=12,
            automated=True,
            evidence=[
                _evidence(
                    "performance",
                    "p95 184ms",
                    "p95 below 220ms",
                    "k6 smoke test",
                    "Percentile budgets expose slow experiences hidden by averages.",
                    commit,
                    observed_at,
                )
            ],
        ),
        ReleaseGate(
            id="accessibility",
            label="Accessibility",
            status=GateStatus.PASSED,
            result="98 / 100",
            summary="Automated keyboard, contrast, and landmark checks passed.",
            weight=10,
            automated=True,
            evidence=[
                _evidence(
                    "accessibility",
                    "98 / 100",
                    "At least 95",
                    "Lighthouse CI",
                    "Repeatable checks prevent common access barriers from shipping.",
                    commit,
                    observed_at,
                )
            ],
        ),
        ReleaseGate(
            id="ai-eval",
            label="AI evaluation",
            status=GateStatus.PASSED,
            result="93% / 120 cases",
            summary="Quality, refusal, and injection-resistance thresholds passed.",
            weight=18,
            automated=True,
            evidence=[
                _evidence(
                    "ai-eval",
                    "112 of 120 accepted; 24 of 24 injections resisted",
                    "At least 90% quality; 100% injection resistance",
                    "Versioned evaluation set v4",
                    "Stable fixtures turn model quality into an inspectable release criterion.",
                    commit,
                    observed_at,
                )
            ],
        ),
        ReleaseGate(
            id="approval",
            label="Human approval",
            status=GateStatus.BLOCKED,
            result="Security pending",
            summary="QA approved; an accountable security reviewer is still required.",
            weight=12,
            automated=False,
            evidence=[
                _evidence(
                    "approval",
                    "QA approved; security pending",
                    "QA and security approval",
                    "Protected environment",
                    "Automation assembles evidence; accountable people own the decision.",
                    commit,
                    observed_at,
                )
            ],
        ),
    ]


def seed_releases() -> list[ReleaseCandidate]:
    nimbus_time = datetime.fromisoformat("2026-09-03T16:20:00+00:00")
    relay_time = datetime.fromisoformat("2026-09-03T14:05:00+00:00")
    atlas_gates = _base_gates("8f3c9bd", SEED_TIME)
    nimbus_gates = [
        gate.model_copy(
            deep=True,
            update={
                "status": GateStatus.PASSED,
                "result": (
                    "430 / 430 clean"
                    if gate.id == "tests"
                    else "QA + security approved"
                    if gate.id == "approval"
                    else gate.result
                ),
                "summary": (
                    "The full suite passed without retries."
                    if gate.id == "tests"
                    else "QA approved by Priya R.; security approved by S. Park."
                    if gate.id == "approval"
                    else gate.summary
                ),
                "evidence": [
                    evidence.model_copy(
                        update={
                            "actual": (
                                "430 of 430 passed without retry"
                                if gate.id == "tests"
                                else "QA approved by Priya R.; security approved by S. Park."
                                if gate.id == "approval"
                                else evidence.actual
                            ),
                            "source": (
                                "Protected environment"
                                if gate.id == "approval"
                                else evidence.source
                            ),
                            "source_version": (
                                "approval-record-v1"
                                if gate.id == "approval"
                                else "nimbus-run-194"
                            ),
                        }
                    )
                    for evidence in gate.evidence
                ],
            },
        )
        for gate in _base_gates("64ad20e", nimbus_time)
    ]
    relay_gates = [
        gate.model_copy(
            deep=True,
            update={
                "status": (
                    GateStatus.BLOCKED
                    if gate.id in {"tests", "ai-eval", "approval"}
                    else gate.status
                ),
                "result": (
                    "Action required"
                    if gate.id in {"tests", "ai-eval", "approval"}
                    else gate.result
                ),
            },
        )
        for gate in _base_gates("09d1ae7", relay_time)
    ]

    return [
        ReleaseCandidate(
            id="atlas-270",
            product="Atlas",
            version="v2.7.0",
            commit="8f3c9bd",
            branch="release/2.7.0",
            environment="staging",
            owner="Nora Shah",
            change_risk=ChangeRisk.MEDIUM,
            previous_score=91,
            last_assessed=SEED_TIME,
            gates=atlas_gates,
            audit=[
                AuditEvent(
                    id="atlas-assessed",
                    actor="LaunchProof",
                    action="Completed assessment",
                    detail="Seven release gates evaluated against policy v3.2.",
                    timestamp=SEED_TIME,
                    kind=AuditKind.AUTOMATION,
                )
            ],
        ),
        ReleaseCandidate(
            id="nimbus-194",
            product="Nimbus",
            version="v1.9.4",
            commit="64ad20e",
            branch="release/1.9.4",
            environment="production",
            owner="Eli Mason",
            change_risk=ChangeRisk.LOW,
            previous_score=94,
            last_assessed=nimbus_time,
            gates=nimbus_gates,
            audit=[
                AuditEvent(
                    id="nimbus-ready",
                    actor="S. Park",
                    action="Approved security gate",
                    detail=(
                        "QA approval was present; threat-model delta reviewed with no blocker."
                    ),
                    timestamp=nimbus_time,
                    kind=AuditKind.HUMAN,
                )
            ],
        ),
        ReleaseCandidate(
            id="relay-420",
            product="Relay",
            version="v4.2.0",
            commit="09d1ae7",
            branch="release/4.2.0",
            environment="staging",
            owner="Cam Brooks",
            change_risk=ChangeRisk.HIGH,
            previous_score=83,
            last_assessed=relay_time,
            gates=relay_gates,
            audit=[
                AuditEvent(
                    id="relay-blocked",
                    actor="LaunchProof",
                    action="Blocked release",
                    detail="Regression and AI-evaluation thresholds were not met.",
                    timestamp=relay_time,
                    kind=AuditKind.AUTOMATION,
                )
            ],
        ),
    ]
