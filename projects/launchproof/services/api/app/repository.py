"""Thread-safe demo repository with idempotent release mutations."""

from __future__ import annotations

import hashlib
import json
from collections import OrderedDict
from collections.abc import Callable, Iterable
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from threading import RLock
from typing import TypeVar
from uuid import uuid4

from pydantic import BaseModel

from app.models import (
    AssessmentRequest,
    AssessmentResponse,
    AuditEvent,
    AuditKind,
    DecisionRequest,
    DecisionResponse,
    EvidenceItem,
    GateStatus,
    ReleaseCandidate,
    ReleaseDetailResponse,
    ReleaseListResponse,
    ReleaseSummary,
    ReviewDecision,
    ReviewerRole,
)
from app.scoring import assess


class RepositoryError(Exception):
    status_code = 500
    code = "repository_error"
    message = "The release repository could not complete the request."


class ReleaseNotFound(RepositoryError):
    status_code = 404
    code = "release_not_found"
    message = "The requested release does not exist."


class InvalidMutation(RepositoryError):
    status_code = 400
    code = "invalid_mutation"

    def __init__(self, message: str) -> None:
        self.message = message
        super().__init__(message)


class IdempotencyConflict(RepositoryError):
    status_code = 409
    code = "idempotency_conflict"
    message = "That idempotency key was already used with a different request."


class CommitConflict(RepositoryError):
    status_code = 409
    code = "commit_conflict"

    def __init__(self, expected: str, current: str) -> None:
        self.message = f"Expected commit {expected}, but the release is at {current}."
        super().__init__(self.message)


class ApprovalRoleRequired(RepositoryError):
    status_code = 403
    code = "approval_role_required"
    message = "Only a security reviewer may approve the security gate."


MutationResponse = TypeVar("MutationResponse", bound=BaseModel)

EVIDENCE_MAX_AGE = timedelta(hours=24)
MAX_FUTURE_CLOCK_SKEW = timedelta(minutes=5)


@dataclass(frozen=True)
class StoredMutation:
    fingerprint: str
    response: BaseModel


def _utc_now() -> datetime:
    return datetime.now(UTC)


