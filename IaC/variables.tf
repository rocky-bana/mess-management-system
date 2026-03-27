variable "resource_group_name" {
  type        = string
  description = "The name of the resource group in which to create the resources."
}

variable "location" {
  type        = string
  description = "The Azure region where the resources should be created."
}

variable "storage_account_name" {
  type        = string
  description = "The name of the storage account."
}

variable "api_web_app_name" {
  type        = string
  description = "The name of the API web app."
}

variable "app_service_plan_name" {
  type        = string
  description = "The name of the app service plan."
}

variable "react_web_app_name" {
  type        = string
  description = "The name of the React web app."
}

variable "postgresql_server_name" {
  type        = string
  description = "The name of the PostgreSQL flexible server."
}

variable "postgresql_db_name" {
  type        = string
  description = "The name of the PostgreSQL database."
}

variable "db_admin_username" {
  type        = string
  description = "The administrator username for PostgreSQL."
}

variable "db_admin_password" {
  type        = string
  description = "The administrator password for PostgreSQL."
  sensitive   = true
}
