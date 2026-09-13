import fs from 'fs';
import path from 'path';
import { env } from '../../config/env';
import { logger } from '../../utils/logger';
import { WorkspaceConfig } from './terraform.types';

export class WorkspaceManager {
  private baseDir: string;
  private templatesRootDir: string;

  constructor(baseDir?: string, templatesRootDir?: string) {
    this.baseDir = path.resolve(process.cwd(), baseDir || env.TERRAFORM_WORKSPACE_DIR);
    this.templatesRootDir = path.resolve(__dirname, '../../../templates');

    // Ensure base workspace directory exists
    if (!fs.existsSync(this.baseDir)) {
      fs.mkdirSync(this.baseDir, { recursive: true });
    }
  }

  /**
   * Resolves the target cloud provider from the template reference path
   * (e.g. templates/azure/azure_vnet -> AZURE).
   */
  resolveProviderFromReference(templateReference: string): 'AWS' | 'AZURE' | 'GCP' {
    const normalized = templateReference.toLowerCase();
    if (normalized.includes('/azure/') || normalized.startsWith('azure')) return 'AZURE';
    if (normalized.includes('/gcp/') || normalized.startsWith('gcp')) return 'GCP';
    return 'AWS';
  }

  /**
   * Initializes an ephemeral workspace directory for a deployment.
   * Copies template HCL files and writes terraform.tfvars.json.
   */
  async prepareWorkspace(config: WorkspaceConfig): Promise<string> {
    const workspaceDir = path.join(this.baseDir, config.deploymentId);

    if (!fs.existsSync(workspaceDir)) {
      fs.mkdirSync(workspaceDir, { recursive: true });
    }

    // 1. Resolve source template directory
    let sourceTemplateDir = path.join(process.cwd(), config.templateReference);
    if (!fs.existsSync(sourceTemplateDir)) {
      sourceTemplateDir = path.join(this.templatesRootDir, config.templateReference.replace(/^templates\//, ''));
    }

    if (fs.existsSync(sourceTemplateDir)) {
      // Copy all .tf files from source template into isolated workspace
      const files = fs.readdirSync(sourceTemplateDir);
      for (const file of files) {
        if (file.endsWith('.tf') || file.endsWith('.hcl')) {
          fs.copyFileSync(path.join(sourceTemplateDir, file), path.join(workspaceDir, file));
        }
      }
    } else {
      logger.warn(`Source template directory not found at ${sourceTemplateDir}. Generating placeholder main.tf.`);
      fs.writeFileSync(
        path.join(workspaceDir, 'main.tf'),
        `# Generated placeholder for ${config.templateReference}\noutput \"status\" { value = \"ready\" }\n`,
        'utf8',
      );
    }

    // 2. Generate terraform.tfvars.json from validated configuration
    const tfvarsPath = path.join(workspaceDir, 'terraform.tfvars.json');
    fs.writeFileSync(tfvarsPath, JSON.stringify(config.configuration, null, 2), 'utf8');

    // 3. Generate provider block matching the target cloud (multi-provider aware)
    const providerPath = path.join(workspaceDir, 'provider_override.tf');
    const provider = this.resolveProviderFromReference(config.templateReference);
    const providerHcl = this.buildProviderBlock(provider, config);
    fs.writeFileSync(providerPath, providerHcl.trim(), 'utf8');

    logger.info(`Prepared isolated workspace at ${workspaceDir} (provider: ${provider})`);
    return workspaceDir;
  }

  /**
   * Builds the provider configuration block (required_providers + provider stanza)
   * for the target cloud. Credentials are always injected via environment variables
   * (never persisted to disk in HCL) per the Zero Secret Leakage invariant.
   */
  private buildProviderBlock(
    provider: 'AWS' | 'AZURE' | 'GCP',
    config: WorkspaceConfig,
  ): string {
    if (provider === 'AZURE') {
      const location = config.region || config.configuration.location || 'eastus';
      return `
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

# Authentication is injected via ARM_* environment variables by the worker.
provider "azurerm" {
  features {
    resource_group {
      prevent_deletion_if_contains_resources = false
    }
  }
  default_tags {
    tags = {
      PlatformDeploymentId = "${config.deploymentId}"
      ManagedBy            = "MultiCloudPlatform"
    }
  }
}

# Default Azure region used when a template does not declare an explicit location
locals {
  platform_default_location = "${location}"
}
`;
    }

    if (provider === 'GCP') {
      const region = config.region || config.configuration.region || 'us-east1';
      return `
terraform {
  required_version = ">= 1.5.0"
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.5"
    }
  }
}

# Authentication and project resolution are injected via
# GOOGLE_CREDENTIALS / GOOGLE_PROJECT environment variables by the worker.
provider "google" {
  region = "${region}"
}

# Default GCP region used when a template does not declare an explicit region
locals {
  platform_default_region = "${region}"
}
`;
    }

    // AWS (default)
    const region = config.region || config.configuration.region || 'us-east-1';
    return `
terraform {
  required_version = ">= 1.5.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.5"
    }
  }
}

# Authentication is injected via AWS_* environment variables by the worker.
provider "aws" {
  region = "${region}"
  default_tags {
    tags = {
      PlatformDeploymentId = "${config.deploymentId}"
      ManagedBy            = "MultiCloudPlatform"
    }
  }
}
`;
  }

  /**
   * Retrieves the path to an active workspace.
   */
  getWorkspacePath(deploymentId: string): string {
    return path.join(this.baseDir, deploymentId);
  }

  /**
   * Cleans up ephemeral workspace files after execution.
   */
  async cleanupWorkspace(deploymentId: string, retainState: boolean = true): Promise<void> {
    const workspaceDir = path.join(this.baseDir, deploymentId);
    if (!fs.existsSync(workspaceDir)) return;

    if (retainState) {
      // Retain terraform.tfstate and delete temporary plan files
      const planFile = path.join(workspaceDir, 'tfplan');
      if (fs.existsSync(planFile)) {
        fs.unlinkSync(planFile);
      }
    } else {
      // Full cleanup
      fs.rmSync(workspaceDir, { recursive: true, force: true });
    }
  }
}

export const workspaceManager = new WorkspaceManager();
