output "function_app_id" {
  description = "ID of the Azure Function App"
  value       = azurerm_linux_function_app.function.id
}

output "default_hostname" {
  description = "Default hostname of the function app"
  value       = azurerm_linux_function_app.function.default_hostname
}
