output "queue_id" {
  description = "Same as queue_url"
  value       = aws_sqs_queue.queue.id
}

output "queue_url" {
  description = "URL of the SQS queue"
  value       = aws_sqs_queue.queue.url
}

output "queue_arn" {
  description = "ARN of the SQS queue"
  value       = aws_sqs_queue.queue.arn
}
