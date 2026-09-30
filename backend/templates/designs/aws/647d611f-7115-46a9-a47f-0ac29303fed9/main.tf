# ==============================================================================
# Architecture Design: 2ec2 instances
# Generated dynamically by Multi-Cloud Infrastructure Automation Platform
# Resources: 2 | Links: 0
# ==============================================================================

terraform {
  required_version = ">= 1.5.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

module "compute_01" {
  source = "../../templates/aws/aws_ec2_web"

  server_name = "web-frontend-v11"
}
module "compute_02" {
  source = "../../templates/aws/aws_ec2_web"

  server_name = "web-frontend-v12"
}
