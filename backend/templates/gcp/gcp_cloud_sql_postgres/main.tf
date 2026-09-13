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

# 1. Generate master password if not explicitly provided
resource "random_password" "db_master_password" {
  length           = 24
  special          = true
  override_special = "!#$%&*()-_=+[]{}<>:?"
}

locals {
  db_password = var.db_password != "" ? var.db_password : random_password.db_master_password.result
}

# 2. Private IP allocation range for private-path Cloud SQL connectivity
resource "google_compute_global_address" "private_ip_alloc" {
  name          = "${var.instance_name}-psql-alloc"
  project       = var.gcp_project_id
  purpose       = "VPC_PEERING"
  prefix_length = 16

  lifecycle {
    prevent_destroy = false
  }
}

resource "google_service_networking_connection" "private_vpc_connection" {
  network                 = var.network_self_link
  service                 = "servicenetworking.googleapis.com"
  reserved_peering_ranges = [google_compute_global_address.private_ip_alloc.name]

  # Peering is shared infrastructure: only create/modify if explicitly allowed by the caller
  count = var.manage_vpc_peering ? 1 : 0
}

# 3. Cloud SQL PostgreSQL instance with private IP and encrypted storage
resource "google_sql_database_instance" "postgres" {
  name             = lower(var.instance_name)
  project          = var.gcp_project_id
  database_version = "POSTGRES_${var.postgres_version}"
  region           = var.region

  deletion_protection = var.deletion_protection

  settings {
    tier              = var.tier
    availability_type = var.high_availability ? "REGIONAL" : "ZONAL"
    disk_type         = "PD_SSD"
    disk_size         = var.allocated_storage_gb
    disk_autoresize   = var.disk_autoresize

    backup_configuration {
      enabled                        = true
      start_time                     = "07:00"
      point_in_time_recovery_enabled = var.point_in_time_recovery
      backup_retention_settings {
        retained_backups = var.backup_retention_count
      }
    }

    ip_configuration {
      # Private IP only; public path requires explicit authorized networks
      ipv4_enabled = true
      private_network = var.manage_vpc_peering ? google_service_networking_connection.private_vpc_connection[0].network : var.network_self_link

      dynamic "authorized_networks" {
        for_each = var.allowed_ingress_cidrs
        content {
          name  = "authorized-${authorized_networks.key}"
          value = authorized_networks.value
        }
      }

      ssl_mode = "ENCRYPTED_ONLY"
    }

    insights_config {
      query_insights_enabled  = true
      record_application_tags = true
      record_client_address   = true
    }

    database_flags {
      name  = "cloudsql.iam_authentication"
      value = "on"
    }

    maintenance_window {
      day  = 7
      hour = 6
    }
  }

  labels = merge(
    var.labels,
    {
      managed_by = "multicloudplatform"
    }
  )
}

# 4. Application database and user
resource "google_sql_database" "database" {
  name     = var.database_name
  project  = var.gcp_project_id
  instance = google_sql_database_instance.postgres.name
}

resource "google_sql_user" "app_user" {
  name     = var.db_username
  project  = var.gcp_project_id
  instance = google_sql_database_instance.postgres.name
  password = local.db_password
}
