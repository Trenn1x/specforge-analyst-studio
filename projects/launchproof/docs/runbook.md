# Operations runbook

## Deployment truth

The GitHub Pages frontend is the only public runtime represented by this project. The API, Cloud Run, Firestore, Pub/Sub, and Terraform sections below are readiness guidance for a future environment; they are not evidence that such an environment exists.

## Ownership and signals

For the live Pages site, monitor the build/deploy workflow and public-route smoke checks.

Before even a temporary API staging deployment, assign named application and incident owners. Monitor request errors, p95 latency, health checks, revision restarts, request IDs, and cost/quota thresholds. Because the current repository is in-memory, a restart is a data reset and the Cloud Run target must stay at one instance.

Firestore latency, Pub/Sub backlog, authorization denials, and durable decision metrics become relevant only after those future adapters and controls exist. The current API does expose a fixed 24-hour evidence-freshness rule, but there is no external ingestion monitor.

## GitHub Pages deployment

1. Merge a reviewed commit to `main`.
2. Confirm the Pages workflow installed dependencies from the lockfile, ran quality gates, built `out/`, and deployed the expected commit.
3. Open `https://trenn1x.github.io/launchproof/` in a fresh session.
4. Verify dashboard, architecture, and process routes; open an evidence drawer; resolve and restore a demo gate; export JSON.
5. Record any known issue in the release notes or revert before sharing the URL.

### Pages triage

| Symptom | Check | Response |
| --- | --- | --- |
| 404 at root | Pages source, workflow artifact, repository `basePath` | Re-run the workflow after confirming the repository name and static export |
| CSS/JS 404 | `assetPrefix`, `basePath`, generated asset URLs | Correct configuration; rebuild rather than editing `out/` manually |
| Old UI | Workflow commit and browser/cache layer | Confirm deploy finished, then test a private window before changing code |
| Subroute 404 | Trailing slash and exported route output | Verify route directory exists in `out/` and links include the configured base path |

### Pages rollback

Revert the offending commit through a reviewed pull request or run the Pages workflow against the last known-good commit if repository policy supports it. Verify the deployed SHA and smoke checks. Never patch generated files in the Pages artifact.

## API-backed deployment readiness

Do not apply Terraform or deploy the API until the security gates in [the threat model](threat-model.md) have owners and environment-specific values have been reviewed.

### Control-plane ownership and bootstrap order

Two tools own different changes by design:

| Owner | Responsibility |
| --- | --- |
| Terraform | Cloud Run service existence and configuration, private invocation posture, one-instance cap, runtime identity, environment variables, probes, reserved Firestore/Pub/Sub resources, Artifact Registry, IAM, and workload identity federation |
| Manual GitHub workflow | Verify the service already exists, test and build the API, push its image, resolve the immutable digest, and create an application revision by changing only the service image |

The **first reviewed `terraform apply` must finish before the first deployment-workflow run**. Terraform bootstraps the private Cloud Run service with the official public hello image. The workflow deliberately does not create infrastructure; it fails if the expected service is absent, then replaces only that bootstrap image with the tested LaunchProof digest.

Terraform ignores later changes to the container image while continuing to manage the rest of the service configuration. A future `terraform apply` therefore does not roll the workflow-deployed application revision back to the bootstrap image. Configuration changes belong in Terraform; application revisions belong in the manual workflow. Do not use ad hoc `gcloud run deploy` commands to change settings owned by Terraform.

This path deploys the same process-local repository used in tests. Firestore and Pub/Sub are reserved resources only: the API does not connect to either one. Keep the instance maximum at one and treat any data as disposable until a durable adapter is implemented and exercised.

For a planned GCP release:

1. Review the Terraform plan, especially IAM, public ingress, retention, and deletion behavior.
2. Confirm workload identity federation; do not download a service-account key.
3. Apply Terraform and confirm the private Cloud Run service and its bootstrap revision exist. This step precedes the first application workflow.
4. Configure the protected GitHub environment and required repository variables/secrets from the Terraform outputs.
5. Start the manual Cloud Run workflow from `main` with a specific change reason. Configure environment protection to require human approval before its job runs. The workflow verifies the service, runs the API quality gates, builds and pushes the image, and resolves its digest.
6. Confirm the workflow updates only the service image to that immutable digest using the dedicated deployer identity.
7. Verify live/readiness endpoints and structured logs. After the future Firestore adapter and evidence worker exist, also verify Firestore access and Pub/Sub delivery.
8. Run idempotency, expected-commit, stale-evidence, and decision-audit smoke tests. Add end-user authentication and authorization tests before enabling production traffic.
9. Verify the active revision and retain the previous revision for rollback.

### Planned API rollback

For an application regression, move traffic to the last known-good Cloud Run revision or rerun the protected workflow from the reviewed prior commit so it resolves and records the intended digest. For an infrastructure/configuration regression, revert the Terraform change, review the new plan, and apply it. Keep the two paths separate: Terraform should not select an application revision, and the deployment workflow should not mutate Terraform-owned service settings.

### Planned API triage order

1. Identify the first bad release, affected routes, region, revision, and correlation IDs.
2. Decide whether integrity is at risk. If yes, disable decision mutations before optimizing availability.
3. Check Cloud Run revision health and recent deploy/config changes.
4. Check for restarts or unexpected scaling. Check Firestore and Pub/Sub only after their future adapters are introduced.
5. Compare the current revision with the last known-good digest.
6. Roll back or contain; then preserve a timeline and open a follow-up with an owner.

## Failure playbooks

### API unavailable

- Stop decision mutations in an API-configured client and show an explicit unavailable state; do not fall back to browser persistence.
- Check revision health, quota, invocation identity, logs, and recent workflow changes.
- Roll traffic to the last known-good revision if the current release caused the failure.
- Do not treat locally cached evidence as current authorization.

### Evidence is stale or incomplete

- The current API changes non-blocking evidence older than 24 hours to `pending`, rejects evidence more than five minutes in the future, and preserves a blocking result. It does not authenticate the claimed source.
- Confirm the source, observed timestamp, source version, and expected release commit outside the service.
- After a future ingestion adapter exists, inspect its worker/backlog and re-run the source check.
- Treat authenticated provenance, configurable freshness, and named exceptions as required production work.

### Duplicate assessments or decisions

- Compare release, actor, operation, idempotency key, and stored outcome.
- Preserve the first valid outcome and collapse replayed operations onto it.
- If two distinct decisions were accepted, disable mutation and investigate the uniqueness boundary.

### Process restarted or scaled unexpectedly

- Expect releases, recent event history, and idempotency records to return to seed state after restart.
- Confirm Cloud Run still has a maximum of one instance; multiple processes can hold conflicting histories.
- Do not reconstruct an authoritative decision from browser state. Replace the repository with a tested durable adapter before production use.

### Frontend/API mapping fails

- Keep the API error visible and capture its status/request ID when available.
- Compare the FastAPI response with the DTO mapping in `lib/release-repository.ts`.
- Do not bypass the mapper or silently switch to `BrowserReleaseRepository`.
- Add a contract fixture before accepting a mapping change.

### Suspected credential or identity compromise

- Disable the affected workflow or principal and pause deployments/decisions.
- Revoke or rotate affected credentials; inspect IAM and audit logs for scope.
- Rebuild from a trusted commit and identity path.
- Follow the disclosure path in [SECURITY.md](../SECURITY.md).

## Recovery completion

An incident is not closed until service and data integrity are verified, the release/audit trail is reconciled, monitoring is green, stakeholders know the outcome, and corrective work has an owner and due condition.
