variable "gcp_project_id" {
  description = "GCP project ID where network resources will be created"
  type        = string
}

variable "environment_name" {
  description = "Logical environment identifier applied to resource names"
  type        = string
  default     = "development"
}

variable "region" {
  description = "GCP region where the network resources will be deployed"
  type        = string
  default     = "us-east1"
}

variable "public_subnet_cidr" {
  description = "CIDR range for the public (workload-facing) subnetwork"
  type        = string
  default     = "10.2.1.0/24"
}

variable "private_subnet_cidr" {
  description = "CIDR range for the private (database / internal) subnetwork"
  type        = string
  default     = "10.2.2.0/24"
}

variable "pods_secondary_cidr" {
  description = "Secondary CIDR range for Kubernetes pods (VPC-native interoperability)"
  type        = string
  default     = "10.3.0.0/16"
}

variable "services_secondary_cidr" {
  description = "Secondary CIDR range for Kubernetes services (VPC-native interoperability)"
  type        = string
  default     = "10.4.0.0/20"
}

variable "enable_private_nat" {
  description = "Route only the private subnet through Cloud NAT (true) or all subnetworks (false)"
  type        = bool
  default     = true
}

variable "allowed_ssh_cidrs" {
  description = "List of permitted IPv4 CIDR blocks for administrative SSH access. Empty list disables inbound SSH."
  type        = list(string)
  default     = []
}

variable "tags" {
  description = "Network-level tags applied to the VPC"
  type        = map(string)
  default     = {}
}
