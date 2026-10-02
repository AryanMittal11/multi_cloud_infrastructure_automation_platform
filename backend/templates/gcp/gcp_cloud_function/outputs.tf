output "function_name" {
  description = "Name of the Cloud Function"
  value       = google_cloudfunctions_function.function.name
}

output "https_trigger_url" {
  description = "URL which triggers function execution"
  value       = google_cloudfunctions_function.function.https_trigger_url
}
