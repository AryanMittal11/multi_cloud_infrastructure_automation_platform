variable "instance_name" {
  description = "Name of the Cloud SQL instance (must be globally unique, lowercase)"
  type        = string
  default     = "platform-postgres"
}

variable "gcp_project_id" {
  description = "GCP project ID where the database will be created"
  type        = string
}

variable "network_self_link" {
  description = "Self-link of the VPC network used for private IP connectivity"
  type        = string
}

variable "manage_vpc_peering" {
  description = "Whether this module should create the Service Networking peering connection (set false if peering is managed elsewhere)"
  type        = bool
  default     = true
}

variable "database_name" {
  description = "Name of the application database created inside the instance"
  type        = string
  default     = "appdb"
}

variable "db_username" {
  description = "Application database username"
  type        = string
  default     = "postgresadmin"
}

variable "db_password" {
  description = "Application database password. Leave blank to generate a high-entropy cryptographically secure password"
  type        = string
  default     = ""
  sensitive   = true
}

variable "postgres_version" {
  description = "PostgreSQL engine major version"
  type        = string
  default     = "15"
}

variable "tier" {
  description = "Cloud SQL machine tier (compute + memory sizing)"
  type        = string
  default     = "db-f1-micro"
}

variable "region" {
  description = "GCP region where the instance will be deployed"
  type        = string
  default     = "us-east1"
}

variable "allocated_storage_gb" {
  description = "Initial storage capacity in GB"
  type        = number
  default     = 20
}

variable "disk_autoresize" {
  description = "Automatically increase storage when nearing capacity"
  type        = bool
  default     = true
}

variable "high_availability" {
  description = "Enable regional (multi-zone) high availability"
  type        = bool
  default     = false
}

variable "point_in_time_recovery" {
  description = "Enable point-in-time recovery from binary logs"
  type        = bool
  default     = true
}

variable "backup_retention_count" {
  description = "Number of automated backups to retain"
  type        = number
  default     = 7
}

variable "deletion_protection" {
  description = "Protect the instance from accidental deletion"
  type        = bool
  default     = false
}

variable "allowed_ingress_cidrs" {
  description = "CIDR blocks permitted to connect over the public path. Empty list restricts access to private IP only."
  type        = list(string)
  default     = []
}

variable "labels" {
  description = "User labels to apply to the instance"
  type        = map(string)
  default     = {}
}
