terraform {
  required_version = ">= 1.5.0"
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
    archive = {
      source  = "hashicorp/archive"
      version = "~> 2.4"
    }
  }
}

resource "google_storage_bucket" "bucket" {
  name                     = "${var.function_name}-src-bucket"
  location                 = var.region
  uniform_bucket_level_access = true
}

data "archive_file" "src" {
  type        = "zip"
  output_path = "${path.module}/func.zip"
  source {
    content  = "exports.helloWorld = (req, res) => { res.status(200).send('Hello from GCP Cloud Function!'); };"
    filename = "index.js"
  }
}

resource "google_storage_bucket_object" "archive" {
  name   = "source.zip"
  bucket = google_storage_bucket.bucket.name
  source = data.archive_file.src.output_path
}

resource "google_cloudfunctions_function" "function" {
  name        = var.function_name
  description = "Managed Serverless Cloud Function"
  runtime     = var.runtime
  region      = var.region

  available_memory_mb   = var.memory_mb
  source_archive_bucket = google_storage_bucket.bucket.name
  source_archive_object = google_storage_bucket_object.archive.name
  trigger_http          = true
  entry_point           = "helloWorld"

  labels = var.labels
}
