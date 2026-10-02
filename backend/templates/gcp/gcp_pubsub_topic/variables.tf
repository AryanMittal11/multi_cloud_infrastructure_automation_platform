variable "topic_name" {
  description = "Name of the Pub/Sub topic"
  type        = string
  default     = "workload-events-topic"
}

variable "labels" {
  description = "Resource labels"
  type        = map(string)
  default     = {}
}
