import { env } from '../../config/env';
import { logger } from '../../utils/logger';
import { generateDesignTerraform, NODE_TEMPLATE_MAP } from '../designs/design.generator';

export interface GenerateArchitectureInput {
  prompt: string;
  cloudProvider?: 'AWS' | 'AZURE' | 'GCP' | 'MULTI';
}

export interface GeneratedNode {
  id: string;
  kind: 'network' | 'compute' | 'database' | 'storage' | 'kubernetes';
  position: { x: number; y: number };
  data: {
    kind: 'network' | 'compute' | 'database' | 'storage' | 'kubernetes';
    label: string;
    provider: 'AWS' | 'AZURE' | 'GCP';
    templateRef: string;
    config: Record<string, any>;
    monthlyCost?: number;
    notes?: string;
  };
}

export interface GeneratedEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
}

export interface GeneratedArchitectureResponse {
  name: string;
  description: string;
  cloudProvider: 'AWS' | 'AZURE' | 'GCP';
  rationale: string;
  estimatedCostMonthlyUsd: number;
  nodes: GeneratedNode[];
  edges: GeneratedEdge[];
  terraformCode: string;
}

export class AiService {
  /**
   * Generates a complete architecture design from a natural language prompt using Google Gemini.
   * If the Gemini API key is missing or encounters a network error, falls back to the smart heuristic engine.
   */
  async generateArchitecture(input: GenerateArchitectureInput): Promise<GeneratedArchitectureResponse> {
    const prompt = input.prompt.trim();
    if (!prompt) {
      throw new Error('A prompt describing your architecture requirements is required');
    }

    const apiKey = env.GEMINI_API_KEY || process.env.GEMINI_API_KEY;

    if (apiKey) {
      try {
        logger.info(`Invoking Google Gemini AI for prompt: "${prompt.slice(0, 80)}..."`);
        const result = await this.callGeminiApi(apiKey, prompt, input.cloudProvider);
        if (result && result.nodes && result.nodes.length > 0) {
          return this.finalizeArchitecture(result);
        }
      } catch (err: any) {
        logger.warn(`Gemini API call failed, falling back to heuristic generator: ${err.message}`);
      }
    } else {
      logger.info('No GEMINI_API_KEY configured — using smart architecture heuristic engine');
    }

    // Heuristic generator
    const heuristicResult = this.generateHeuristicArchitecture(prompt, input.cloudProvider);
    return this.finalizeArchitecture(heuristicResult);
  }

