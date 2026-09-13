output "bucket_id" {
  description = "The globally unique name/ID of the S3 bucket"
  value       = aws_s3_bucket.bucket.id
}

output "bucket_arn" {
  description = "The Amazon Resource Name (ARN) of the bucket"
  value       = aws_s3_bucket.bucket.arn
}

output "bucket_domain_name" {
  description = "The FQDN bucket domain name"
  value       = aws_s3_bucket.bucket.bucket_domain_name
}

output "bucket_region" {
  description = "The AWS region where the bucket is hosted"
  value       = aws_s3_bucket.bucket.region
}
