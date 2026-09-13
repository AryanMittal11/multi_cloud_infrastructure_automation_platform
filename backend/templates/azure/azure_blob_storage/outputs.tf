output "storage_account_id" {
  description = "Resource ID of the storage account"
  value       = azurerm_storage_account.storage.id
}

output "storage_account_name" {
  description = "Globally unique name of the storage account"
  value       = azurerm_storage_account.storage.name
}

output "primary_blob_endpoint" {
  description = "Primary blob service endpoint URL"
  value       = azurerm_storage_account.storage.primary_blob_endpoint
}

output "storage_uri" {
  description = "Normalized storage URI for platform resource descriptors"
  value       = azurerm_storage_account.storage.primary_blob_endpoint
}

output "container_name" {
  description = "Name of the blob container"
  value       = azurerm_storage_container.container.name
}

output "container_url" {
  description = "Full URL of the blob container"
  value       = "${azurerm_storage_account.storage.primary_blob_endpoint}${azurerm_storage_container.container.name}"
}

output "location" {
  description = "Azure region the storage account was deployed into"
  value       = azurerm_storage_account.storage.location
}
