output "vpc_id" {
  description = "Resource ID of the VPC network"
  value       = google_compute_network.vpc.id
}

output "vpc_name" {
  description = "Name of the VPC network"
  value       = google_compute_network.vpc.name
}

output "network_self_link" {
  description = "Self-link URI of the VPC network"
  value       = google_compute_network.vpc.self_link
}

output "public_subnet_id" {
  description = "Resource ID of the public (workload-facing) subnetwork"
  value       = google_compute_subnetwork.public.id
}

output "public_subnet_self_link" {
  description = "Self-link URI of the public subnetwork"
  value       = google_compute_subnetwork.public.self_link
}

output "private_subnet_id" {
  description = "Resource ID of the private (database / internal) subnetwork"
  value       = google_compute_subnetwork.private.id
}

output "private_subnet_self_link" {
  description = "Self-link URI of the private subnetwork"
  value       = google_compute_subnetwork.private.self_link
}

output "nat_router_name" {
  description = "Name of the Cloud Router providing NAT egress"
  value       = google_compute_router.nat_router.name
}

output "region" {
  description = "GCP region the network stack was deployed into"
  value       = var.region
}
