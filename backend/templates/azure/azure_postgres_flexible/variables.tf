variable "server_name" {
  description = "Name of the PostgreSQL Flexible Server (must be globally unique, lowercase)"
  type        = string
  default     = "platform-postgres"
}

variable "resource_group_name" {
  description = "Name of the existing resource group hosting the database"
  type        = string
}

variable "vnet_id" {
  description = "Resource ID of the Virtual Network used for private DNS resolution"
  type        = string
}

variable "location" {
  description = "Azure region where the database will be deployed"
  type        = string
  default     = "eastus"
}

variable "postgres_version" {
  description = "PostgreSQL engine major version"
  type        = string
  default     = "15"
}

variable "sku_name" {
  description = "Azure Flexible Server SKU (compute + tier)"
  type        = string
  default     = "B_Standard_B1ms"
}

variable "storage_mb" {
  description = "Maximum storage capacity in Megabytes"
  type        = number
  default     = 32768
}

variable "storage_tier" {
  description = "Managed disk storage tier (leave blank for platform default)"
  type        = string
  default     = ""
}

variable "admin_username" {
  description = "Administrator login name for the PostgreSQL server"
  type        = string
  default     = "postgresadmin"
}

variable "admin_password" {
  description = "Administrator password. Leave blank to generate a high-entropy cryptographically secure password"
  type        = string
  default     = ""
  sensitive   = true
}

variable "availability_zone" {
  description = "Availability zone in which to provision the server"
  type        = string
  default     = "1"
}

variable "backup_retention_days" {
  description = "Number of days to retain automated backups"
  type        = number
  default     = 7
}

variable "geo_redundant_backup" {
  description = "Whether to replicate backups to a paired region for disaster recovery"
  type        = bool
  default     = false
}

variable "allowed_ingress_cidr" {
  description = "CIDR block permitted to connect to PostgreSQL port 5432. Leave blank to allow only private network access."
  type        = string
  default     = ""
}

variable "tags" {
  description = "Additional tags to apply to all resources"
  type        = map(string)
  default     = {}
}
