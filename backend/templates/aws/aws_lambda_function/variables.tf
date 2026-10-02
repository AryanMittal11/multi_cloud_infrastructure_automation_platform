variable "function_name" {
  description = "Name of the Lambda function"
  type        = string
  default     = "cloud-api-function"
}

variable "runtime" {
  description = "Runtime environment for the function"
  type        = string
  default     = "nodejs18.x"
}

variable "memory_size" {
  description = "Memory allocation in megabytes"
  type        = number
  default     = 128
}

variable "timeout" {
  description = "Execution timeout in seconds"
  type        = number
  default     = 10
}

variable "tags" {
  description = "Resource tags"
  type        = map(string)
  default     = {}
}
