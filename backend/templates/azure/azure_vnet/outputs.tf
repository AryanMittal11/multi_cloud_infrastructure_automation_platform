output "resource_group_name" {
  description = "Name of the resource group hosting the network stack"
  value       = azurerm_resource_group.network.name
}

output "vnet_id" {
  description = "Resource ID of the Virtual Network"
  value       = azurerm_virtual_network.vnet.id
}

output "vnet_name" {
  description = "Name of the Virtual Network"
  value       = azurerm_virtual_network.vnet.name
}

output "vnet_address_space" {
  description = "Effective address space of the Virtual Network"
  value       = azurerm_virtual_network.vnet.address_space
}

output "public_subnet_id" {
  description = "Resource ID of the public (workload-facing) subnet"
  value       = azurerm_subnet.public.id
}

output "private_subnet_id" {
  description = "Resource ID of the private (database / internal) subnet"
  value       = azurerm_subnet.private.id
}

output "nsg_id" {
  description = "Resource ID of the default Network Security Group"
  value       = azurerm_network_security_group.default.id
}

output "location" {
  description = "Azure region the network stack was deployed into"
  value       = azurerm_resource_group.network.location
}
