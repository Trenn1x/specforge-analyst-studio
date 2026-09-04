# ADR 0001: Static public demo with a separate API reference

- **Status:** Accepted
- **Date:** 2026-09-03
- **Decision owners:** Product and engineering

## Context

LaunchProof needs a public, low-friction demonstration and a credible path for sensitive release evidence. GitHub Pages is reliable and inexpensive for static assets, but it cannot safely hold service credentials, perform authoritative authorization, or provide a durable audit system. Pretending browser-local state is production state would weaken the project rather than demonstrate full-stack judgment.

## Decision

Use Next.js static export for the public product demonstration. Pages instantiates `BrowserReleaseRepository` with seeded synthetic data and `localStorage` only.

Keep the remote boundary explicit in `lib/release-repository.ts`. `ReleaseDataSource` and `ReleaseRepository` describe client capabilities; `FastApiReleaseClient` is an opt-in data source that maps the API's snake_case DTOs into the frontend model. It is implemented but not instantiated by the Pages build, and non-successful HTTP responses remain errors rather than triggering a demo fallback.

Define the server separately as a containerized FastAPI reference with strict models, idempotent mutations, request IDs, and bounded process-local state. Terraform targets a private, one-instance Cloud Run service and reserves Firestore/Pub/Sub resources for future adapters. The current API does not use those resources, persist across restart, or authenticate end users.

## Consequences

### Positive

- Anyone can inspect the product without credentials or cloud cost.
- The public bundle has no legitimate reason to contain a secret.
- Frontend product work and backend/cloud design can be reviewed independently.
- A typed mapping boundary supports later API integration without spreading wire-format assumptions through the interface.

### Costs

- The public URL does not demonstrate live distributed-system behavior.
- Demo persistence is per browser and intentionally untrusted.
- Compile-time DTO types do not runtime-validate a remote JSON body; contracts must be kept aligned until a schema validator or generated client is adopted.
- The API's in-memory history and idempotency records disappear on restart and cannot support multiple instances.
- Production claims require a later staged deployment and operational exercise.

## Alternatives considered

- **Client-only application as the final architecture:** rejected because local state cannot provide identity, integrity, or accountable audit history.
- **Deploy a backend immediately:** rejected for this slice because identity, budget, alert ownership, and environment authorization require explicit operational ownership.
- **Mock a live endpoint:** rejected because it would add fragility while blurring deployment truth.

## Guardrails

- Label the live/static and defined/not-deployed boundaries in both product and documentation.
- Never include runtime secrets in the Pages workflow or client environment.
- Keep Pages on `BrowserReleaseRepository`; enabling `FastApiReleaseClient` must be an explicit environment decision.
- Fail visibly on API errors instead of writing the attempted operation to local demo state.
- Require server-side recomputation and authorization before a future decision is authoritative.
- Treat a successful Terraform plan as design evidence, not proof of an operating system.
