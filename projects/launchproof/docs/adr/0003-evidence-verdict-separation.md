# ADR 0003: Separate evidence from verdicts

- **Status:** Accepted
- **Date:** 2026-09-04
- **Decision owners:** Product and engineering

## Context

A release check reports an observation: a build completed, a threshold was met, or an approval is pending. A release verdict is a policy conclusion drawn from a set of those observations. Combining collection and judgment makes a result hard to explain, test, or recompute when policy changes.

## Decision

Represent evidence, normalized gate state, and verdict as separate concepts.

- Evidence items describe source, actual result, threshold, timestamp, and why the check matters.
- Gates carry normalized `passed`, `warning`, `blocked`, or `pending` state plus an explicit weight.
- Pure TypeScript and Python policy functions calculate the score and `Ready`, `Conditional`, or `Hold` verdict from gates.
- UI and API responses expose both the inputs and the conclusion so a reviewer can reconstruct the decision.

The current FastAPI assessment endpoint accepts normalized gate updates and evidence receipts from its caller. It binds them to an expected release commit, requires timezone-aware observation times, rejects timestamps more than five minutes in the future, and changes stale non-blocking evidence to `pending` after 24 hours. It does not collect the observation or authenticate its claimed source. The current browser and API histories are bounded and mutable with their local/process state; they are not durable evidence ledgers.

A future ingestion layer must verify provenance, artifact binding, and freshness before normalizing a gate. A future durable repository should preserve immutable evidence receipts, the policy version and input set used for each assessment, and append-only decision events.

## Consequences

### Positive

- Scoring is deterministic, fast, and unit-testable without infrastructure.
- A human can inspect the observation and threshold behind each gate.
- Policy can be revised without changing evidence-collection code.
- External or AI-generated signals cannot directly grant human approval.

### Costs and current limits

- TypeScript and Python implementations can drift, so shared fixtures or generated contracts are desirable.
- A caller can currently submit a fresh, structurally valid but unauthenticated gate status.
- Recomputing from mutable in-memory state is not historical reproducibility.
- Adding a real evidence source requires a new validation and trust boundary.

## Alternatives considered

- **Let each check decide the final verdict:** rejected because thresholds and cross-gate policy become scattered and opaque.
- **Persist only the score:** rejected because a score without its inputs cannot be reviewed or explained.
- **Let AI synthesize the verdict:** rejected because deterministic policy is easier to test and cannot replace accountable human approval.

## Guardrails

- Keep scoring functions pure and cover thresholds, blockers, pending gates, and empty input with tests.
- Display evidence and gate state alongside the recommendation.
- Do not describe caller-supplied evidence as verified until an authenticated ingestion boundary exists.
- Version policy and persist its exact input set when durable storage is introduced.
- Keep the human-approval gate non-automated.
