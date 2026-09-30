import {
  CanvasEdge,
  CanvasNode,
  GeneratedDesign,
  GeneratedModule,
  NODE_TEMPLATE_MAP,
} from './designer-types';

function hclValue(v: any): string {
  if (v === null || v === undefined) return '""';
  if (typeof v === 'boolean') return v ? 'true' : 'false';
  if (typeof v === 'number') return String(v);
  if (Array.isArray(v)) return `[${v.map(hclValue).join(', ')}]`;
  if (typeof v === 'object') {
    const entries = Object.entries(v)
      .map(([k, val]) => `${k} = ${hclValue(val)}`)
      .join(', ');
    return `{ ${entries} }`;
  }
  const s = String(v);
  if (/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(s)) return `"${s}"`;
  return JSON.stringify(s);
}

function hclIdentifier(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '') || 'resource'
  );
}

export const MODULE_OUTPUT_MAP: Record<string, string> = {
  'templates/aws/aws_vpc': 'vpc_id',
  'templates/azure/azure_vnet': 'vnet_id',
  'templates/gcp/gcp_vpc': 'vpc_id',
  'templates/aws/aws_ec2_web': 'instance_id',
  'templates/azure/azure_vm_web': 'vm_id',
  'templates/gcp/gcp_compute_web': 'instance_id',
  'templates/aws/aws_rds_postgres': 'db_instance_id',
  'templates/azure/azure_postgres_flexible': 'server_id',
  'templates/gcp/gcp_cloud_sql_postgres': 'instance_id',
  'templates/aws/aws_s3_bucket': 'bucket_id',
  'templates/azure/azure_blob_storage': 'storage_account_id',
  'templates/gcp/gcp_storage_bucket': 'bucket_id',
};

/**
 * Generates Terraform HCL from a visual design. Each node becomes a module
 * block sourced from the platform template catalog; edges become explicit
 * depends_on wiring so execution order matches the visual topology.
 */
