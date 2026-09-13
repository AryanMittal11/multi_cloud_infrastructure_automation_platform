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

# 1. Generate master password if not explicitly provided
resource "random_password" "db_master_password" {
  length           = 24
  special          = true
  override_special = "!#$%&*()-_=+[]{}<>:?"
}

locals {
  admin_password = var.admin_password != "" ? var.admin_password : random_password.db_master_password.result
}

# 2. PostgreSQL Flexible Server with encrypted storage
resource "azurerm_postgresql_flexible_server" "postgres" {
  name                   = lower(var.server_name)
  resource_group_name    = var.resource_group_name
  location               = var.location
  version                = var.postgres_version
  administrator_login    = var.admin_username
  administrator_password = local.admin_password

  storage_mb   = var.storage_mb
  storage_tier = var.storage_tier != "" ? var.storage_tier : null

  sku_name   = var.sku_name
  zone       = var.availability_zone
  create_mode = "Default"

  # Encrypted at rest with platform-managed key (security invariant)
  # Public network access explicitly disabled unless an authorized CIDR is declared
  public_network_access_enabled = var.allowed_ingress_cidr != "" ? false : false

  backup_retention_days        = var.backup_retention_days
  geo_redundant_backup_enabled = var.geo_redundant_backup

  tags = merge(
    var.tags,
    {
      Name      = lower(var.server_name)
      ManagedBy = "MultiCloudPlatform"
    }
  )

  lifecycle {
    ignore_changes = [zone]
  }
}

# 3. Private DNS zone for internal name resolution
resource "azurerm_private_dns_zone" "postgres" {
  name                = "${var.server_name}.private.postgres.database.azure.com"
  resource_group_name = var.resource_group_name

  tags = merge(
    var.tags,
    {
      ManagedBy = "MultiCloudPlatform"
    }
  )
}

resource "azurerm_private_dns_zone_virtual_network_link" "postgres" {
  name                  = "${var.server_name}-dns-link"
  resource_group_name   = var.resource_group_name
  private_dns_zone_name = azurerm_private_dns_zone.postgres.name
  virtual_network_id    = var.vnet_id
  registration_enabled  = false

  tags = merge(
    var.tags,
    {
      ManagedBy = "MultiCloudPlatform"
    }
  )
}

# 4. Attach the server to the private DNS zone
resource "azurerm_postgresql_flexible_server_configuration" "dns_zone" {
  server_id = azurerm_postgresql_flexible_server.postgres.id
  name      = "private_dns_zone_suffix"
  value     = azurerm_private_dns_zone.postgres.name

  depends_on = [azurerm_private_dns_zone_virtual_network_link.postgres]
}

# 5. Firewall rule: only permits the explicitly authorized CIDR, never the public internet
resource "azurerm_postgresql_flexible_server_firewall_rule" "authorized_access" {
  count            = var.allowed_ingress_cidr != "" ? 1 : 0
  name             = "AuthorizedPlatformAccess"
  server_id        = azurerm_postgresql_flexible_server.postgres.id
  start_ip_address = cidrhost(var.allowed_ingress_cidr, 0)
  end_ip_address   = cidrhost(var.allowed_ingress_cidr, -1)
}
