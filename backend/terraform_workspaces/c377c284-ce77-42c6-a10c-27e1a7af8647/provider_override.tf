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
  region = "us-west-2"
  default_tags {
    tags = {
      PlatformDeploymentId = "c377c284-ce77-42c6-a10c-27e1a7af8647"
      ManagedBy            = "MultiCloudPlatform"
    }
  }
}