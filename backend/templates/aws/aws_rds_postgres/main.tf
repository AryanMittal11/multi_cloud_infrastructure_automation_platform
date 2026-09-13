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

# 1. Generate Master Database Password if not explicitly provided
resource "random_password" "db_master_password" {
  length           = 20
  special          = true
  override_special = "!#$%&*()-_=+[]{}<>:?"
}

locals {
  db_password = var.db_password != "" ? var.db_password : random_password.db_master_password.result
}

# 2. Database Subnet Group
resource "aws_db_subnet_group" "db" {
  name        = "${var.db_name}-subnet-group"
  description = "Database subnet group for ${var.db_name}"
  subnet_ids  = var.subnet_ids

  tags = merge(
    var.tags,
    {
      Name      = "${var.db_name}-subnet-group"
      ManagedBy = "MultiCloudPlatform"
    }
  )
}

# 3. Database Security Group
resource "aws_security_group" "db" {
  name        = "${var.db_name}-db-sg"
  description = "Security group for ${var.db_name} RDS PostgreSQL database"
  vpc_id      = var.vpc_id

  ingress {
    description = "Allow inbound PostgreSQL traffic"
    from_port   = 5432
    to_port     = 5432
    protocol    = "tcp"
    cidr_blocks = [var.allowed_ingress_cidr]
  }

  egress {
    description = "Allow outbound traffic"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(
    var.tags,
    {
      Name      = "${var.db_name}-db-sg"
      ManagedBy = "MultiCloudPlatform"
    }
  )
}

# 4. Amazon RDS PostgreSQL Database Instance
resource "aws_db_instance" "postgres" {
  identifier           = var.db_name
  engine               = "postgres"
  engine_version       = var.postgres_version
  instance_class       = var.db_instance_class
  allocated_storage    = var.allocated_storage
  max_allocated_storage = var.max_allocated_storage
  storage_type         = "gp3"
  storage_encrypted    = true

  db_name  = var.db_name
  username = var.db_username
  password = local.db_password

  db_subnet_group_name   = aws_db_subnet_group.db.name
  vpc_security_group_ids = [aws_security_group.db.id]

  skip_final_snapshot     = true
  deletion_protection     = false
  publicly_accessible     = false
  backup_retention_period = 7

  tags = merge(
    var.tags,
    {
      Name      = var.db_name
      ManagedBy = "MultiCloudPlatform"
    }
  )
}
