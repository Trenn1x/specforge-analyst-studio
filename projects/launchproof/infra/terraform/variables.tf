variable "project_id" {
  description = "Google Cloud project that owns the LaunchProof resources."
  type        = string

  validation {
    condition     = can(regex("^[a-z][a-z0-9-]{4,28}[a-z0-9]$", var.project_id))
    error_message = "project_id must be a valid Google Cloud project ID."
  }
}

variable "region" {
  description = "Google Cloud region for Cloud Run and Artifact Registry."
  type        = string
  default     = "us-central1"

  validation {
    condition     = can(regex("^[a-z]+-[a-z]+[0-9]+$", var.region))
    error_message = "region must look like a Google Cloud region, for example us-central1."
  }
}

variable "container_image" {
  description = "Image used only to create Cloud Run. The deployment workflow owns later digest-pinned revisions."
  type        = string
  default     = "us-docker.pkg.dev/cloudrun/container/hello"

  validation {
    condition = (
      var.container_image == "us-docker.pkg.dev/cloudrun/container/hello" ||
      can(regex("^[a-z0-9-]+-docker\\.pkg\\.dev/.+@sha256:[a-f0-9]{64}$", var.container_image))
    )
    error_message = "container_image must be the official bootstrap image or an Artifact Registry image pinned by sha256 digest."
  }
}

variable "allowed_origins" {
  description = "Origins allowed by the API CORS policy. Keep this list explicit."
  type        = list(string)
  default     = ["https://trenn1x.github.io"]

  validation {
    condition = alltrue([
      for origin in var.allowed_origins : can(regex("^https://", origin)) && !endswith(origin, "/")
    ])
    error_message = "Every allowed origin must use HTTPS and omit the trailing slash."
  }
}

variable "github_repository" {
  description = "GitHub owner/repository allowed to exchange an Actions OIDC token."
  type        = string
  default     = "Trenn1x/specforge-analyst-studio"

  validation {
    condition     = can(regex("^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+$", var.github_repository))
    error_message = "github_repository must use owner/repository format."
  }
}
