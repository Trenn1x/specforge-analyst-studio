output "api_url" {
  description = "Private Cloud Run endpoint. Callers still need roles/run.invoker."
  value       = google_cloud_run_v2_service.api.uri
}

output "artifact_registry_repository" {
  description = "Artifact Registry repository used by the deployment workflow."
  value       = "${var.region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.api.repository_id}"
}

output "firestore_database" {
  description = "Firestore database reserved for the planned durable repository adapter."
  value       = google_firestore_database.default.name
}

output "pubsub_topic" {
  description = "Release-event topic reserved for planned asynchronous integrations."
  value       = google_pubsub_topic.release_events.id
}

output "runtime_service_account" {
  description = "Runtime identity attached to the Cloud Run service by Terraform."
  value       = google_service_account.runtime.email
}

output "github_deployer_service_account" {
  description = "Set this as the GCP_DEPLOYER_SERVICE_ACCOUNT repository secret."
  value       = google_service_account.github_deployer.email
}

output "github_workload_identity_provider" {
  description = "Set this as the GCP_WORKLOAD_IDENTITY_PROVIDER repository secret."
  value       = google_iam_workload_identity_pool_provider.github.name
}