  private async callGeminiApi(
    apiKey: string,
    userPrompt: string,
    preferredProvider?: 'AWS' | 'AZURE' | 'GCP' | 'MULTI',
  ): Promise<any> {
    const systemPrompt = `You are an expert cloud infrastructure solutions architect for a multi-cloud automation platform.
Your task is to translate user infrastructure requirements into a production-ready, deployable architecture topology.

Target Cloud Providers: AWS, AZURE, GCP.
Supported Resource Kinds:
- network: VPC (AWS), Virtual Network (Azure), VPC Network (GCP)
- compute: EC2 Web Server (AWS), Linux VM (Azure), Compute Engine VM (GCP)
- database: RDS PostgreSQL (AWS), PostgreSQL Flexible Server (Azure), Cloud SQL PostgreSQL (GCP)
- storage: S3 Bucket (AWS), Blob Storage (Azure), Cloud Storage Bucket (GCP)
- kubernetes: Managed Cluster (Compute)

Rules:
1. Always include a network foundation (VPC/VNet) if compute or database resources are requested.
2. Link dependencies logically:
   - Network -> Compute
   - Network -> Database
   - Compute -> Storage (if media/data storage is relevant)
3. Return valid JSON only with keys:
   - name: string (e.g. "Three-Tier Web Application")
   - description: string
   - cloudProvider: "AWS" | "AZURE" | "GCP"
   - rationale: string (2-3 sentences explaining architectural decisions)
   - estimatedCostMonthlyUsd: number
   - resources: array of objects with:
     - kind: "network" | "compute" | "database" | "storage"
     - label: string (e.g. "Production VPC", "Web Cluster", "Primary PostgreSQL")
     - config: key-value configuration overrides (e.g. instance_type: "t3.small", vpc_cidr: "10.0.0.0/16", db_instance_class: "db.t3.micro", server_name: "prod-web")
   - connections: array of objects with:
     - sourceLabel: string (matches a resource label)
     - targetLabel: string (matches a resource label)
     - label: optional string
${preferredProvider && preferredProvider !== 'MULTI' ? `Strictly use cloud provider: ${preferredProvider}.` : ''}
`;

    // Try gemini-2.0-flash, fallback to gemini-1.5-flash
    const models = ['gemini-2.0-flash', 'gemini-1.5-flash'];
    let lastError: Error | null = null;

    for (const model of models) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [
              {
                role: 'user',
                parts: [{ text: `${systemPrompt}\n\nUser Request:\n"${userPrompt}"` }],
              },
            ],
            generationConfig: {
              responseMimeType: 'application/json',
              temperature: 0.2,
            },
          }),
        });

        if (!response.ok) {
          const errBody = await response.text();
          throw new Error(`Gemini API error (${response.status}): ${errBody.slice(0, 150)}`);
        }

        const data: any = await response.json();
        const contentText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!contentText) {
          throw new Error('Empty response from Gemini API');
        }

        const parsed = JSON.parse(contentText);
        return this.transformGeminiResponseToDesign(parsed, preferredProvider);
      } catch (err: any) {
        lastError = err;
      }
    }

    throw lastError || new Error('Failed to generate architecture with Gemini');
  }

  private transformGeminiResponseToDesign(
    geminiData: any,
    preferredProvider?: 'AWS' | 'AZURE' | 'GCP' | 'MULTI',
  ) {
    const rawProvider = (geminiData.cloudProvider || preferredProvider || 'AWS').toUpperCase();
    const provider: 'AWS' | 'AZURE' | 'GCP' =
      rawProvider === 'AZURE' ? 'AZURE' : rawProvider === 'GCP' ? 'GCP' : 'AWS';

    const resources: any[] = Array.isArray(geminiData.resources) ? geminiData.resources : [];
    const connections: any[] = Array.isArray(geminiData.connections) ? geminiData.connections : [];

    // Map resources to nodes with clean 2D tiered grid layout
    const labelToIdMap = new Map<string, string>();
    const nodes: GeneratedNode[] = [];

    // Group resources by kind for visual tiering
    const networks = resources.filter((r) => r.kind === 'network');
    const computes = resources.filter((r) => r.kind === 'compute' || r.kind === 'kubernetes');
    const databases = resources.filter((r) => r.kind === 'database');
    const storages = resources.filter((r) => r.kind === 'storage');

    let idx = 1;

    // Helper to position nodes in columns
    const addNode = (r: any, x: number, y: number) => {
      const id = `node_${idx++}`;
      labelToIdMap.set(r.label, id);
      const kind = r.kind || 'compute';
      const templateRef = NODE_TEMPLATE_MAP[kind]?.[provider] || `templates/${provider.toLowerCase()}/${kind}`;

      nodes.push({
        id,
        kind,
        position: { x, y },
        data: {
          kind,
          label: r.label || `${kind}-${idx}`,
          provider,
          templateRef,
          config: r.config || {},
          monthlyCost: kind === 'database' ? 35 : kind === 'compute' ? 22 : 12,
        },
      });
    };

    // Column 1: Network (x: 80)
    networks.forEach((r, i) => addNode(r, 80, 140 + i * 180));

    // Column 2: Compute (x: 360)
    computes.forEach((r, i) => addNode(r, 360, 100 + i * 160));

    // Column 3: Database & Storage (x: 640)
    const rightCol = [...databases, ...storages];
    rightCol.forEach((r, i) => addNode(r, 640, 100 + i * 160));

    // Fallback if no network was added
    if (nodes.length === 0) {
      resources.forEach((r, i) => addNode(r, 160 + (i % 3) * 260, 120 + Math.floor(i / 3) * 160));
    }

    // Edges
    const edges: GeneratedEdge[] = [];
    connections.forEach((conn, cIdx) => {
      const sourceId = labelToIdMap.get(conn.sourceLabel);
      const targetId = labelToIdMap.get(conn.targetLabel);
      if (sourceId && targetId && sourceId !== targetId) {
        edges.push({
          id: `edge_${cIdx + 1}`,
          source: sourceId,
          target: targetId,
          label: conn.label,
        });
      }
    });

    // If no edges returned by AI but we have network + other tiers, auto-connect network -> workloads
    if (edges.length === 0 && networks.length > 0) {
      const networkNodeId = nodes[0].id;
      nodes.slice(1).forEach((workload, wIdx) => {
        edges.push({
          id: `edge_auto_${wIdx + 1}`,
          source: networkNodeId,
          target: workload.id,
        });
      });
    }

    return {
      name: geminiData.name || 'AI Generated Architecture',
      description: geminiData.description || 'Architecture designed with Google Gemini AI',
      cloudProvider: provider,
      rationale: geminiData.rationale || 'Engineered for reliability, multi-tier segregation, and scalable compute.',
      estimatedCostMonthlyUsd: Number(geminiData.estimatedCostMonthlyUsd) || 68,
      nodes,
      edges,
    };
  }

  /**
   * Smart rule-based heuristic generator for offline mode or when GEMINI_API_KEY is not configured.
   */
  private generateHeuristicArchitecture(
    prompt: string,
    preferredProvider?: 'AWS' | 'AZURE' | 'GCP' | 'MULTI',
  ) {
    const lower = prompt.toLowerCase();

    // Determine target provider
    let provider: 'AWS' | 'AZURE' | 'GCP' = 'AWS';
    if (preferredProvider && preferredProvider !== 'MULTI') {
      provider = preferredProvider;
    } else if (lower.includes('azure')) {
      provider = 'AZURE';
    } else if (lower.includes('gcp') || lower.includes('google')) {
      provider = 'GCP';
    }

    const hasDatabase =
      lower.includes('db') ||
      lower.includes('database') ||
      lower.includes('postgres') ||
      lower.includes('sql') ||
      lower.includes('data');

    const hasStorage =
      lower.includes('storage') ||
      lower.includes('s3') ||
      lower.includes('bucket') ||
      lower.includes('blob') ||
      lower.includes('media') ||
      lower.includes('upload');

    const isHighAvailability =
      lower.includes('ha') ||
      lower.includes('high availability') ||
      lower.includes('cluster') ||
      lower.includes('scale') ||
      lower.includes('redundant');

    const nodes: GeneratedNode[] = [];
    const edges: GeneratedEdge[] = [];

    // 1. Network Tier
    const vpcLabel = provider === 'AZURE' ? 'Enterprise VNet' : provider === 'GCP' ? 'Core VPC' : 'Primary VPC';
    nodes.push({
      id: 'node_vpc',
      kind: 'network',
      position: { x: 80, y: 160 },
      data: {
        kind: 'network',
        label: vpcLabel,
        provider,
        templateRef: NODE_TEMPLATE_MAP['network'][provider],
        config: provider === 'AWS' ? { vpc_cidr: '10.0.0.0/16' } : {},
        monthlyCost: 0,
        notes: 'Isolated network foundation with public/private subnet topology',
      },
    });

    // 2. Compute Tier
    const webLabel = provider === 'AZURE' ? 'Web VM Tier' : provider === 'GCP' ? 'Compute Engine Web' : 'Web Tier Cluster';
    const instanceType = isHighAvailability ? (provider === 'AWS' ? 't3.small' : 'Standard_B2s') : (provider === 'AWS' ? 't3.micro' : 'Standard_B1s');

    nodes.push({
      id: 'node_web',
      kind: 'compute',
      position: { x: 360, y: 120 },
      data: {
        kind: 'compute',
        label: webLabel,
        provider,
        templateRef: NODE_TEMPLATE_MAP['compute'][provider],
        config: {
          server_name: 'prod-frontend',
          instance_type: instanceType,
          allocated_storage_gb: 20,
        },
        monthlyCost: isHighAvailability ? 38 : 18,
        notes: 'Workload instances with automated HTTP/HTTPS ingress security rules',
      },
    });

    edges.push({
      id: 'edge_vpc_web',
      source: 'node_vpc',
      target: 'node_web',
    });

    // 3. Database Tier (Optional based on prompt)
    if (hasDatabase || !hasStorage) {
      const dbLabel = provider === 'AZURE' ? 'PostgreSQL Flexible' : provider === 'GCP' ? 'Cloud SQL Postgres' : 'RDS PostgreSQL';
      nodes.push({
        id: 'node_db',
        kind: 'database',
        position: { x: 640, y: 120 },
        data: {
          kind: 'database',
          label: dbLabel,
          provider,
          templateRef: NODE_TEMPLATE_MAP['database'][provider],
          config: {
            db_name: 'production_app',
            db_instance_class: 'db.t3.micro',
            allocated_storage: 20,
          },
          monthlyCost: 35,
          notes: 'High-availability managed PostgreSQL relational database',
        },
      });

      edges.push({
        id: 'edge_vpc_db',
        source: 'node_vpc',
        target: 'node_db',
      });
    }

    // 4. Storage Tier (Optional based on prompt)
    if (hasStorage) {
      const storageLabel = provider === 'AZURE' ? 'Blob Storage Container' : provider === 'GCP' ? 'Cloud Storage Bucket' : 'S3 Object Storage';
      nodes.push({
        id: 'node_storage',
        kind: 'storage',
        position: { x: 640, y: hasDatabase ? 280 : 120 },
        data: {
          kind: 'storage',
          label: storageLabel,
          provider,
          templateRef: NODE_TEMPLATE_MAP['storage'][provider],
          config: {
            bucket_name_prefix: 'platform-assets',
            enable_versioning: true,
          },
          monthlyCost: 8,
          notes: 'Durable, encrypted cloud object storage for media and static assets',
        },
      });

      edges.push({
        id: 'edge_web_storage',
        source: 'node_web',
        target: 'node_storage',
      });
    }

    const totalCost = nodes.reduce((sum, n) => sum + (n.data.monthlyCost || 0), 0);

    return {
      name: `${provider} ${hasDatabase ? 'Three-Tier' : 'Scalable'} Architecture`,
      description: `Optimized ${provider} infrastructure matching your workload requirements`,
      cloudProvider: provider,
      rationale: `Architected with an isolated ${vpcLabel} to secure network boundaries, a scalable compute tier for application serving, and segregated backend storage/data tiers for zero-trust security.`,
      estimatedCostMonthlyUsd: totalCost || 56,
      nodes,
      edges,
    };
  }

  private finalizeArchitecture(design: any): GeneratedArchitectureResponse {
    const { mainTf } = generateDesignTerraform(
      design.name,
      design.cloudProvider,
      design.nodes,
      design.edges,
    );

    return {
      name: design.name,
      description: design.description,
      cloudProvider: design.cloudProvider,
      rationale: design.rationale,
      estimatedCostMonthlyUsd: design.estimatedCostMonthlyUsd,
      nodes: design.nodes,
      edges: design.edges,
      terraformCode: mainTf,
    };
  }
}

export const aiService = new AiService();
