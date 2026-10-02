output "cosmos_id" {
  description = "ID of the Cosmos DB account"
  value       = azurerm_cosmosdb_account.cosmos.id
}

output "endpoint" {
  description = "Endpoint of the Cosmos DB account"
  value       = azurerm_cosmosdb_account.cosmos.endpoint
}
