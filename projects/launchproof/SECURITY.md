# Security policy

## Supported code

Security fixes target the current `main` branch. This repository is a demonstration and reference architecture, not a hosted multi-tenant service.

## Report a vulnerability

Please use [GitHub's private vulnerability reporting](https://github.com/Trenn1x/launchproof/security/advisories/new). Include:

- affected path, endpoint, or workflow;
- reproduction steps or a minimal proof of concept;
- expected impact and required preconditions;
- any mitigation already tested.

Do not open a public issue for an exploitable vulnerability or include real credentials, personal data, or customer data in a report. Reports will be triaged, reproduced when possible, and resolved through a reviewed change before public disclosure.

## Deployment boundary

The GitHub Pages site is a static, public bundle with seeded data and browser-local persistence. It has no privileged backend connection and should contain no secret. Anyone can inspect or modify its local state; it is not an authorization surface.

The FastAPI service and Terraform in this repository describe a separate production path. They are not claimed as deployed. Any real deployment must add environment-specific authentication, restrictive CORS, protected branch/environment rules, identity federation, log retention, backup policy, and alert ownership before accepting sensitive evidence.

## Security expectations

- Never commit service-account keys, `.env` files, tokens, or live evidence.
- Prefer workload identity federation and least-privilege service identities over stored cloud keys.
- Treat evidence receipts and decision history as integrity-sensitive records.
- Require server-side authorization for assessments and decisions; frontend state is never authoritative.
- Validate request bodies and external/AI output against explicit schemas.
- Reject stale evidence rather than treating missing data as success.
- Use idempotency controls for mutating requests.
- Pin and scan build dependencies and deploy immutable artifacts by digest.
- Keep human approval independent of automated or AI-generated recommendations.

The detailed assumptions, threats, controls, and residual risks are in [the threat model](docs/threat-model.md).
