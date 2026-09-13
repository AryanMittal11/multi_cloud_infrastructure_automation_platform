terraform {
  required_version = ">= 1.5.0"
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
  }
}

# 1. Custom VPC Network (auto_create_subnetworks disabled for explicit control)
resource "google_compute_network" "vpc" {
  name                    = "${var.environment_name}-vpc"
  project                 = var.gcp_project_id
  description             = "Platform-managed VPC for ${var.environment_name}"
  auto_create_subnetworks = false

  tags = var.tags
}

# 2. Public Subnetwork (workload-facing, regional)
resource "google_compute_subnetwork" "public" {
  name          = "${var.environment_name}-public-subnet"
  project       = var.gcp_project_id
  region        = var.region
  network       = google_compute_network.vpc.id
  ip_cidr_range = var.public_subnet_cidr

  private_ip_google_access = true

  secondary_ip_range {
    range_name    = "pods"
    ip_cidr_range = var.pods_secondary_cidr
  }

  secondary_ip_range {
    range_name    = "services"
    ip_cidr_range = var.services_secondary_cidr
  }

  log_config {
    aggregation_interval = "INTERVAL_10_MIN"
    flow_sampling        = 0.5
    metadata             = "INCLUDE_ALL_METADATA"
  }
}

# 3. Private Subnetwork (database / internal tier)
resource "google_compute_subnetwork" "private" {
  name          = "${var.environment_name}-private-subnet"
  project       = var.gcp_project_id
  region        = var.region
  network       = google_compute_network.vpc.id
  ip_cidr_range = var.private_subnet_cidr

  private_ip_google_access = true
}

# 4. Cloud Router + Cloud NAT: private subnet egress via managed NAT
resource "google_compute_router" "nat_router" {
  name    = "${var.environment_name}-nat-router"
  project = var.gcp_project_id
  region  = var.region
  network = google_compute_network.vpc.id

  bgp {
    asn = 64514
  }
}

resource "google_compute_router_nat" "nat" {
  name                               = "${var.environment_name}-nat"
  project                            = var.gcp_project_id
  router                             = google_compute_router.nat_router.name
  region                             = var.region
  nat_ip_allocate_option             = "AUTO_ONLY"
  source_subnetwork_ip_ranges_to_nat = var.enable_private_nat ? "LIST_OF_SUBNETWORKS" : "ALL_SUBNETWORKS_ALL_IP_RANGES"

  dynamic "subnetwork" {
    for_each = var.enable_private_nat ? [google_compute_subnetwork.private.id] : []
    content {
      name                    = subnetwork.value
      source_ip_ranges_to_nat = ["PRIMARY_IP_RANGE"]
    }
  }

  log_config {
    enable = true
    filter = "ERRORS_ONLY"
  }
}

# 5. Firewall rules: deny-by-default ingress with explicit HTTP/HTTPS/ICMP allowances
resource "google_compute_firewall" "allow_http_https" {
  name          = "${var.environment_name}-allow-http-https"
  project       = var.gcp_project_id
  network       = google_compute_network.vpc.name
  description   = "Allow inbound HTTP and HTTPS from anywhere"
  direction     = "INGRESS"
  source_ranges = ["0.0.0.0/0"]

  allow {
    protocol = "tcp"
    ports    = ["80", "443"]
  }

  target_tags = ["web"]
}

# Guarded administrative SSH: only from explicitly authorized CIDRs, never open to the world
resource "google_compute_firewall" "allow_restricted_ssh" {
  count         = length(var.allowed_ssh_cidrs) > 0 ? 1 : 0
  name          = "${var.environment_name}-allow-restricted-ssh"
  project       = var.gcp_project_id
  network       = google_compute_network.vpc.name
  description   = "Allow administrative SSH from authorized CIDR blocks only"
  direction     = "INGRESS"
  source_ranges = var.allowed_ssh_cidrs

  allow {
    protocol = "tcp"
    ports    = ["22"]
  }

  target_tags = ["ssh"]
}

resource "google_compute_firewall" "allow_internal" {
  name          = "${var.environment_name}-allow-internal"
  project       = var.gcp_project_id
  network       = google_compute_network.vpc.name
  description   = "Allow all traffic within the VPC (east-west)"
  direction     = "INGRESS"
  source_ranges = [var.public_subnet_cidr, var.private_subnet_cidr]

  allow {
    protocol = "tcp"
  }

  allow {
    protocol = "udp"
  }

  allow {
    protocol = "icmp"
  }
}
