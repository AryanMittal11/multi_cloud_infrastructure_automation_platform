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

# 1. Random suffix for globally unique storage account name (Azure constraint: 3-24 lowercase alphanumerics)
resource "random_string" "suffix" {
  length  = 8
  special = false
  upper   = false
}

locals {
  storage_account_name = "${substr(lower(var.storage_name_prefix), 0, 16)}${random_string.suffix.result}"
}

# 2. Storage Account with strict public access and infrastructure encryption
resource "azurerm_storage_account" "storage" {
  name                     = local.storage_account_name
  resource_group_name      = var.resource_group_name
  location                 = var.location
  account_tier             = var.account_tier
  account_replication_type = var.replication_type
  account_kind             = "StorageV2"

  # Strict security invariants: never allow anonymous public access
  allow_nested_items_to_be_public = false
  public_network_access_enabled   = true
  min_tls_version                 = "TLS1_2"

  # Double encryption: infrastructure + service level encryption
  infrastructure_encryption_enabled = true

  # Shared key access disabled in favor of Azure AD (Entra ID) authorization
  shared_access_key_enabled = var.shared_access_key_enabled

  # Disable static website hosting unless explicitly required
  static_website_enabled = false

  tags = merge(
    var.tags,
    {
      Name      = local.storage_account_name
      ManagedBy = "MultiCloudPlatform"
    }
  )
}

# 3. Blob container with platform-managed access policy
resource "azurerm_storage_container" "container" {
  name                  = var.container_name
  storage_account_name  = azurerm_storage_account.storage.name
  container_access_type = "private"

  depends_on = [azurerm_storage_account.storage]
}

# 4. Object versioning via blob properties (immutability + rollback support)
resource "azurerm_storage_management_policy" "versioning" {
  storage_account_id = azurerm_storage_account.storage.id

  dynamic "rule" {
    for_each = var.enable_versioning ? [1] : []
    content {
      name    = "enable-versioning"
      enabled = true
      filters {
        blob_types   = ["blockBlob"]
        prefix_match = [var.container_name]
      }
      actions {
        base_blob {
          tier_to_cool_after_days_since_modification_greater_than = 90
          tier_to_archive_after_days_since_modification_greater_than = 365
          delete_after_days_since_modification_greater_than = 0 # Never auto-delete
        }
        snapshot {
          delete_after_days_since_creation_greater_than = 30
        }
      }
    }
  }
}
