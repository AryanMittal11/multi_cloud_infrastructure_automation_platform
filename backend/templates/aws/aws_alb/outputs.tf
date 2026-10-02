output "alb_id" {
  description = "The ID of the Load Balancer"
  value       = aws_lb.alb.id
}

output "alb_arn" {
  description = "The ARN of the Load Balancer"
  value       = aws_lb.alb.arn
}

output "alb_dns_name" {
  description = "The public DNS name of the Load Balancer"
  value       = aws_lb.alb.dns_name
}

output "target_group_arn" {
  description = "The ARN of the default Target Group"
  value       = aws_lb_target_group.tg.arn
}
