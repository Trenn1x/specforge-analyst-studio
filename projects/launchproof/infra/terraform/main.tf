locals {
  service_name  = "launchproof-api"
  repository_id = "launchproof"

  required_services = toset([
    "artifactregistry.googleapis.com",
    "containeranalysis.googleapis.com",
    "firestore.googleapis.com",
    "iam.googleapis.com",
    "iamcredentials.googleapis.com",
    "pubsub.googleapis.com",
    "run.googleapis.com",
    "sts.googleapis.com",
  ])

  runtime_roles = toset([
    "roles/logging.logWriter",
  ])

  deployer_roles = toset([
    "roles/run.developer",
    "roles/serviceusage.serviceUsageConsumer",
  ])
}

resource "google_project_service" "required" {
  for_each = local.required_services

  project            = var.project_id
  service            = each.value
  disable_on_destroy = false
}

resource "google_artifact_registry_repository" "api" {
  project       = var.project_id
  location      = var.region
  repository_id = local.repository_id
  description   = "Container images for LaunchProof"
  format        = "DOCKER"

  cleanup_policy_dry_run = false

  cleanup_policies {
    id     = "delete-untagged"
    action = "DELETE"

    condition {
      tag_state  = "UNTAGGED"
      older_than = "2592000s"
    }
  }

  cleanup_policies {
    id     = "keep-recent"
    action = "KEEP"

    most_recent_versions {
      keep_count = 10
    }
  }

  depends_on = [google_project_service.required]
}

resource "google_firestore_database" "default" {
  project                     = var.project_id
  name                        = "(default)"
  location_id                 = var.region
  type                        = "FIRESTORE_NATIVE"
  concurrency_mode            = "OPTIMISTIC"
  app_engine_integration_mode = "DISABLED"

  point_in_time_recovery_enablement = "POINT_IN_TIME_RECOVERY_ENABLED"
  delete_protection_state           = "DELETE_PROTECTION_ENABLED"
  deletion_policy                   = "ABANDON"

  depends_on = [google_project_service.required]
}

resource "google_pubsub_topic" "release_events" {
  project                    = var.project_id
  name                       = "launchproof-release-events"
  message_retention_duration = "604800s"

  message_storage_policy {
    allowed_persistence_regions = [var.region]
  }

  depends_on = [google_project_service.required]
}

resource "google_service_account" "runtime" {
  project      = var.project_id
  account_id   = "launchproof-runtime"
  display_name = "LaunchProof Cloud Run runtime"

  depends_on = [google_project_service.required]
}

resource "google_project_iam_member" "runtime" {
  for_each = local.runtime_roles

  project = var.project_id
  role    = each.value
  member  = "serviceAccount:${google_service_account.runtime.email}"
}

resource "google_cloud_run_v2_service" "api" {
  project             = var.project_id
  name                = local.service_name
  location            = var.region
  ingress             = "INGRESS_TRAFFIC_ALL"
  deletion_protection = false

  template {
    service_account = google_service_account.runtime.email
    timeout         = "30s"

    scaling {
      min_instance_count = 0
      # The reference API is intentionally in-memory. Keep one instance so a
      # demo deployment cannot present divergent process-local histories.
      max_instance_count = 1
    }

    containers {
      image = var.container_image

      ports {
        name           = "http1"
        container_port = 8080
      }

      env {
        name  = "GOOGLE_CLOUD_PROJECT"
        value = var.project_id
      }

      # Reserved contract for the planned durable repository adapter. The
      # current reference API deliberately remains in-memory.
      env {
        name  = "FIRESTORE_DATABASE"
        value = google_firestore_database.default.name
      }

      # Reserved contract for future asynchronous evidence ingestion.
      env {
        name  = "PUBSUB_TOPIC"
        value = google_pubsub_topic.release_events.name
      }

      env {
        name  = "LAUNCHPROOF_ALLOWED_ORIGINS"
        value = join(",", var.allowed_origins)
      }

      resources {
        cpu_idle          = true
        startup_cpu_boost = true
        limits = {
          cpu    = "1"
          memory = "512Mi"
        }
      }

      startup_probe {
        initial_delay_seconds = 2
        timeout_seconds       = 3
        period_seconds        = 5
        failure_threshold     = 12

        tcp_socket {
          port = 8080
        }
      }

      liveness_probe {
        initial_delay_seconds = 10
        timeout_seconds       = 3
        period_seconds        = 10
        failure_threshold     = 3

        http_get {
          path = "/health/live"
          port = 8080
        }
      }
    }
  }

  # Terraform owns service configuration; the protected deployment workflow
  # owns revision images and always updates them by immutable digest.
  lifecycle {
    ignore_changes = [template[0].containers[0].image]
  }

  depends_on = [
    google_artifact_registry_repository.api,
    google_project_iam_member.runtime,
  ]
}

# The API stays private by default. A caller must hold roles/run.invoker and send
# an identity token; CORS is not treated as authorization.

resource "google_service_account" "github_deployer" {
  project      = var.project_id
  account_id   = "launchproof-deployer"
  display_name = "LaunchProof GitHub Actions deployer"

  depends_on = [google_project_service.required]
}

resource "google_project_iam_member" "github_deployer" {
  for_each = local.deployer_roles

  project = var.project_id
  role    = each.value
  member  = "serviceAccount:${google_service_account.github_deployer.email}"
}

resource "google_artifact_registry_repository_iam_member" "github_deployer" {
  project    = var.project_id
  location   = google_artifact_registry_repository.api.location
  repository = google_artifact_registry_repository.api.repository_id
  role       = "roles/artifactregistry.writer"
  member     = "serviceAccount:${google_service_account.github_deployer.email}"
}

resource "google_service_account_iam_member" "deployer_acts_as_runtime" {
  service_account_id = google_service_account.runtime.name
  role               = "roles/iam.serviceAccountUser"
  member             = "serviceAccount:${google_service_account.github_deployer.email}"
}

resource "google_iam_workload_identity_pool" "github" {
  project                   = var.project_id
  workload_identity_pool_id = "launchproof-github"
  display_name              = "LaunchProof GitHub Actions"
  description               = "Short-lived GitHub Actions credentials; no service-account key"

  depends_on = [google_project_service.required]
}

resource "google_iam_workload_identity_pool_provider" "github" {
  project                            = var.project_id
  workload_identity_pool_id          = google_iam_workload_identity_pool.github.workload_identity_pool_id
  workload_identity_pool_provider_id = "github"
  display_name                       = "LaunchProof repository"

  attribute_mapping = {
    "google.subject"       = "assertion.sub"
    "attribute.actor"      = "assertion.actor"
    "attribute.repository" = "assertion.repository"
  }

  attribute_condition = "assertion.repository == '${var.github_repository}' && assertion.ref == 'refs/heads/main'"

  oidc {
    issuer_uri = "https://token.actions.githubusercontent.com"
  }
}

resource "google_service_account_iam_member" "github_wif" {
  service_account_id = google_service_account.github_deployer.name
  role               = "roles/iam.workloadIdentityUser"
  member             = "principalSet://iam.googleapis.com/${google_iam_workload_identity_pool.github.name}/attribute.repository/${var.github_repository}"
}
