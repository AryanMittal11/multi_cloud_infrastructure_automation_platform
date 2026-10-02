variable "function_name" {
  description = "Name of the Cloud Function"
  type        = string
  default     = "cloud-gcp-func"
}

variable "region" {
  description = "GCP Region"
  type        = string
  default     = "us-central1"
}

variable "runtime" {
  description = "Runtime environment"
  type        = string
  default     = "nodejs18"
}

variable "memory_mb" {
  description = "Memory allocated for function"
  type        = number
  default     = 256
}

variable "labels" {
  description = "Resource labels"
  type        = map(string)
  default     = {}
}
