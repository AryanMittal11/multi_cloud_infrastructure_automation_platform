variable "server_name" {
  description = "Name prefix applied to the instance, static IP, and firewall rules"
  type        = string
  default     = "web-frontend"
}

variable "gcp_project_id" {
  description = "GCP project ID where compute resources will be created"
  type        = string
}

variable "network_name" {
  description = "Name of the existing VPC network the instance attaches to"
  type        = string
}

variable "subnet_self_link" {
  description = "Self-link of the existing subnetwork the instance attaches to"
  type        = string
}

variable "zone" {
  description = "GCP zone in which to provision the instance"
  type        = string
  default     = "us-east1-b"
}

variable "region" {
  description = "GCP region for the reserved static IP"
  type        = string
  default     = "us-east1"
}

variable "machine_type" {
  description = "GCP machine type (compute tier sizing)"
  type        = string
  default     = "e2-micro"
}

variable "boot_image" {
  description = "Boot disk operating system image"
  type        = string
  default     = "ubuntu-os-cloud/ubuntu-2204-lts"
}

variable "allocated_storage_gb" {
  description = "Boot disk storage capacity in Gigabytes"
  type        = number
  default     = 20
}

variable "service_account_email" {
  description = "Service account email attached to the instance (leave blank for compute default)"
  type        = string
  default     = ""
}

variable "preemptible" {
  description = "Run the instance as preemptible (spot) for cost savings on ephemeral workloads"
  type        = bool
  default     = false
}

variable "allowed_ssh_cidrs" {
  description = "List of permitted IPv4 CIDR blocks for administrative SSH access. Empty list disables inbound SSH."
  type        = list(string)
  default     = []
}

variable "labels" {
  description = "Additional labels to apply to the instance"
  type        = map(string)
  default     = {}
}
