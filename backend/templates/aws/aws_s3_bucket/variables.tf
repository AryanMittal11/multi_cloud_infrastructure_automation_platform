variable "bucket_name_prefix" {
  description = "Prefix for the S3 bucket name (will be appended with random unique suffix)"
  type        = string
  default     = "multicloud-storage"
}

variable "enable_versioning" {
  description = "Enable object versioning for rollback and disaster recovery"
  type        = bool
  default     = false
}

variable "force_destroy" {
  description = "Allow bucket destruction even if it contains objects (useful for dev/test environments)"
  type        = bool
  default     = true
}

variable "tags" {
  description = "Additional tags to apply to all resources"
  type        = map(string)
  default     = {}
}
