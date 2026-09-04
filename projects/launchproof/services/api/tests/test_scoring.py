from __future__ import annotations

from app.models import GateStatus, ReleaseVerdict
from app.scoring import assess, calculate_score, get_verdict
from app.seed import seed_releases


def _release(release_id: str):
    return next(release for release in seed_releases() if release.id == release_id)


def test_scoring_matches_the_frontend_release_policy() -> None:
    atlas = assess(_release("atlas-270").gates)
    nimbus = assess(_release("nimbus-194").gates)
    relay = assess(_release("relay-420").gates)

    assert atlas.score == 85
    assert atlas.verdict is ReleaseVerdict.CONDITIONAL
    assert (atlas.passed, atlas.warnings, atlas.blocked, atlas.pending) == (5, 1, 1, 0)

    assert nimbus.score == 100
    assert nimbus.verdict is ReleaseVerdict.READY

    assert relay.score == 62
    assert relay.verdict is ReleaseVerdict.HOLD


def test_empty_gate_collection_is_safe_and_not_ready() -> None:
    assert calculate_score([]) == 0
    assert get_verdict([], 0) is ReleaseVerdict.CONDITIONAL


def test_pending_gate_forces_a_conditional_verdict() -> None:
    release = _release("nimbus-194")
    gates = [
        gate.model_copy(update={"status": GateStatus.PENDING})
        if gate.id == "performance"
        else gate
        for gate in release.gates
    ]

    result = assess(gates)

    assert result.score == 93
    assert result.verdict is ReleaseVerdict.CONDITIONAL
    assert result.pending == 1
