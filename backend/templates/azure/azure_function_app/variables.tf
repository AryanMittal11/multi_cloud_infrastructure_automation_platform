variable "function_name" {
  description = "Name of the Azure Function App"
  type        = string
  default     = "cloud-az-func"
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
