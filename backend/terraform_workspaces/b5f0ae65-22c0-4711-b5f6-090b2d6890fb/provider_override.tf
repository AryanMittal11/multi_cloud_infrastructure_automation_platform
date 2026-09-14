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
      PlatformDeploymentId = "b5f0ae65-22c0-4711-b5f6-090b2d6890fb"
      ManagedBy            = "MultiCloudPlatform"
    }
  }
}