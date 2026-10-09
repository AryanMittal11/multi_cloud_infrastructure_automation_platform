# ==============================================================================
# Architecture Design: Secure S3 Storage Bucket
# Generated dynamically by Multi-Cloud Infrastructure Automation Platform
# Resources: 1 | Links: 0
# ==============================================================================

terraform {
  required_version = ">= 1.5.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.5"
    }
  }
}

module "secure_s3_bucket" {
  source = "../../templates/aws/aws_s3_bucket"

  encryption_enabled = "true"
  versioning_enabled = "true"
  public_access_block = "true"
}
