variable "server_name" {
  description = "Name prefix applied to the VM, NIC, public IP, and NSG"
  type        = string
  default     = "web-frontend"
}

variable "resource_group_name" {
  description = "Name of the existing resource group hosting the VM stack"
  type        = string
}

variable "subnet_id" {
  description = "Resource ID of the subnet the VM NIC attaches to"
  type        = string
}

variable "location" {
  description = "Azure region where the VM resources will be deployed"
  type        = string
  default     = "eastus"
}

variable "vm_size" {
  description = "Azure VM compute tier sizing"
  type        = string
  default     = "Standard_B1s"
}

variable "allocated_storage_gb" {
  description = "OS disk storage capacity in Gigabytes"
  type        = number
  default     = 30
}

variable "admin_username" {
  description = "Administrator login name for the Linux VM"
  type        = string
  default     = "azureadmin"
}

variable "admin_ssh_public_key" {
  description = "SSH public key authorized for VM administrative access"
  type        = string
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
