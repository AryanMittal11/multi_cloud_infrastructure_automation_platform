variable "vnet_name" {
  description = "Name prefix applied to the VNet, subnets, and NSG resources"
  type        = string
  default     = "platform-network"
}

variable "environment_name" {
  description = "Logical environment identifier applied to resource tags"
  type        = string
  default     = "development"
}

variable "location" {
  description = "Azure region where the network resources will be deployed"
  type        = string
  default     = "eastus"
}

variable "vnet_address_space" {
  description = "IPv4 address space for the Virtual Network (CIDR)"
  type        = string
  default     = "10.1.0.0/16"
}

variable "public_subnet_cidr" {
  description = "CIDR block for the public (workload-facing) subnet"
  type        = string
  default     = "10.1.1.0/24"
}

variable "private_subnet_cidr" {
  description = "CIDR block for the private (database / internal) subnet"
  type        = string
  default     = "10.1.2.0/24"
}

variable "allowed_ssh_cidr" {
  description = "Permitted IPv4 CIDR for administrative SSH access. Leave blank to disable inbound SSH."
  type        = string
  default     = ""
}

variable "tags" {
  description = "Additional tags to apply to all resources"
  type        = map(string)
  default     = {}
}
