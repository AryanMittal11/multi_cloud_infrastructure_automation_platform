output "instance_id" {
  description = "The EC2 instance identifier"
  value       = aws_instance.web.id
}

output "public_ip" {
  description = "Public Elastic IP address of the instance"
  value       = aws_eip.web.public_ip
}

output "public_dns" {
  description = "Public DNS hostname of the Elastic IP"
  value       = aws_eip.web.public_dns
}

output "security_group_id" {
  description = "Security Group ID attached to the instance"
  value       = aws_security_group.web.id
}

output "web_url" {
  description = "Direct HTTP access URL for the provisioned web server"
  value       = "http://${aws_eip.web.public_ip}"
}
