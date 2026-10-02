terraform {
  required_version = ">= 1.5.0"
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
  }
}

resource "google_compute_global_address" "default" {
  name = "${var.lb_name}-ip"
}

resource "google_compute_http_health_check" "default" {
  name               = "${var.lb_name}-health-check"
  request_path       = "/"
  check_interval_sec = 10
  timeout_sec        = 5
}

resource "google_compute_backend_service" "default" {
  name          = "${var.lb_name}-backend"
  health_checks = [google_compute_http_health_check.default.id]
  port_name     = "http"
  protocol      = "HTTP"
  timeout_sec   = 30
}

resource "google_compute_url_map" "default" {
  name            = "${var.lb_name}-url-map"
  default_service = google_compute_backend_service.default.id
}

resource "google_compute_target_http_proxy" "default" {
  name    = "${var.lb_name}-proxy"
  url_map = google_compute_url_map.default.id
}

resource "google_compute_global_forwarding_rule" "default" {
  name       = "${var.lb_name}-rule"
  target     = google_compute_target_http_proxy.default.id
  port_range = "80"
  ip_address = google_compute_global_address.default.address
}
