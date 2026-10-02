variable "queue_name" {
  description = "Name of the SQS queue"
  type        = string
  default     = "workload-jobs-queue"
}

variable "delay_seconds" {
  description = "Delivery delay for all messages added to the queue in seconds"
  type        = number
  default     = 0
}

variable "message_retention_seconds" {
  description = "Number of seconds Amazon SQS retains a message"
  type        = number
  default     = 345600 # 4 days
}

variable "receive_wait_time_seconds" {
  description = "Time for which ReceiveMessage call waits for a message to arrive (long polling)"
  type        = number
  default     = 10
}

variable "tags" {
  description = "Resource tags"
  type        = map(string)
  default     = {}
}
