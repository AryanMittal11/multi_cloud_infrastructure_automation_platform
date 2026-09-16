terraform {
  required_version = ">= 1.5.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

# 1. Lookup Latest Amazon Linux 2023 AMI
data "aws_ami" "amazon_linux" {
  most_recent = true
  owners      = ["amazon"]

  filter {
    name   = "name"
    values = ["al2023-ami-2023.*-x86_64"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}

# 2. Security Group for Web Application
resource "aws_security_group" "web" {
  name        = "${var.server_name}-sg"
  description = "Managed security group for ${var.server_name} web server"
  vpc_id      = var.vpc_id != "" ? var.vpc_id : null

  # Ingress HTTP
  ingress {
    description = "Allow inbound HTTP"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # Ingress HTTPS
  ingress {
    description = "Allow inbound HTTPS"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # Ingress SSH (Guarded: only allowed if specific CIDR is passed, default empty)
  dynamic "ingress" {
    for_each = var.allowed_ssh_cidr != "" ? [var.allowed_ssh_cidr] : []
    content {
      description = "Restricted administrative SSH access"
      from_port   = 22
      to_port     = 22
      protocol    = "tcp"
      cidr_blocks = [ingress.value]
    }
  }

  # Egress Outbound All
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
      Name      = "${var.server_name}-sg"
      ManagedBy = "MultiCloudPlatform"
    }
  )
}

# 3. EC2 Instance
resource "aws_instance" "web" {
  ami           = data.aws_ami.amazon_linux.id
  instance_type = var.instance_type
  subnet_id     = var.subnet_id != "" ? var.subnet_id : null

  vpc_security_group_ids = [aws_security_group.web.id]

  root_block_device {
    volume_size           = var.allocated_storage_gb
    volume_type           = "gp3"
    encrypted             = true
    delete_on_termination = true
  }

  user_data = <<-EOF
              #!/bin/bash
              dnf update -y
              dnf install -y nginx
              systemctl start nginx
              systemctl enable nginx
              cat <<HTML > /usr/share/nginx/html/index.html
              <!DOCTYPE html>
              <html>
              <head>
                <title>${var.server_name} - Multi-Cloud Automation</title>
                <style>
                  body { font-family: -apple-system, sans-serif; background: #0f172a; color: #f8fafc; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
                  .card { background: #1e293b; padding: 2.5rem; border-radius: 1rem; border: 1px solid #334155; text-align: center; max-width: 500px; box-shadow: 0 10px 25px rgba(0,0,0,0.5); }
                  h1 { color: #38bdf8; margin-bottom: 0.5rem; }
                  p { color: #94a3b8; line-height: 1.6; }
                  .badge { display: inline-block; background: #0284c7; color: white; padding: 0.25rem 0.75rem; border-radius: 9999px; font-size: 0.85rem; font-weight: 600; margin-top: 1rem; }
                </style>
              </head>
              <body>
                <div class="card">
                  <h1>Multi-Cloud Platform</h1>
                  <p>Server <strong>${var.server_name}</strong> successfully provisioned on <strong>AWS EC2</strong>.</p>
                  <p>Instance Type: <code>${var.instance_type}</code></p>
                  <span class="badge">Active &bull; Operational</span>
                </div>
              </body>
              </html>
              HTML
              EOF

  tags = merge(
    var.tags,
    {
      Name      = var.server_name
      Role      = "WebServer"
      ManagedBy = "MultiCloudPlatform"
    }
  )
}

# 4. Elastic IP Association
resource "aws_eip" "web" {
  instance = aws_instance.web.id
  domain   = "vpc"

  tags = merge(
    var.tags,
    {
      Name      = "${var.server_name}-eip"
      ManagedBy = "MultiCloudPlatform"
    }
  )
}
