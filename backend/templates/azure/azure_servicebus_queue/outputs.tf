output "queue_id" {
  description = "ID of the Service Bus Queue"
  value       = azurerm_servicebus_queue.queue.id
}

output "namespace_name" {
  description = "Name of the parent Service Bus Namespace"
  value       = azurerm_servicebus_namespace.sb.name
}
