locals {
  common_tags = {
    Environment = "development"
    Project     = "Mess Management System"
  }
}

resource "azurerm_resource_group" "rg" {
  name     = var.resource_group_name
  location = var.location
  tags     = local.common_tags
}

resource "azurerm_storage_account" "storage" {
  name                     = var.storage_account_name
  resource_group_name      = azurerm_resource_group.rg.name
  location                 = azurerm_resource_group.rg.location
  account_tier             = "Standard"
  account_replication_type = "LRS"
  tags                     = local.common_tags
}

resource "azurerm_service_plan" "asp" {
  name                = var.app_service_plan_name
  resource_group_name = azurerm_resource_group.rg.name
  location            = azurerm_resource_group.rg.location
  os_type             = "Linux"
  sku_name            = "F1" # Free tier for students
  tags                = local.common_tags
}

resource "azurerm_linux_web_app" "api" {
  name                = var.api_web_app_name
  resource_group_name = azurerm_resource_group.rg.name
  location            = azurerm_service_plan.asp.location
  service_plan_id     = azurerm_service_plan.asp.id
  tags                = local.common_tags
  site_config {
    always_on = false
  }

  app_settings = {
    "STORAGE_ACCOUNT_NAME" = azurerm_storage_account.storage.name
    "STORAGE_ACCOUNT_KEY"  = azurerm_storage_account.storage.primary_access_key
    "DB_HOST"              = azurerm_postgresql_flexible_server.pgsql.fqdn
    "DB_NAME"              = azurerm_postgresql_flexible_server_database.db.name
    "DB_USER"              = var.db_admin_username
    "DB_PASSWORD"          = var.db_admin_password
  }
}

resource "azurerm_linux_web_app" "react" {
  name                = var.react_web_app_name
  resource_group_name = azurerm_resource_group.rg.name
  location            = azurerm_service_plan.asp.location
  service_plan_id     = azurerm_service_plan.asp.id
  tags                = local.common_tags
  site_config {
    always_on = false
  }

  app_settings = {
    "API_URL"           = "https://${azurerm_linux_web_app.api.default_hostname}"
    "VITE_API_BASE_URL" = "https://${azurerm_linux_web_app.api.default_hostname}"
  }
}

resource "azurerm_postgresql_flexible_server" "pgsql" {
  name                   = var.postgresql_server_name
  resource_group_name    = azurerm_resource_group.rg.name
  location               = azurerm_resource_group.rg.location
  version                = "13"
  administrator_login    = var.db_admin_username
  administrator_password = var.db_admin_password
  storage_mb             = 32768
  sku_name               = "B_Standard_B1ms" # Burstable tier (minimal cost)
  tags                   = local.common_tags

  lifecycle {
    ignore_changes = [zone]
  }
}

resource "azurerm_postgresql_flexible_server_database" "db" {
  name      = var.postgresql_db_name
  server_id = azurerm_postgresql_flexible_server.pgsql.id
  collation = "en_US.utf8"
  charset   = "utf8"
}

resource "azurerm_postgresql_flexible_server_firewall_rule" "allow_azure" {
  name             = "allow-azure-services"
  server_id        = azurerm_postgresql_flexible_server.pgsql.id
  start_ip_address = "0.0.0.0"
  end_ip_address   = "0.0.0.0"
}
