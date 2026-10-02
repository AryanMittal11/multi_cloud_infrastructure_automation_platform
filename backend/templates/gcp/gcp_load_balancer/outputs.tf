output "load_balancer_ip" {
  description = "The public IPv4 assigned to the Global Forwarding Rule"
  value       = google_compute_global_forwarding_rule.default.ip_address
}

output "forwarding_rule_id" {
  description = "The ID of the Global Forwarding Rule"
  value       = google_compute_global_forwarding_rule.default.id
}
