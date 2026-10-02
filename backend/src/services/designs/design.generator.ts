import { DesignEdgeInput, DesignNodeInput } from './design.service';

export const NODE_TEMPLATE_MAP: Record<string, Record<'AWS' | 'AZURE' | 'GCP', string>> = {
  network: {
    AWS: 'templates/aws/aws_vpc',
    AZURE: 'templates/azure/azure_vnet',
    GCP: 'templates/gcp/gcp_vpc',
  },
  compute: {
    AWS: 'templates/aws/aws_ec2_web',
    AZURE: 'templates/azure/azure_vm_web',
    GCP: 'templates/gcp/gcp_compute_web',
  },
  database: {
    AWS: 'templates/aws/aws_rds_postgres',
    AZURE: 'templates/azure/azure_postgres_flexible',
    GCP: 'templates/gcp/gcp_cloud_sql_postgres',
  },
  storage: {
    AWS: 'templates/aws/aws_s3_bucket',
    AZURE: 'templates/azure/azure_blob_storage',
    GCP: 'templates/gcp/gcp_storage_bucket',
  },
  serverless: {
    AWS: 'templates/aws/aws_lambda_function',
    AZURE: 'templates/azure/azure_function_app',
    GCP: 'templates/gcp/gcp_cloud_function',
  },
  nosql: {
    AWS: 'templates/aws/aws_dynamodb_table',
    AZURE: 'templates/azure/azure_cosmosdb',
    GCP: 'templates/gcp/gcp_firestore',
  },
  queue: {
    AWS: 'templates/aws/aws_sqs_queue',
    AZURE: 'templates/azure/azure_servicebus_queue',
    GCP: 'templates/gcp/gcp_pubsub_topic',
  },
  loadbalancer: {
    AWS: 'templates/aws/aws_alb',
    AZURE: 'templates/azure/azure_load_balancer',
    GCP: 'templates/gcp/gcp_load_balancer',
  },
  kubernetes: {
    AWS: 'templates/aws/aws_ec2_web',
    AZURE: 'templates/azure/azure_vm_web',
    GCP: 'templates/gcp/gcp_compute_web',
  },
};

export function hclIdentifier(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '') || 'resource'
  );
}

export function hclValue(v: any): string {
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
  return JSON.stringify(String(v));
}

export interface GeneratedDesignArtifacts {
  mainTf: string;
  schemaJson: object;
}

export function generateDesignTerraform(
  designName: string,
  cloudProvider: 'AWS' | 'AZURE' | 'GCP' | 'MULTI',
  nodes: DesignNodeInput[],
  edges: DesignEdgeInput[],
): GeneratedDesignArtifacts {
  const provider = cloudProvider === 'MULTI' ? 'AWS' : cloudProvider;

  // Deduplicate module names to prevent HCL collisions
  const usedNames = new Set<string>();
  const nodeModuleNameMap = new Map<string, string>();

  nodes.forEach((n) => {
    let base = hclIdentifier(n.data?.label || n.kind || 'node');
    let candidate = base;
    let counter = 1;
    while (usedNames.has(candidate)) {
      candidate = `${base}_${counter++}`;
    }
    usedNames.add(candidate);
    nodeModuleNameMap.set(n.id, candidate);
  });

  const moduleBlocks: string[] = nodes.map((node) => {
    const nodeProvider = (node.data?.provider as 'AWS' | 'AZURE' | 'GCP') || provider;
    const templateRef =
      node.data?.templateRef ||
      NODE_TEMPLATE_MAP[node.kind]?.[nodeProvider] ||
      `templates/${nodeProvider.toLowerCase()}/${node.kind}`;

    const moduleName = nodeModuleNameMap.get(node.id) || hclIdentifier(node.id);
    const userConfig = { ...(node.data?.config || {}) };

    // Find upstream connected nodes
    const upstreamEdges = edges.filter((e) => e.target === node.id);
    const upstreamNodes = upstreamEdges
      .map((e) => nodes.find((n) => n.id === e.source))
      .filter((n): n is DesignNodeInput => Boolean(n));

    // Automated wiring from upstream nodes (e.g. VPC -> Compute, VPC -> RDS)
    const wiredArguments: Record<string, string> = {};

    for (const upstream of upstreamNodes) {
      const upstreamModuleName = nodeModuleNameMap.get(upstream.id) || hclIdentifier(upstream.id);
      const upstreamKind = upstream.kind;

      if (upstreamKind === 'network') {
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
        } else if (node.kind === 'loadbalancer') {
          if (nodeProvider === 'AWS') {
            if (!userConfig.vpc_id) wiredArguments['vpc_id'] = `module.${upstreamModuleName}.vpc_id`;
            if (!userConfig.subnet_ids) wiredArguments['subnet_ids'] = `module.${upstreamModuleName}.public_subnet_ids`;
          } else if (nodeProvider === 'AZURE') {
            if (!userConfig.resource_group_name) wiredArguments['resource_group_name'] = `module.${upstreamModuleName}.resource_group_name`;
          }
        }
      }
    }

    const lines: string[] = [];
    lines.push(`  source = "../../templates/${templateRef.replace(/^templates\//, '')}"\n`);

    // Add user configs
    for (const [k, v] of Object.entries(userConfig)) {
      if (v !== '' && v !== null && v !== undefined && !(k in wiredArguments)) {
        lines.push(`  ${k} = ${hclValue(v)}`);
      }
    }

    // Add wired references
    for (const [k, v] of Object.entries(wiredArguments)) {
      lines.push(`  ${k} = ${v}`);
    }

    // Add depends_on
    if (upstreamNodes.length > 0) {
      lines.push('\n  depends_on = [');
      upstreamNodes.forEach((up) => {
        const upName = nodeModuleNameMap.get(up.id) || hclIdentifier(up.id);
        lines.push(`    module.${upName},`);
      });
      lines.push('  ]');
    }

    return `module "${moduleName}" {\n${lines.join('\n')}\n}`;
  });

  // Root terraform required providers configuration
  let providerRequirements = '';
  if (provider === 'AZURE') {
    providerRequirements = `terraform {
  required_version = ">= 1.5.0"
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.0"
    }
  }
}`;
  } else if (provider === 'GCP') {
    providerRequirements = `terraform {
  required_version = ">= 1.5.0"
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
  }
}`;
  } else {
    // AWS default
    providerRequirements = `terraform {
  required_version = ">= 1.5.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}`;
  }

  const mainTf = [
    `# ==============================================================================`,
    `# Architecture Design: ${designName}`,
    `# Generated dynamically by Multi-Cloud Infrastructure Automation Platform`,
    `# Resources: ${nodes.length} | Links: ${edges.length}`,
    `# ==============================================================================`,
    '',
    providerRequirements,
    '',
    ...moduleBlocks,
    '',
  ].join('\n');

  const schemaJson = {
    $schema: 'http://json-schema.org/draft-07/schema#',
    title: designName,
    description: `Auto-generated schema for visual design "${designName}"`,
    type: 'object',
    properties: {},
    additionalProperties: true,
  };

  return { mainTf, schemaJson };
}
