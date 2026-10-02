terraform {
  required_version = ">= 1.5.0"
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
  }
}

resource "google_pubsub_topic" "topic" {
  name = var.topic_name

  labels = var.labels
}

resource "google_pubsub_subscription" "subscription" {
  name  = "${var.topic_name}-sub"
  topic = google_pubsub_topic.topic.name

  ack_deadline_seconds = 20
}
