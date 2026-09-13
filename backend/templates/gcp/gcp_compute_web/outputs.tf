output "instance_id" {
  description = "Resource ID of the Compute Engine instance"
  value       = google_compute_instance.web.instance_id
}

output "instance_name" {
  description = "Name of the Compute Engine instance"
  value       = google_compute_instance.web.name
}

output "self_link" {
  description = "Self-link URI of the Compute Engine instance"
  value       = google_compute_instance.web.self_link
}

output "public_ip_address" {
  description = "Public IPv4 address assigned to the web server"
  value       = google_compute_address.web.address
}

output "internal_ip" {
  description = "Internal IPv4 address of the instance"
  value       = google_compute_instance.web.network_interface[0].network_ip
}

output "machine_type" {
  description = "The GCP machine type that was provisioned"
  value       = google_compute_instance.web.machine_type
}

output "zone" {
  description = "GCP zone the instance was deployed into"
  value       = google_compute_instance.web.zone
}
