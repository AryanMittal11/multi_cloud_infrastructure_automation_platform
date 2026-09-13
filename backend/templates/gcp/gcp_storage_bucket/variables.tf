variable "bucket_name_prefix" {
  description = "Prefix for the bucket name (will be appended with random unique suffix)"
  type        = string
  default     = "multicloud-storage"
}

variable "gcp_project_id" {
  description = "GCP project ID where the bucket will be created"
  type        = string
}

variable "location" {
  description = "GCP location (region or multi-region) where the bucket will be hosted"
  type        = string
  default     = "US"
}

variable "storage_class" {
  description = "Default storage class for objects (STANDARD, NEARLINE, COLDLINE, ARCHIVE)"
  type        = string
  default     = "STANDARD"
}

variable "enable_versioning" {
  description = "Enable object versioning for rollback and disaster recovery"
  type        = bool
  default     = true
}

variable "soft_delete_retention_days" {
  description = "Days to retain soft-deleted objects for recovery"
  type        = number
  default     = 7
}

variable "force_destroy" {
  description = "Allow bucket destruction even if it contains objects (useful for dev/test environments)"
  type        = bool
  default     = true
}

variable "enable_lifecycle_rules" {
  description = "Automatically tier objects to colder storage classes over time"
  type        = bool
  default     = true
}

variable "kms_key_name" {
  description = "Customer-managed encryption key (Cloud KMS) resource name. Leave blank for Google-managed encryption."
  type        = string
  default     = ""
}

variable "iam_readers" {
  description = "List of IAM members (e.g. serviceAccount:email, user:email) granted object read access"
  type        = list(string)
  default     = []
}

variable "create_healthcheck_object" {
  description = "Create a marker object used for platform health verification"
  type        = bool
  default     = false
}

variable "labels" {
  description = "Additional labels to apply to the bucket"
  type        = map(string)
  default     = {}
}
