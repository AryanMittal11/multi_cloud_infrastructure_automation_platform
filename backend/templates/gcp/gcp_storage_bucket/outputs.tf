output "bucket_name" {
  description = "Globally unique name of the storage bucket"
  value       = google_storage_bucket.bucket.name
}

output "bucket_url" {
  description = "URI of the bucket (gs:// format)"
  value       = google_storage_bucket.bucket.url
}

output "storage_uri" {
  description = "Normalized storage URI for platform resource descriptors"
  value       = google_storage_bucket.bucket.url
}

output "self_link" {
  description = "Self-link URI of the bucket"
  value       = google_storage_bucket.bucket.self_link
}

output "location" {
  description = "GCP location the bucket was deployed into"
  value       = google_storage_bucket.bucket.location
}

output "storage_class" {
  description = "Default storage class of the bucket"
  value       = google_storage_bucket.bucket.storage_class
}
