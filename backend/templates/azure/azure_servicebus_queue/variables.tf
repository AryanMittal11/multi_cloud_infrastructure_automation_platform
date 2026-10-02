variable "queue_name" {
  description = "Name of the Service Bus Queue"
  type        = string
  default     = "workload-jobs"
}

variable "resource_group_name" {
  description = "Resource Group Name"
  type        = string
  default     = "rg-multicloud-workloads"
}

variable "location" {
  description = "Azure Region"
  type        = string
  default     = "eastus"
}

variable "tags" {
  description = "Resource tags"
  type        = map(string)
  default     = {}
}
