output "lb_id" {
  description = "ID of the Load Balancer"
  value       = azurerm_lb.lb.id
}

output "public_ip" {
  description = "Public IP address allocated for the load balancer frontend"
  value       = azurerm_public_ip.lb_ip.ip_address
}
