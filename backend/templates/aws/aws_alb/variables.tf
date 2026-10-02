variable "alb_name" {
  description = "Name of the Application Load Balancer"
  type        = string
  default     = "app-ingress-alb"
}

variable "vpc_id" {
  description = "VPC ID where the ALB and Target Group reside"
  type        = string
  default     = ""
}

variable "subnet_ids" {
  description = "Public subnet IDs where the ALB is provisioned"
  type        = list(string)
  default     = []
}

variable "tags" {
  description = "Resource tags"
  type        = map(string)
  default     = {}
}
