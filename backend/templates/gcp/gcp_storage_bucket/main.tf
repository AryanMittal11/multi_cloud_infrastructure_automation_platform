terraform {
  required_version = ">= 1.5.0"
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.5"
    }
  }
}

# 1. Random suffix for globally unique bucket name
resource "random_string" "suffix" {
  length  = 8
  special = false
  upper   = false
}

locals {
  bucket_name = "${lower(var.bucket_name_prefix)}-${random_string.suffix.result}"
}

# 2. Cloud Storage bucket with strict security invariants
resource "google_storage_bucket" "bucket" {
  name          = local.bucket_name
  project       = var.gcp_project_id
  location      = var.location
  storage_class = var.storage_class

  # Strict security invariants: never allow public access, always enforce uniform IAM
  public_access_prevention    = "enforced"
  uniform_bucket_level_access = true
  force_destroy               = var.force_destroy

  # Default server-side encryption with Google-managed keys
  encryption {
    default_kms_key_name = var.kms_key_name != "" ? var.kms_key_name : null
  }

  # Object versioning for rollback and disaster recovery
  versioning {
    enabled = var.enable_versioning
  }

  # Soft-delete policy for accidental deletion recovery
  soft_delete_policy {
    retention_duration_seconds = var.soft_delete_retention_days * 86400
  }

  # Lifecycle: transition to colder storage tiers, never auto-delete
  dynamic "lifecycle_rule" {
    for_each = var.enable_lifecycle_rules ? [1] : []
    content {
      condition {
        age = 90
      }
      action {
        type          = "SetStorageClass"
        storage_class = "NEARLINE"
      }
    }
  }

  dynamic "lifecycle_rule" {
    for_each = var.enable_lifecycle_rules ? [1] : []
    content {
      condition {
        age = 365
      }
      action {
        type          = "SetStorageClass"
        storage_class = "ARCHIVE"
      }
    }
  }

  labels = merge(
    var.labels,
    {
      managed_by = "multicloudplatform"
    }
  )
}

# 3. IAM controls: grant read access only to explicitly authorized members
resource "google_storage_bucket_iam_policy" "bucket" {
  count        = length(var.iam_readers) > 0 ? 1 : 0
  bucket       = google_storage_bucket.bucket.name
  policy_data  = jsonencode({
    bindings = [
      {
        role    = "roles/storage.objectViewer"
        members = var.iam_readers
      }
    ]
  })
}

# 4. Default object retention: no public object, no public ACL (uniform access enforced above)
resource "google_storage_bucket_object" "healthcheck" {
  count   = var.create_healthcheck_object ? 1 : 0
  name    = ".platform-healthcheck"
  bucket  = google_storage_bucket.bucket.name
  content = jsonencode({
    managed_by = "multicloudplatform"
    created_at = timestamp()
  })

  depends_on = [google_storage_bucket.bucket]
}
