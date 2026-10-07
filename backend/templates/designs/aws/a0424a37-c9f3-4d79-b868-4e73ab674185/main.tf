# ==============================================================================
# Architecture Design: Dual EC2 Web Hosting
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

module "app_server_1" {
  source = "../../templates/aws/aws_ec2_web"

  instance_type = "t3.medium"
}
module "app_server_2" {
  source = "../../templates/aws/aws_ec2_web"

  instance_type = "t3.medium"
}