export function generateTerraform(
  designName: string,
  provider: string,
  nodes: CanvasNode[],
  edges: CanvasEdge[],
): GeneratedDesign {
  const modules: GeneratedModule[] = nodes.map((node) => {
    const nodeProvider = (node.data.provider as 'AWS' | 'AZURE' | 'GCP') || (provider as 'AWS' | 'AZURE' | 'GCP') || 'AWS';
    const templateRef =
      node.data.templateRef || NODE_TEMPLATE_MAP[node.kind]?.[nodeProvider] || `templates/${nodeProvider.toLowerCase()}/${node.kind}`;
    const moduleName = hclIdentifier(node.data.label || node.kind);

    const userConfig = { ...(node.data.config || {}) };

    const upstreamNodes = edges
      .filter((e) => e.target === node.id)
      .map((e) => nodes.find((n) => n.id === e.source))
      .filter(Boolean) as CanvasNode[];

    const wiredArguments: Record<string, string> = {};

    for (const upstream of upstreamNodes) {
      const upstreamModuleName = hclIdentifier(upstream.data.label || upstream.kind);
      if (upstream.kind === 'network') {
        if (node.kind === 'compute') {
          if (nodeProvider === 'AWS') {
            if (!userConfig.vpc_id) wiredArguments['vpc_id'] = `module.${upstreamModuleName}.vpc_id`;
            if (!userConfig.subnet_id) wiredArguments['subnet_id'] = `module.${upstreamModuleName}.public_subnet_ids[0]`;
          } else if (nodeProvider === 'AZURE') {
            if (!userConfig.resource_group_name) wiredArguments['resource_group_name'] = `module.${upstreamModuleName}.resource_group_name`;
            if (!userConfig.subnet_id) wiredArguments['subnet_id'] = `module.${upstreamModuleName}.public_subnet_id`;
          } else if (nodeProvider === 'GCP') {
            if (!userConfig.network_name) wiredArguments['network_name'] = `module.${upstreamModuleName}.vpc_name`;
            if (!userConfig.subnet_self_link) wiredArguments['subnet_self_link'] = `module.${upstreamModuleName}.public_subnet_self_link`;
          }
        } else if (node.kind === 'database') {
          if (nodeProvider === 'AWS') {
            if (!userConfig.vpc_id) wiredArguments['vpc_id'] = `module.${upstreamModuleName}.vpc_id`;
            if (!userConfig.subnet_ids) wiredArguments['subnet_ids'] = `module.${upstreamModuleName}.private_subnet_ids`;
          } else if (nodeProvider === 'AZURE') {
            if (!userConfig.resource_group_name) wiredArguments['resource_group_name'] = `module.${upstreamModuleName}.resource_group_name`;
            if (!userConfig.vnet_id) wiredArguments['vnet_id'] = `module.${upstreamModuleName}.vnet_id`;
          } else if (nodeProvider === 'GCP') {
            if (!userConfig.network_id) wiredArguments['network_id'] = `module.${upstreamModuleName}.vpc_id`;
          }
        }
      }
    }

    const configLines: string[] = [];
    configLines.push(`  source = "../../templates/${templateRef.replace(/^templates\//, '')}"\n`);

    for (const [k, v] of Object.entries(userConfig)) {
      if (v !== '' && v !== null && v !== undefined && !(k in wiredArguments)) {
        configLines.push(`  ${k} = ${hclValue(v)}`);
      }
    }

    for (const [k, v] of Object.entries(wiredArguments)) {
      configLines.push(`  ${k} = ${v}`);
    }

    if (upstreamNodes.length > 0) {
      configLines.push('\n  depends_on = [');
      upstreamNodes.forEach((up) => {
        const upName = hclIdentifier(up.data.label || up.kind);
        configLines.push(`    module.${upName},`);
      });
      configLines.push('  ]');
    }

    return {
      nodeId: node.id,
      label: node.data.label,
      templateRef,
      terraform: `module "${moduleName}" {\n${configLines.join('\n')}\n}\n`,
    };
  });

  // Provider scaffolding derived from the design's primary provider
  const providerBlocks: Record<string, string> = {
    AWS: `terraform {
  required_version = ">= 1.5.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}`,
    AZURE: `terraform {
  required_version = ">= 1.0"
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.0"
    }
  }
}

provider "azurerm" {
  features {}
}`,
    GCP: `terraform {
  required_version = ">= 1.5.0"
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
  }
}

provider "google" {
  project = var.gcp_project_id
  region  = var.gcp_region
}`,
    MULTI: `terraform {
  required_version = ">= 1.5.0"
}`,
  };

  const providerVars: Record<string, string> = {
    AWS: `variable "aws_region" {
  type    = string
  default = "us-east-1"
}`,
    AZURE: `variable "azure_location" {
  type    = string
  default = "eastus"
}`,
    GCP: `variable "gcp_project_id" {
  type = string
}

variable "gcp_region" {
  type    = string
  default = "us-east1"
}`,
    MULTI: '',
  };

  const tfvarsEntries: Record<string, string> = {
    AWS: `aws_region = "us-east-1"`,
    AZURE: `azure_location = "eastus"`,
    GCP: `gcp_project_id = "my-project"\ngcp_region = "us-east1"`,
    MULTI: '',
  };

  const chosen = providerBlocks[provider] || providerBlocks.MULTI;
  const chosenVars = providerVars[provider] || '';
  const chosenTfvars = tfvarsEntries[provider] || '';

  const fullFile = [
    `# ${designName} — generated by the Multi-Cloud Platform Visual Designer`,
    `# Provider: ${provider}`,
    `# Node count: ${nodes.length}, dependency edges: ${edges.length}`,
    '',
    chosen,
    '',
    chosenVars,
    '',
    ...modules.map((m) => m.terraform),
  ].join('\n');

  return {
    designName,
    modules,
    tfvars: chosenTfvars ? `${chosenTfvars}\n` : '',
    variables: chosenVars,
    fullFile,
  };
}
