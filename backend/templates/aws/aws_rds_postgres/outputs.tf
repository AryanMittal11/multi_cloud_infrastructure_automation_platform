output "db_endpoint" {
  description = "The connection endpoint in host:port format"
  value       = aws_db_instance.postgres.endpoint
}

output "db_host" {
  description = "The hostname of the database instance"
  value       = aws_db_instance.postgres.address
}

output "db_port" {
  description = "The database port"
  value       = aws_db_instance.postgres.port
}

output "db_name" {
  description = "The database name"
  value       = aws_db_instance.postgres.db_name
}

output "db_username" {
  description = "The master username"
  value       = aws_db_instance.postgres.username
}

output "db_instance_id" {
  description = "The RDS instance identifier"
  value       = aws_db_instance.postgres.id
}

output "db_arn" {
  description = "The Amazon Resource Name (ARN) of the database"
  value       = aws_db_instance.postgres.arn
}
