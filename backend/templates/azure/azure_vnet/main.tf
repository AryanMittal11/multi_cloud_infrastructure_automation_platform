terraform {
  required_version = ">= 1.5.0"
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.0"
    }
  }
}

resource "random_string" "suffix" {
  length  = 6
  special = false
  upper   = false
}

locals {
  resource_group_name = "rg-${var.vnet_name}-${random_string.suffix.result}"
}

# 1. Resource Group hosting the network stack
resource "azurerm_resource_group" "network" {
  name     = local.resource_group_name
  location = var.location

  tags = merge(
    var.tags,
    {
      Environment = var.environment_name
      ManagedBy   = "MultiCloudPlatform"
    }
  )
}

# 2. Virtual Network with public & private subnets
resource "azurerm_virtual_network" "vnet" {
  name                = "${var.vnet_name}-vnet"
  address_space       = [var.vnet_address_space]
  location            = azurerm_resource_group.network.location
  resource_group_name = azurerm_resource_group.network.name

  tags = merge(
    var.tags,
    {
      Name        = "${var.vnet_name}-vnet"
      Environment = var.environment_name
      ManagedBy   = "MultiCloudPlatform"
    }
  )
}

# 3. Public Subnet (workload-facing)
resource "azurerm_subnet" "public" {
  name                 = "${var.vnet_name}-public-subnet"
  resource_group_name  = azurerm_resource_group.network.name
  virtual_network_name = azurerm_virtual_network.vnet.name
  address_prefixes     = [var.public_subnet_cidr]
}

# 4. Private Subnet (database / internal tier)
resource "azurerm_subnet" "private" {
  name                 = "${var.vnet_name}-private-subnet"
  resource_group_name  = azurerm_resource_group.network.name
  virtual_network_name = azurerm_virtual_network.vnet.name
  address_prefixes     = [var.private_subnet_cidr]
}

# 5. Deny-by-default Network Security Group
resource "azurerm_network_security_group" "default" {
  name                = "${var.vnet_name}-nsg"
  location            = azurerm_resource_group.network.location
  resource_group_name = azurerm_resource_group.network.name

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

  # Guarded administrative SSH access: only created when an explicit allowed CIDR is provided
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

  # Default inbound deny (implicit in Azure, made explicit for auditability)
  security_rule {
    name                       = "DenyAllInbound"
    priority                   = 4096
    direction                  = "Inbound"
    access                     = "Deny"
    protocol                   = "*"
    source_port_range          = "*"
    destination_port_range     = "*"
    source_address_prefix      = "*"
    destination_address_prefix = "*"
  }

  tags = merge(
    var.tags,
    {
      Name      = "${var.vnet_name}-nsg"
      ManagedBy = "MultiCloudPlatform"
    }
  )
}

# 6. Associate NSG with the public subnet
resource "azurerm_subnet_network_security_group_association" "public" {
  subnet_id                 = azurerm_subnet.public.id
  network_security_group_id = azurerm_network_security_group.default.id
}

# 7. Internal route table routing private subnet egress through the VNet (no forced tunneling by default)
resource "azurerm_route_table" "private" {
  name                = "${var.vnet_name}-private-rt"
  location            = azurerm_resource_group.network.location
  resource_group_name = azurerm_resource_group.network.name

  route {
    name           = "internal-egress"
    address_prefix = "0.0.0.0/0"
    next_hop_type  = "Internet"
  }

  tags = merge(
    var.tags,
    {
      Name      = "${var.vnet_name}-private-rt"
      ManagedBy = "MultiCloudPlatform"
    }
  )
}

resource "azurerm_subnet_route_table_association" "private" {
  subnet_id      = azurerm_subnet.private.id
  route_table_id = azurerm_route_table.private.id
}
