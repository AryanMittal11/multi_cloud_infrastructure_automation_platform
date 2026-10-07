terraform {
  required_version = ">= 1.5.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.5"
    }
  }
}

resource "random_string" "suffix" {
  length  = 6
  special = false
  upper   = false
}

locals {
  alb_base = substr(replace(lower(var.alb_name), "_", "-"), 0, 24)
  unique_alb_name = "${local.alb_base}-${random_string.suffix.result}"
}

resource "aws_security_group" "alb_sg" {
  name        = "${local.unique_alb_name}-sg"
  description = "Security group for application load balancer"
  vpc_id      = var.vpc_id

  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
    description = "HTTP Public Ingress"
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
    description = "Allow all outbound traffic"
  }

  tags = merge(
    var.tags,
    {
      Name      = "${local.unique_alb_name}-sg"
      ManagedBy = "MultiCloudPlatform"
    }
  )
}

resource "aws_lb" "alb" {
  name               = local.unique_alb_name
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb_sg.id]
  subnets            = var.subnet_ids

  enable_deletion_protection = false

  tags = merge(
    var.tags,
    {
      Name      = local.unique_alb_name
      ManagedBy = "MultiCloudPlatform"
    }
  )
}

resource "aws_lb_target_group" "tg" {
  name        = "${substr(local.unique_alb_name, 0, 28)}-tg"
  port        = 80
  protocol    = "HTTP"
  vpc_id      = var.vpc_id
  target_type = "instance"

  health_check {
    path                = "/"
    protocol            = "HTTP"
    matcher             = "200-399"
    interval            = 30
    timeout             = 5
    healthy_threshold   = 2
    unhealthy_threshold = 3
  }

  tags = merge(
    var.tags,
    {
      Name      = "${substr(local.unique_alb_name, 0, 28)}-tg"
      ManagedBy = "MultiCloudPlatform"
    }
  )
}

resource "aws_lb_listener" "http" {
  load_balancer_arn = aws_lb.alb.arn
  port              = 80
  protocol          = "HTTP"

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.tg.arn
  }
}
