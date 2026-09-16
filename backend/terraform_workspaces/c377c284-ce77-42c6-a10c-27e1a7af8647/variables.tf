variable "server_name" {
  description = "Name tag and hostname for the web server"
  type        = string
  default     = "web-frontend"
}

variable "instance_type" {
  description = "EC2 instance compute tier (e.g. t3.micro, t3.small, t3.medium)"
  type        = string
  default     = "t3.micro"
}

variable "allocated_storage_gb" {
  description = "Root gp3 EBS block storage volume size in GB"
  type        = number
  default     = 20
}

variable "vpc_id" {
  description = "VPC ID where the security group will be created (leave empty to use default VPC)"
  type        = string
  default     = ""
}

variable "subnet_id" {
  description = "Subnet ID where the instance will be launched (leave empty for default subnet)"
  type        = string
  default     = ""
}

variable "allowed_ssh_cidr" {
  description = "CIDR block permitted for SSH access (leave empty to disallow SSH for security)"
  type        = string
  default     = ""
}

variable "tags" {
  description = "Additional tags to apply to all resources"
  type        = map(string)
  default     = {}
}
