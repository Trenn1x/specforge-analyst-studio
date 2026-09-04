# Contributing to LaunchProof

LaunchProof is small on purpose, but changes should be made as if another engineer will operate them at 2 a.m. Favor explicit contracts, reversible decisions, and evidence a reviewer can reproduce.

## Start locally

Frontend:

```bash
npm ci
npm run dev
```

API:

```bash
python -m venv .venv
source .venv/bin/activate
python -m pip install -r services/api/requirements-dev.txt
python -m uvicorn app.main:app --app-dir services/api --reload --port 8080
```

## Delivery workflow

1. **Shape:** write the user outcome, acceptance criteria, risks, and intentionally excluded scope.
2. **Build:** create the smallest reversible slice and add tests beside the policy it changes.
3. **Review:** open a focused pull request; respond to the design and failure-mode questions, not only line comments.
4. **Prove:** run the same quality gates CI will run and attach any manual evidence.
5. **Operate:** merge only with an identified owner, deployment signal, and rollback path.

Use a short-lived branch such as `feature/evidence-expiry` or `fix/duplicate-decision`. Keep refactors separate from behavior changes when that makes review easier.

## Before opening a pull request

Run the frontend gate:

```bash
npm run verify
```

Run the API gate:

```bash
(
  cd services/api
  python -m ruff check .
  python -m pytest
)
```

If Terraform changed, format and validate it from `infra/terraform/`:

```bash
terraform fmt -check -recursive
terraform init -backend=false
terraform validate
```

## Pull-request contract

Every pull request should answer:

- **Why:** what problem and user outcome justify the change?
- **Scope:** what is included, and what was intentionally left out?
- **Risk:** how can this fail, and which trust boundary changed?
- **Proof:** which tests, evaluation results, or manual checks support it?
- **Operations:** how will an operator see failure, and how can they roll back?
- **AI use:** where did AI contribute, and how was the accepted output verified?

Reviewers should be able to reproduce the proof without reverse-engineering the author's environment. A green check is supporting evidence, not a substitute for judgment.

## Review expectations

Review for behavior in this order:

1. contract and authorization;
2. failure and recovery behavior;
3. data integrity and auditability;
4. test strength and readability;
5. implementation detail.

Changes to scoring, decision authorization, evidence freshness, identity, infrastructure, or audit history require an explicit second set of eyes. Record durable architectural tradeoffs as an ADR in `docs/adr/`.

## AI-assisted changes

AI may accelerate scaffolding, alternatives, test expansion, and documentation. The author still owns every accepted line. Do not merge output you cannot explain, test, and support. Never place customer data, tokens, proprietary prompts, or secrets into an unapproved model. Follow [the AI assurance policy](docs/ai-assurance.md).

## Commit and documentation quality

- Use imperative, outcome-oriented commit subjects.
- Update tests when behavior changes.
- Update the runbook when deployment or recovery steps change.
- Update the threat model when a trust boundary, data class, or external dependency changes.
- Keep the public-demo status honest; reference infrastructure is not a deployed service.