class InMemoryReleaseRepository:
    """A bounded, process-local repository suitable for the demo and tests.

    The interface intentionally isolates storage concerns so a Firestore adapter can
    replace this implementation without changing endpoint or policy code.
    """

    def __init__(
        self,
        releases: Iterable[ReleaseCandidate],
        *,
        now: Callable[[], datetime] = _utc_now,
        idempotency_capacity: int = 1_000,
    ) -> None:
        self._lock = RLock()
        self._now = now
        self._releases = {release.id: release.model_copy(deep=True) for release in releases}
        self._idempotency: OrderedDict[tuple[str, str], StoredMutation] = OrderedDict()
        self._idempotency_capacity = idempotency_capacity

    @property
    def release_count(self) -> int:
        with self._lock:
            return len(self._releases)

    def list_releases(self) -> ReleaseListResponse:
        with self._lock:
            now = self._now().astimezone(UTC)
            releases = sorted(
                self._releases.values(), key=lambda item: item.last_assessed, reverse=True
            )
            items: list[ReleaseSummary] = []
            for release in releases:
                current = self._with_current_freshness(release, now)
                items.append(
                    ReleaseSummary(
                        id=current.id,
                        product=current.product,
                        version=current.version,
                        environment=current.environment,
                        owner=current.owner,
                        change_risk=current.change_risk,
                        last_assessed=current.last_assessed,
                        assessment=assess(current.gates),
                    )
                )
            return ReleaseListResponse(items=items, count=len(items))

    def get_release(self, release_id: str) -> ReleaseDetailResponse:
        with self._lock:
            release = self._with_current_freshness(
                self._get_or_raise(release_id), self._now().astimezone(UTC)
            )
            return ReleaseDetailResponse(
                release=release.model_copy(deep=True), assessment=assess(release.gates)
            )

    def get_audit(self, release_id: str) -> list[AuditEvent]:
        with self._lock:
            release = self._get_or_raise(release_id)
            return [event.model_copy(deep=True) for event in release.audit]

    def record_assessment(
        self,
        release_id: str,
        request: AssessmentRequest,
        idempotency_key: str,
    ) -> tuple[AssessmentResponse, bool]:
        scope = f"assessment:{release_id}"
        payload = request.model_dump(mode="json")

        def mutate() -> AssessmentResponse:
            now = self._now().astimezone(UTC)
            current = self._with_current_freshness(self._get_or_raise(release_id), now)
            self._require_expected_commit(current, request.expected_commit)
            gates_by_id = {gate.id: gate for gate in current.gates}
            stale_gate_ids: list[str] = []

            for update in request.gate_updates:
                gate = gates_by_id.get(update.gate_id)
                if gate is None:
                    raise InvalidMutation(f"Unknown gate: {update.gate_id}")
                if not gate.automated:
                    raise InvalidMutation(
                        f"Gate '{gate.id}' requires a human decision and cannot be automated."
                    )

                observed_at = update.evidence.observed_at
                if observed_at > now + MAX_FUTURE_CLOCK_SKEW:
                    raise InvalidMutation(
                        f"Evidence for '{gate.id}' is more than five minutes in the future."
                    )
                is_stale = now - observed_at > EVIDENCE_MAX_AGE
                stale_non_blocking = is_stale and update.status is not GateStatus.BLOCKED
                effective_status = (
                    GateStatus.PENDING
                    if stale_non_blocking
                    else update.status
                )
                if stale_non_blocking:
                    stale_gate_ids.append(gate.id)

                evidence = EvidenceItem(
                    id=f"evidence-{uuid4().hex}",
                    label=update.evidence.label,
                    actual=update.evidence.actual,
                    threshold=update.evidence.threshold,
                    source=request.source,
                    source_version=update.evidence.source_version,
                    commit=current.commit,
                    observed_at=observed_at,
                    why_it_matters=update.evidence.why_it_matters,
                )
                changes: dict[str, object] = {
                    "status": effective_status,
                    "result": (
                        "Evidence expired; refresh required"
                        if stale_non_blocking
                        else update.result
                    ),
                    "evidence": [*gate.evidence[-49:], evidence],
                }
                if stale_non_blocking:
                    changes["summary"] = (
                        "The newest receipt is more than 24 hours old, so this gate is pending."
                    )
                elif update.summary is not None:
                    changes["summary"] = update.summary
                gates_by_id[gate.id] = gate.model_copy(deep=True, update=changes)

            approval_invalidated = False
            approval = gates_by_id.get("approval")
            if approval is not None and approval.status is GateStatus.PASSED:
                gates_by_id[approval.id] = approval.model_copy(
                    deep=True,
                    update={
                        "status": GateStatus.PENDING,
                        "result": "Re-approval required",
                        "summary": (
                            "Automated evidence changed after approval; security must review again."
                        ),
                    },
                )
                approval_invalidated = True

            updated_ids = [update.gate_id for update in request.gate_updates]
            detail_parts = [f"Updated {', '.join(updated_ids)} from {request.source}."]
            if stale_gate_ids:
                detail_parts.append(f"Stale evidence left {', '.join(stale_gate_ids)} pending.")
            if approval_invalidated:
                detail_parts.append("The prior human approval was invalidated.")
            event = AuditEvent(
                id=f"evt-{uuid4().hex}",
                actor=request.actor,
                action="Recorded automated assessment",
                detail=" ".join(detail_parts),
                timestamp=now,
                kind=AuditKind.AUTOMATION,
            )
            updated = current.model_copy(
                deep=True,
                update={
                    "previous_score": assess(current.gates).score,
                    "last_assessed": now,
                    "gates": [gates_by_id[gate.id] for gate in current.gates],
                    "audit": [event, *current.audit][:500],
                },
            )
            self._releases[release_id] = updated
            return AssessmentResponse(
                release=updated.model_copy(deep=True),
                assessment=assess(updated.gates),
                event=event,
            )

        response, replayed = self._execute_idempotent(scope, idempotency_key, payload, mutate)
        return AssessmentResponse.model_validate(response), replayed

    def record_decision(
        self,
        release_id: str,
        request: DecisionRequest,
        idempotency_key: str,
    ) -> tuple[DecisionResponse, bool]:
        scope = f"decision:{release_id}"
        payload = request.model_dump(mode="json")

        def mutate() -> DecisionResponse:
            now = self._now().astimezone(UTC)
            current = self._with_current_freshness(self._get_or_raise(release_id), now)
            self._require_expected_commit(current, request.expected_commit)
            approval = next((gate for gate in current.gates if gate.id == "approval"), None)
            if approval is None:
                raise InvalidMutation("This release has no human-approval gate.")

            approved = request.decision is ReviewDecision.APPROVE
            if approved and request.role is not ReviewerRole.SECURITY:
                raise ApprovalRoleRequired
            status = GateStatus.PASSED if approved else GateStatus.BLOCKED
            action = "Approved security gate" if approved else "Requested changes"
            result = (
                f"Approved by {request.reviewer} ({request.role.value})"
                if approved
                else f"Changes requested by {request.reviewer}"
            )
            decision_evidence = EvidenceItem(
                id=f"decision-{uuid4().hex}",
                label="Human release decision",
                actual=result,
                threshold="Named, accountable reviewer decision",
                source="LaunchProof decision API",
                source_version="v1",
                commit=current.commit,
                observed_at=now,
                why_it_matters="Automation informs the decision; a human remains accountable.",
            )
            updated_approval = approval.model_copy(
                deep=True,
                update={
                    "status": status,
                    "result": result,
                    "summary": request.note,
                    "evidence": [*approval.evidence[-49:], decision_evidence],
                },
            )
            event = AuditEvent(
                id=f"evt-{uuid4().hex}",
                actor=request.reviewer,
                action=action,
                detail=f"{request.role.value}: {request.note}",
                timestamp=now,
                kind=AuditKind.HUMAN,
            )
            updated_gates = [
                updated_approval if gate.id == approval.id else gate for gate in current.gates
            ]
            updated = current.model_copy(
                deep=True,
                update={
                    "previous_score": assess(current.gates).score,
                    "last_assessed": now,
                    "gates": updated_gates,
                    "audit": [event, *current.audit][:500],
                },
            )
            self._releases[release_id] = updated
            return DecisionResponse(
                release=updated.model_copy(deep=True),
                assessment=assess(updated.gates),
                event=event,
            )

        response, replayed = self._execute_idempotent(scope, idempotency_key, payload, mutate)
        return DecisionResponse.model_validate(response), replayed

    def _get_or_raise(self, release_id: str) -> ReleaseCandidate:
        try:
            return self._releases[release_id]
        except KeyError as error:
            raise ReleaseNotFound from error

    @staticmethod
    def _with_current_freshness(
        release: ReleaseCandidate, now: datetime
    ) -> ReleaseCandidate:
        gates = []
        for gate in release.gates:
            latest_observed_at = max(
                (evidence.observed_at for evidence in gate.evidence), default=None
            )
            evidence_is_expired = (
                latest_observed_at is None or now - latest_observed_at > EVIDENCE_MAX_AGE
            )
            if gate.status is GateStatus.BLOCKED or not evidence_is_expired:
                gates.append(gate.model_copy(deep=True))
                continue

            result = (
                "Evidence unavailable; assessment required"
                if latest_observed_at is None
                else "Evidence expired; refresh required"
            )
            summary = (
                "This gate has no evidence receipt, so it cannot support a release decision."
                if latest_observed_at is None
                else "The newest receipt is more than 24 hours old, so this gate is pending."
            )
            gates.append(
                gate.model_copy(
                    deep=True,
                    update={
                        "status": GateStatus.PENDING,
                        "result": result,
                        "summary": summary,
                    },
                )
            )

        return release.model_copy(deep=True, update={"gates": gates})

    @staticmethod
    def _require_expected_commit(current: ReleaseCandidate, expected: str) -> None:
        if current.commit != expected:
            raise CommitConflict(expected, current.commit)

    def _execute_idempotent(
        self,
        scope: str,
        idempotency_key: str,
        payload: dict[str, object],
        mutate: Callable[[], MutationResponse],
    ) -> tuple[MutationResponse, bool]:
        fingerprint = hashlib.sha256(
            json.dumps(payload, sort_keys=True, separators=(",", ":")).encode("utf-8")
        ).hexdigest()
        storage_key = (scope, idempotency_key)

        with self._lock:
            stored = self._idempotency.get(storage_key)
            if stored is not None:
                if stored.fingerprint != fingerprint:
                    raise IdempotencyConflict
                self._idempotency.move_to_end(storage_key)
                return stored.response.model_copy(deep=True), True  # type: ignore[return-value]

            response = mutate()
            self._idempotency[storage_key] = StoredMutation(
                fingerprint=fingerprint,
                response=response.model_copy(deep=True),
            )
            while len(self._idempotency) > self._idempotency_capacity:
                self._idempotency.popitem(last=False)
            return response.model_copy(deep=True), False
