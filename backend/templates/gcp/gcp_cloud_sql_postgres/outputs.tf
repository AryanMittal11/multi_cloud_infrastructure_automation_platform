output "instance_id" {
  description = "Resource ID of the Cloud SQL instance"
  value       = google_sql_database_instance.postgres.id
}

output "instance_name" {
  description = "Name of the Cloud SQL instance"
  value       = google_sql_database_instance.postgres.name
}

output "connection_name" {
  description = "Cloud SQL connection name for Cloud SQL Auth proxy clients"
  value       = google_sql_database_instance.postgres.connection_name
}

output "private_ip_address" {
  description = "Private IPv4 address of the database endpoint"
  value       = google_sql_database_instance.postgres.private_ip_address
}

output "public_ip_address" {
  description = "Public IPv4 address (only assigned if authorized networks are configured)"
  value       = google_sql_database_instance.postgres.public_ip_address
}

output "database_endpoint" {
  description = "Normalized database connection endpoint for platform resource descriptors"
  value       = coalesce(google_sql_database_instance.postgres.private_ip_address, google_sql_database_instance.postgres.public_ip_address)
}

output "database_name" {
  description = "Name of the application database"
  value       = google_sql_database.database.name
}

output "administrator_username" {
  description = "Application database username"
  value       = google_sql_user.app_user.name
}

output "postgres_version" {
  description = "PostgreSQL engine version in use"
  value       = google_sql_database_instance.postgres.database_version
}
