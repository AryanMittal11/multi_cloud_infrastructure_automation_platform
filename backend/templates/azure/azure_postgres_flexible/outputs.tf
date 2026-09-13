output "server_id" {
  description = "Resource ID of the PostgreSQL Flexible Server"
  value       = azurerm_postgresql_flexible_server.postgres.id
}

output "server_name" {
  description = "Name of the PostgreSQL Flexible Server"
  value       = azurerm_postgresql_flexible_server.postgres.name
}

output "fqdn" {
  description = "Fully qualified domain name of the database endpoint (private DNS zone)"
  value       = azurerm_postgresql_flexible_server.postgres.fqdn
}

output "database_endpoint" {
  description = "Normalized database connection endpoint for platform resource descriptors"
  value       = azurerm_postgresql_flexible_server.postgres.fqdn
}

output "administrator_username" {
  description = "Administrator login name"
  value       = azurerm_postgresql_flexible_server.postgres.administrator_login
}

output "postgres_version" {
  description = "PostgreSQL engine version in use"
  value       = azurerm_postgresql_flexible_server.postgres.version
}

output "storage_mb" {
  description = "Maximum provisioned storage in Megabytes"
  value       = azurerm_postgresql_flexible_server.postgres.storage_mb
}

output "private_dns_zone" {
  description = "Private DNS zone suffix used for name resolution"
  value       = azurerm_private_dns_zone.postgres.name
}
