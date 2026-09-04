# Delivery plan

## Outcome

Create a compact, inspectable system that demonstrates how ambiguous operational risk becomes a typed product, a deterministic policy, a tested service boundary, and an operable deployment path.

## Scope principles

- Prefer one coherent release-management workflow over a broad platform mockup.
- Make the public demonstration useful without requiring an account or cloud budget.
- Put production concerns—authorization, idempotency, audit, infrastructure, and rollback—behind explicit boundaries.
- State what is live, what is tested locally/CI, and what remains a deployment plan.

## Delivery slices

| Slice | Deliverable | Exit evidence | Status |
| --- | --- | --- | --- |
| 1. Product proof | Responsive Next.js release console with seven gates, evidence drawer, decisions, bounded audit-style history, persistence, and export | Lint, typecheck, unit tests, static production build, hands-on demo | Implemented for GitHub Pages |
| 2. Service contract | FastAPI health, release, assessment, decision, and audit behavior with strict models, idempotency, and process-local storage | API tests, schema validation, container build path | Implemented and tested; not hosted and not durable |
| 3. Cloud path | Terraform for a private, one-instance Cloud Run reference plus reserved Firestore/Pub/Sub resources and a protected deployment workflow | Format/validate checks and reviewed plan | Defined; not applied; data/messaging adapters absent |
| 4. Team operating model | Contribution contract, CI, review ownership, ADRs, threat model, AI policy, and runbook | Another engineer can reproduce proof and explain rollback | Documented |
| 5. Production hardening | Real identity, authorization matrix, Firestore adapter, observability, load/security tests, backup and incident ownership | Staging exercise plus approved launch checklist | Intentionally future work |

## Acceptance criteria

### Product

- A first-time visitor understands the verdict, blocker, and next action without setup.
- Gate evidence states actual value, threshold, source, timestamp, and importance.
- Approval and change-request actions update both verdict and audit history.
- Demo mutations can be reset and never imply a server-side decision.

### Engineering

- Scoring and verdict policy are pure, typed, and unit-tested.
- The web app passes lint, typecheck, tests, and static build from a clean install.
- The service validates input, records bounded in-memory audit events, and has deterministic tests.
- Documentation distinguishes current runtime from target architecture.

### Delivery and operations

- Pull requests explain purpose, risk, proof, AI assistance, and rollback.
- Pages deployment is reproducible from a lockfile and contains no runtime secret.
- Infrastructure changes receive a plan and human approval before apply.
- Known failure modes have safe degradation and recovery guidance.

## Explicit non-goals for the public release

- production authentication or multi-tenant authorization;
- provisioning or operating a GCP project;
- accepting customer or confidential release evidence;
- autonomous AI decisions or deployment approval;
- claiming enterprise scale from a public demonstration.

## Risk register

| Risk | Mitigation | Proof sought |
| --- | --- | --- |
| Static demo is mistaken for a live SaaS backend | Visible deployment-truth language in product and docs | Architecture and README review |
| Polished UI obscures shallow logic | Expose source, thresholds, scoring, tests, and API contract | Unit/API tests and evidence drawer |
| Cloud definitions are mistaken for a durable backend | Label the one-instance, in-memory API and unused Firestore/Pub/Sub resources | Reproducible local/CI checks; later adapter and staging exercise |
| AI assistance introduces unreviewed assumptions | Bounded delegation, disclosure, independent assertions, human review | PR record and adversarial cases |
| Team-process claims are ceremonial | Small review contract tied to actual gates and rollback | A second contributor can follow it without oral context |

## Next production increment

The next honest increment is not more UI. It is a temporary staging project with federated CI identity, authenticated API access, a real Firestore adapter, operational dashboards, and a rollback exercise. Completion requires recorded evidence; provisioning alone is insufficient.
