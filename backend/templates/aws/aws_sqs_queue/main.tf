terraform {
  required_version = ">= 1.5.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

resource "aws_sqs_queue" "queue" {
  name                      = var.queue_name
  delay_seconds             = var.delay_seconds
  max_message_size          = 262144
  message_retention_seconds = var.message_retention_seconds
  receive_wait_time_seconds = var.receive_wait_time_seconds
  sqs_managed_sse_enabled   = true

  tags = merge(
    var.tags,
    {
      Name      = var.queue_name
      ManagedBy = "MultiCloudPlatform"
    }
  )
}
