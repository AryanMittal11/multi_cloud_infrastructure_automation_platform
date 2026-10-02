variable "lb_name" {
  description = "Name of the Azure Load Balancer"
  type        = string
  default     = "ingress-load-balancer"
}

variable "resource_group_name" {
  description = "Target Resource Group Name"
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
