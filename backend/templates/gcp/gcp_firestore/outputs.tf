output "database_id" {
  description = "The Firestore database identifier"
  value       = google_firestore_database.database.name
}

output "location_id" {
  description = "The Firestore region"
  value       = google_firestore_database.database.location_id
}
