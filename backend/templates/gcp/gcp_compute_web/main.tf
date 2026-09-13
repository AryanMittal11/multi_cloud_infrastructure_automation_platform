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

resource "random_string" "suffix" {
  length  = 6
  special = false
  upper   = false
}

locals {
  instance_name = "${var.server_name}-${random_string.suffix.result}"
}

# 1. Reserved static external IP for the web server
resource "google_compute_address" "web" {
  name    = "${local.instance_name}-ip"
  project = var.gcp_project_id
  region  = var.region

  lifecycle {
    prevent_destroy = false
  }
}

# 2. Guarded firewall rule scoped to this instance tag
resource "google_compute_firewall" "web" {
  name          = "${local.instance_name}-allow-web"
  project       = var.gcp_project_id
  network       = var.network_name
  description   = "Allow HTTP/HTTPS to the platform web server instance"
  direction     = "INGRESS"
  source_ranges = ["0.0.0.0/0"]
  target_tags   = [local.instance_name]

  allow {
    protocol = "tcp"
    ports    = ["80", "443"]
  }
}

# Guarded administrative SSH: only from explicitly authorized CIDRs
resource "google_compute_firewall" "ssh" {
  count         = length(var.allowed_ssh_cidrs) > 0 ? 1 : 0
  name          = "${local.instance_name}-allow-ssh"
  project       = var.gcp_project_id
  network       = var.network_name
  description   = "Allow administrative SSH from authorized CIDR blocks only"
  direction     = "INGRESS"
  source_ranges = var.allowed_ssh_cidrs
  target_tags   = ["${local.instance_name}-ssh"]

  allow {
    protocol = "tcp"
    ports    = ["22"]
  }
}

# 3. Compute Engine instance with encrypted disk and Nginx startup script
resource "google_compute_instance" "web" {
  name         = local.instance_name
  project      = var.gcp_project_id
  machine_type = var.machine_type
  zone         = var.zone
  tags         = [local.instance_name, "${local.instance_name}-ssh"]

  boot_disk {
    initialize_params {
      image = var.boot_image
      size  = var.allocated_storage_gb
      type  = "pd-balanced"
    }

    # Disk encryption with Google-managed key (default) — explicitly declared for auditability
    encryption = {}
  }

  network_interface {
    subnetwork = var.subnet_self_link

    access_config {
      nat_ip = google_compute_address.web.address
    }
  }

  metadata = {
    enable-oslogin = "TRUE"
  }

  metadata_startup_script = <<-EOF
    #!/bin/bash
    apt-get update -y
    apt-get install -y nginx
    systemctl start nginx
    systemctl enable nginx
    cat <<HTML > /var/www/html/index.html
    <!DOCTYPE html>
    <html>
    <head>
      <title>${var.server_name} - Multi-Cloud Automation</title>
      <style>
        body { font-family: -apple-system, sans-serif; background: #0f172a; color: #f8fafc; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
        .card { background: #1e293b; padding: 2.5rem; border-radius: 1rem; border: 1px solid #334155; text-align: center; max-width: 500px; box-shadow: 0 10px 25px rgba(0,0,0,0.5); }
        h1 { color: #38bdf8; margin-bottom: 0.5rem; }
        p { color: #94a3b8; line-height: 1.6; }
        .badge { display: inline-block; background: #0284c7; color: white; padding: 0.25rem 0.75rem; border-radius: 9999px; font-size: 0.85rem; font-weight: 600; margin-top: 1rem; }
      </style>
    </head>
    <body>
      <div class="card">
        <h1>Multi-Cloud Platform</h1>
        <p>Server <strong>${var.server_name}</strong> successfully provisioned on <strong>GCP Compute Engine</strong>.</p>
        <p>Machine Type: <code>${var.machine_type}</code></p>
        <span class="badge">Active &bull; Operational</span>
      </div>
    </body>
    </html>
    HTML
  EOF

  service_account {
    # Minimal-scoped platform service account for instance operations
    email  = var.service_account_email != "" ? var.service_account_email : null
    scopes = ["cloud-platform"]
  }

  shielded_instance_config {
    enable_secure_boot          = true
    enable_vtpm                 = true
    enable_integrity_monitoring = true
  }

  labels = merge(
    var.labels,
    {
      managed_by = "multicloudplatform"
      role       = "webserver"
    }
  )

  scheduling {
    preemptible       = var.preemptible
    automatic_restart = !var.preemptible
  }
}
