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
        `# Generated placeholder for ${config.templateReference}\noutput "status" { value = "ready" }\n`,
        'utf8',
      );
    }

    // 2. Generate terraform.tfvars.json from validated configuration
    const tfvarsPath = path.join(workspaceDir, 'terraform.tfvars.json');
    fs.writeFileSync(tfvarsPath, JSON.stringify(config.configuration, null, 2), 'utf8');

    // 3. Generate AWS provider block if not present
    const providerPath = path.join(workspaceDir, 'provider_override.tf');
    const region = config.region || config.configuration.region || 'us-east-1';
    const providerHcl = `
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
    fs.writeFileSync(providerPath, providerHcl.trim(), 'utf8');

    logger.info(`Prepared isolated workspace at ${workspaceDir}`);
    return workspaceDir;
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
