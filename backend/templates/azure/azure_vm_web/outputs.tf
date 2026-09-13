output "vm_id" {
  description = "Resource ID of the Linux Virtual Machine"
  value       = azurerm_linux_virtual_machine.web.id
}

output "vm_name" {
  description = "Name of the Linux Virtual Machine"
  value       = azurerm_linux_virtual_machine.web.name
}

output "public_ip_address" {
  description = "Public IPv4 address assigned to the web server"
  value       = azurerm_public_ip.web.ip_address
}

output "private_ip_address" {
  description = "Private IPv4 address of the network interface"
  value       = azurerm_network_interface.web.private_ip_address
}

output "fqdn" {
  description = "Fully qualified domain name of the public IP (if allocated)"
  value       = azurerm_public_ip.web.fqdn
}

output "vm_size" {
  description = "The Azure VM compute tier that was provisioned"
  value       = azurerm_linux_virtual_machine.web.size
}
