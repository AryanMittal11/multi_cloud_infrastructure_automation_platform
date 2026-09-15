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

# Authentication is injected via AWS_* environment variables by the worker.
provider "aws" {
  region = "us-east-1"
  default_tags {
    tags = {
      PlatformDeploymentId = "47e57710-f13e-45dc-beba-e8f24743c2e7"
      ManagedBy            = "MultiCloudPlatform"
    }
  }
}