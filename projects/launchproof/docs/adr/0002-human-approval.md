# ADR 0002: Human approval remains authoritative

- **Status:** Accepted
- **Date:** 2026-09-03
- **Decision owners:** Product, engineering, and security

## Context

Builds, tests, scanners, performance checks, and AI evaluations can gather evidence faster and more consistently than a person. They cannot accept business risk, resolve every conflicting signal, or hold accountability for a production deployment. Allowing the same automation that generates a recommendation to approve its own release creates a weak separation of duties.

## Decision

LaunchProof may calculate `Ready`, `Conditional`, or `Hold`, but the deployment design requires a separately authorized human decision for the target environment.

Human approval is its own gate with a claimed actor, role, note, timestamp, release context, and audit event. The reference API requires the expected commit, allows only the claimed security role to approve the security gate, and invalidates an existing approval when new automated evidence is recorded. It does not verify the claimed identity or role. Production use therefore requires end-user authentication, server-side authorization, and protected-environment reviewers. A future durable implementation must also reevaluate approvals as evidence expires.

The seeded AI-evaluation gate is evidence only. This release contains no model integration, and no future automated evaluator may create, impersonate, or override a human approval.

## Consequences

### Positive

- The decision shape can become attributable and reviewable once identity is verified.
- Automated and AI-generated evidence remains useful without becoming autonomous authority.
- A disputed verdict can be returned for changes rather than silently overridden.
- Protected-environment controls can enforce the same ownership boundary outside the application.

### Costs

- Releases may wait for an authorized reviewer.
- Approval roles, escalation, expiry, and emergency procedure must be operated.
- The system needs careful handling for new commits and stale evidence.

## Alternatives considered

- **Auto-deploy on a perfect score:** rejected because thresholds and inputs can be incomplete or wrong, and automated evidence cannot accept business risk.
- **Let an AI reviewer approve:** rejected because model output is probabilistic, may be manipulated, and has no accountability.
- **Record approval only in chat or a ticket:** rejected because the release, evidence snapshot, decision, and actor would not share one traceable record.

## Guardrails

- Before production, verify reviewer identity and role at both the API and deployment environment.
- In a future durable store, bind approval to an immutable candidate/artifact identity and keep decision events append-only.
- Treat the current in-memory audit list as bounded reference behavior, not a tamper-resistant record.
- Require an explicit reason for change requests and exceptions.
- Reassess when evidence expires or the candidate changes.
- Test concurrent and duplicate decisions with idempotency controls.
