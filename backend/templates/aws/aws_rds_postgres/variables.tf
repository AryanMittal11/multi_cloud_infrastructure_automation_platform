variable "db_name" {
  description = "Name for the database and RDS instance identifier"
  type        = string
  default     = "appdb"
}

variable "db_username" {
  description = "Master username for PostgreSQL database administrator"
  type        = string
  default     = "postgresadmin"
}

variable "db_password" {
  description = "Master database password (leave empty to generate securely)"
  type        = string
  default     = ""
  sensitive   = true
}

variable "postgres_version" {
  description = "Major/minor PostgreSQL engine version"
  type        = string
  default     = "15.4"
}

variable "db_instance_class" {
  description = "Compute instance tier for the RDS instance"
  type        = string
  default     = "db.t3.micro"
}

variable "allocated_storage" {
  description = "Allocated baseline storage capacity in Gigabytes"
  type        = number
  default     = 20
}

variable "max_allocated_storage" {
  description = "Maximum storage threshold for automated storage autoscaling in GB"
  type        = number
  default     = 100
}

variable "vpc_id" {
  description = "VPC ID where the database security group is created"
  type        = string
}

variable "subnet_ids" {
  description = "List of subnet IDs spanning at least two Availability Zones for the DB subnet group"
  type        = list(string)
}

variable "allowed_ingress_cidr" {
  description = "IPv4 CIDR block allowed to connect to port 5432"
  type        = string
  default     = "10.0.0.0/16"
}

variable "tags" {
  description = "Additional tags to apply to all resources"
  type        = map(string)
  default     = {}
}
