variable "account_name" {
  description = "Globally unique Cosmos DB account name"
  type        = string
  default     = "az-cosmos-nosql"
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
