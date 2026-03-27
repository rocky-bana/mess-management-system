output "storage_account_name" {
  value = azurerm_storage_account.storage.name
}

output "api_url" {
  value = "https://${azurerm_linux_web_app.api.default_hostname}"
}

output "react_url" {
  value = "https://${azurerm_linux_web_app.react.default_hostname}"
}
