terraform {
  required_version = ">= 1.5.0"
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.0"
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
  vm_name = "${var.server_name}-${random_string.suffix.result}"
}

# 1. Network Interface bound to the provided subnet
resource "azurerm_network_interface" "web" {
  name                = "${local.vm_name}-nic"
  location            = var.location
  resource_group_name = var.resource_group_name

  ip_configuration {
    name                          = "internal"
    subnet_id                     = var.subnet_id
    private_ip_address_allocation = "Dynamic"
    public_ip_address_id          = azurerm_public_ip.web.id
  }

  tags = merge(
    var.tags,
    {
      Name      = "${local.vm_name}-nic"
      ManagedBy = "MultiCloudPlatform"
    }
  )
}

# 2. Public IP address for the web server
resource "azurerm_public_ip" "web" {
  name                = "${local.vm_name}-pip"
  location            = var.location
  resource_group_name = var.resource_group_name
  allocation_method   = "Static"
  sku                 = "Standard"

  tags = merge(
    var.tags,
    {
      Name      = "${local.vm_name}-pip"
      ManagedBy = "MultiCloudPlatform"
    }
  )
}

# 3. Guarded Security Group: HTTP/HTTPS open, SSH only when explicitly restricted
resource "azurerm_network_security_group" "web" {
  name                = "${local.vm_name}-nsg"
  location            = var.location
  resource_group_name = var.resource_group_name

  security_rule {
    name                       = "AllowHTTPInbound"
    priority                   = 100
    direction                  = "Inbound"
    access                     = "Allow"
    protocol                   = "Tcp"
    source_port_range          = "*"
    destination_port_range     = "80"
    source_address_prefix      = "*"
    destination_address_prefix = "*"
  }

  security_rule {
    name                       = "AllowHTTPSInbound"
    priority                   = 110
    direction                  = "Inbound"
    access                     = "Allow"
    protocol                   = "Tcp"
    source_port_range          = "*"
    destination_port_range     = "443"
    source_address_prefix      = "*"
    destination_address_prefix = "*"
  }

  dynamic "security_rule" {
    for_each = var.allowed_ssh_cidr != "" ? [var.allowed_ssh_cidr] : []
    content {
      name                       = "AllowRestrictedSSH"
      priority                   = 120
      direction                  = "Inbound"
      access                     = "Allow"
      protocol                   = "Tcp"
      source_port_range          = "*"
      destination_port_range     = "22"
      source_address_prefix      = security_rule.value
      destination_address_prefix = "*"
    }
  }

  tags = merge(
    var.tags,
    {
      Name      = "${local.vm_name}-nsg"
      ManagedBy = "MultiCloudPlatform"
    }
  )
}

resource "azurerm_network_interface_security_group_association" "web" {
  network_interface_id      = azurerm_network_interface.web.id
  network_security_group_id = azurerm_network_security_group.web.id
}

# 4. Linux Virtual Machine with Nginx user-data (Custom Data) and encrypted OS disk
resource "azurerm_linux_virtual_machine" "web" {
  name                  = local.vm_name
  computer_name         = var.server_name
  resource_group_name   = var.resource_group_name
  location              = var.location
  size                  = var.vm_size
  admin_username        = var.admin_username
  network_interface_ids = [azurerm_network_interface.web.id]

  admin_ssh_key {
    username   = var.admin_username
    public_key = var.admin_ssh_public_key
  }

  os_disk {
    name                 = "${local.vm_name}-osdisk"
    caching              = "ReadWrite"
    storage_account_type = "Premium_LRS"
    disk_size_gb         = var.allocated_storage_gb
  }

  source_image_reference {
    publisher = "Canonical"
    offer     = "0001-com-ubuntu-server-jammy"
    sku       = "22_04-lts-gen2"
    version   = "latest"
  }

  custom_data = base64encode(<<-CLOUD_INIT
    #cloud-config
    package_update: true
    packages:
      - nginx
    runcmd:
      - systemctl start nginx
      - systemctl enable nginx
      - |
        cat > /var/www/html/index.html <<'HTML'
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
            <p>Server <strong>${var.server_name}</strong> successfully provisioned on <strong>Azure Linux VM</strong>.</p>
            <p>Instance Size: <code>${var.vm_size}</code></p>
            <span class="badge">Active &bull; Operational</span>
          </div>
        </body>
        </html>
        HTML
  CLOUD_INIT
  )

  tags = merge(
    var.tags,
    {
      Name      = local.vm_name
      Role      = "WebServer"
      ManagedBy = "MultiCloudPlatform"
    }
  )

  depends_on = [azurerm_network_interface_security_group_association.web]
}
