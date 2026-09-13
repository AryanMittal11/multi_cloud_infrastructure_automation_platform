variable "storage_name_prefix" {
  description = "Prefix for the storage account name (will be appended with random unique suffix)"
  type        = string
  default     = "multicloudstorage"
}

variable "container_name" {
  description = "Name of the blob container"
  type        = string
  default     = "application-data"
}

variable "resource_group_name" {
  description = "Name of the existing resource group hosting the storage account"
  type        = string
}

variable "location" {
  description = "Azure region where the storage account will be deployed"
  type        = string
  default     = "eastus"
}

variable "account_tier" {
  description = "Storage account performance tier"
  type        = string
  default     = "Standard"
}

variable "replication_type" {
  description = "Storage replication strategy (LRS, ZRS, GRS, RAGRS)"
  type        = string
  default     = "LRS"
}

variable "enable_versioning" {
  description = "Enable blob versioning for rollback and disaster recovery"
  type        = bool
  default     = true
}

variable "shared_access_key_enabled" {
  description = "Whether to allow shared key authorization (disable to enforce Azure AD-only access)"
  type        = bool
  default     = false
}

variable "tags" {
  description = "Additional tags to apply to all resources"
  type        = map(string)
  default     = {}
}
