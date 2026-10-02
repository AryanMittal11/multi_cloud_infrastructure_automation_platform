output "topic_id" {
  description = "Identifier for the Pub/Sub topic"
  value       = google_pubsub_topic.topic.id
}

output "topic_name" {
  description = "Name of the Pub/Sub topic"
  value       = google_pubsub_topic.topic.name
}

output "subscription_id" {
  description = "Identifier of the default subscription"
  value       = google_pubsub_subscription.subscription.id
}
