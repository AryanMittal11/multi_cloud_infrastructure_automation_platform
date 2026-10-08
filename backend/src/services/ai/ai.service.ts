import { env } from '../../config/env';
import { logger } from '../../utils/logger';
import { generateDesignTerraform, NODE_TEMPLATE_MAP } from '../designs/design.generator';

export interface GenerateArchitectureInput {
  prompt: string;
  cloudProvider?: 'AWS' | 'AZURE' | 'GCP' | 'MULTI';
}

export type NodeKind =
  | 'network'
  | 'compute'
  | 'database'
  | 'storage'
  | 'serverless'
  | 'nosql'
  | 'queue'
  | 'loadbalancer'
  | 'kubernetes';

export interface GeneratedNode {
  id: string;
  kind: NodeKind;
  position: { x: number; y: number };
  data: {
    kind: NodeKind;
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

    if (apiKey && process.env.NODE_ENV !== 'test') {
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
- serverless: Lambda Function (AWS), Function App (Azure), Cloud Function (GCP)
- nosql: DynamoDB Table (AWS), Cosmos DB (Azure), Firestore Database (GCP)
- queue: SQS Queue (AWS), Service Bus Queue (Azure), Pub/Sub Topic (GCP)
- loadbalancer: Application Load Balancer (AWS), Load Balancer (Azure), Cloud Load Balancer (GCP)
- kubernetes: Managed Cluster (Compute)

CRITICAL REQUIREMENTS:
1. PRECISE SCOPING: ONLY generate the resources the user explicitly requests or implies.
2. SINGLE SERVICE REQUESTS: If the user asks for a single service (e.g. "only want s3 bucket", "just an s3 bucket", "only dynamodb table", "just a lambda function", "single ec2"), generate EXACTLY and ONLY that requested resource. DO NOT force unnecessary networks (VPC), servers, or databases unless explicitly requested!
3. SPECIFIC COMBINATIONS: If the user asks for a specific combination (e.g. "EC2 and S3", "Lambda with DynamoDB and SQS", "VPC with 2 EC2 instances"), generate ONLY those relevant components.
4. MULTI-TIER: Only design a full 3-tier or multi-tier architecture if the user explicitly asks for a full stack, 3-tier app, complete environment, web application, or microservices architecture.
5. Return valid JSON only with keys:
   - name: string (e.g. "Standalone S3 Storage", "Serverless Event Pipeline", "Three-Tier Web Application")
   - description: string
   - cloudProvider: "AWS" | "AZURE" | "GCP"
   - rationale: string (explaining why this exact architecture was chosen based on user request)
   - estimatedCostMonthlyUsd: number
   - resources: array of objects with:
     - kind: "network" | "compute" | "database" | "storage" | "serverless" | "nosql" | "queue" | "loadbalancer" | "kubernetes"
     - label: string (e.g. "S3 Asset Bucket", "Workload Lambda", "Orders DynamoDB")
     - config: key-value configuration overrides (e.g. bucket_name_prefix: "app-data", function_name: "order-processor", table_name: "orders", queue_name: "events")
   - connections: array of objects with:
     - sourceLabel: string (matches a resource label)
     - targetLabel: string (matches a resource label)
     - label: optional string
${preferredProvider && preferredProvider !== 'MULTI' ? `Strictly use cloud provider: ${preferredProvider}.` : ''}
`;

    // Try available active models with graceful fallback
    const models = [
      'gemini-3.1-flash-lite',
      'gemini-3.5-flash-lite',
      'gemini-flash-latest',
      'gemini-3.8-flash',
    ];
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
              temperature: 0.1,
            },
          }),
        });

        if (!response.ok) {
          const errBody = await response.text();
          logger.warn(`Model ${model} returned HTTP ${response.status}: ${errBody.slice(0, 120)}`);
          continue;
        }

        const data: any = await response.json();
        const contentText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!contentText) {
          continue;
        }

        const parsed = JSON.parse(contentText);
        return this.transformGeminiResponseToDesign(parsed, preferredProvider);
      } catch (err: any) {
        lastError = err;
      }
    }

    throw lastError || new Error('Failed to generate architecture with Gemini API');
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

    const labelToIdMap = new Map<string, string>();
    const nodes: GeneratedNode[] = [];

    // Categorize resources
    const networks = resources.filter((r) => r.kind === 'network');
    const loadbalancers = resources.filter((r) => r.kind === 'loadbalancer');
    const computes = resources.filter(
      (r) => r.kind === 'compute' || r.kind === 'serverless' || r.kind === 'kubernetes',
    );
    const dataServices = resources.filter(
      (r) => r.kind === 'database' || r.kind === 'nosql' || r.kind === 'storage' || r.kind === 'queue',
    );

    let idx = 1;

    const getMonthlyCost = (kind: NodeKind) => {
      switch (kind) {
        case 'database':
          return 35;
        case 'compute':
          return 22;
        case 'kubernetes':
          return 45;
        case 'loadbalancer':
          return 18;
        case 'nosql':
          return 8;
        case 'storage':
          return 6;
        case 'serverless':
          return 5;
        case 'queue':
          return 2;
        case 'network':
        default:
          return 0;
      }
    };

    const addNode = (r: any, x: number, y: number) => {
      const id = `node_${idx++}`;
      labelToIdMap.set(r.label, id);
      const kind: NodeKind = (r.kind as NodeKind) || 'compute';
      const templateRef =
        NODE_TEMPLATE_MAP[kind]?.[provider] || `templates/${provider.toLowerCase()}/${kind}`;

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
          monthlyCost: getMonthlyCost(kind),
          notes: r.notes || `${provider} managed ${kind} resource`,
        },
      });
    };

    // If only 1 resource is requested, center it cleanly!
    if (resources.length === 1) {
      addNode(resources[0], 280, 160);
    } else if (resources.length <= 3 && networks.length === 0) {
      // 2 or 3 standalone resources without network (e.g. serverless + nosql + queue)
      resources.forEach((r, i) => addNode(r, 120 + i * 260, 160));
    } else {
      // Tiered Grid layout
      let startX = 80;
      if (networks.length === 0) startX = 120;

      networks.forEach((r, i) => addNode(r, startX, 140 + i * 180));
      loadbalancers.forEach((r, i) => addNode(r, startX + 260, 120 + i * 160));
      computes.forEach((r, i) => addNode(r, startX + (networks.length > 0 ? 320 : 0), 100 + i * 160));
      dataServices.forEach((r, i) => addNode(r, startX + (networks.length > 0 ? 600 : 280), 100 + i * 160));

      if (nodes.length === 0) {
        resources.forEach((r, i) => addNode(r, 120 + (i % 3) * 260, 120 + Math.floor(i / 3) * 160));
      }
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

    // Auto-connect network -> compute workloads if multi-node and no explicit edges
    if (edges.length === 0 && networks.length > 0 && nodes.length > 1) {
      const networkNodeId = nodes[0].id;
      nodes.slice(1).forEach((workload, wIdx) => {
        edges.push({
          id: `edge_auto_${wIdx + 1}`,
          source: networkNodeId,
          target: workload.id,
        });
      });
    }

    const calculatedCost = nodes.reduce((sum, n) => sum + (n.data.monthlyCost || 0), 0);

    return {
      name: geminiData.name || `${provider} Architecture`,
      description: geminiData.description || `Optimized ${provider} infrastructure matching requested scope`,
      cloudProvider: provider,
      rationale:
        geminiData.rationale ||
        `Architected specifically to satisfy user requirements with a scoped resource topology.`,
      estimatedCostMonthlyUsd: Number(geminiData.estimatedCostMonthlyUsd) || calculatedCost || 15,
      nodes,
      edges,
    };
  }

  /**
   * Smart rule-based heuristic generator for offline mode or when GEMINI_API_KEY is not configured.
   * Analyzes prompt to deliver EXACTLY what the user asks for instead of always defaulting to 3-tier.
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

    const wantsStorage =
      lower.includes('s3') ||
      lower.includes('storage') ||
      lower.includes('bucket') ||
      lower.includes('blob') ||
      lower.includes('gcs');

    const wantsServerless =
      lower.includes('lambda') ||
      lower.includes('serverless') ||
      lower.includes('function') ||
      lower.includes('func');

    const wantsNoSql =
      lower.includes('dynamo') ||
      lower.includes('dynamodb') ||
      lower.includes('nosql') ||
      lower.includes('cosmos') ||
      lower.includes('firestore');

    const wantsQueue =
      lower.includes('sqs') ||
      lower.includes('queue') ||
      lower.includes('pubsub') ||
      lower.includes('servicebus') ||
      lower.includes('messaging');

    const wantsLoadBalancer =
      lower.includes('alb') ||
      lower.includes('load balancer') ||
      lower.includes('loadbalancer') ||
      lower.includes('elb') ||
      lower.includes('ingress');

    const wantsDatabase =
      lower.includes('db') ||
      lower.includes('database') ||
      lower.includes('postgres') ||
      lower.includes('sql') ||
      lower.includes('rds');

    const wantsCompute =
      lower.includes('ec2') ||
      lower.includes('compute') ||
      lower.includes('vm') ||
      lower.includes('server') ||
      lower.includes('instance');

    const wantsNetwork =
      lower.includes('vpc') ||
      lower.includes('vnet') ||
      lower.includes('network') ||
      lower.includes('subnet');

    const isExplicitSingle =
      lower.includes('only') ||
      lower.includes('just') ||
      lower.includes('single') ||
      lower.includes('alone') ||
      lower.includes('standalone');

    const isThreeTier =
      lower.includes('three-tier') ||
      lower.includes('three tier') ||
      lower.includes('3-tier') ||
      lower.includes('3 tier') ||
      lower.includes('full stack') ||
      lower.includes('fullstack') ||
      lower.includes('web app') ||
      lower.includes('microservice');

    const nodes: GeneratedNode[] = [];
    const edges: GeneratedEdge[] = [];

    // CASE 1: User asked for ONLY S3 / Storage (e.g. "only want s3 bucket", "just an s3 bucket")
    if ((wantsStorage && (isExplicitSingle || (!wantsCompute && !wantsDatabase && !wantsServerless && !wantsNetwork && !isThreeTier)))) {
      const storageLabel =
        provider === 'AZURE' ? 'Blob Storage Container' : provider === 'GCP' ? 'Cloud Storage Bucket' : 'S3 Object Storage';

      nodes.push({
        id: 'node_storage',
        kind: 'storage',
        position: { x: 280, y: 160 },
        data: {
          kind: 'storage',
          label: storageLabel,
          provider,
          templateRef: NODE_TEMPLATE_MAP['storage'][provider],
          config: {
            bucket_name_prefix: 'platform-assets',
            enable_versioning: true,
          },
          monthlyCost: 6,
          notes: 'Encrypted object storage bucket with private access enforcement',
        },
      });

      return {
        name: `Standalone ${provider} Storage`,
        description: `Dedicated ${storageLabel} matching your scoped requirement`,
        cloudProvider: provider,
        rationale: `The user requested standalone storage without additional networking or compute tiers. Configured with default AES-256 encryption and public access prevention.`,
        estimatedCostMonthlyUsd: 6,
        nodes,
        edges,
      };
    }

    // CASE 2: User asked for Serverless (Lambda / Function) with or without NoSQL / Queue
    if (wantsServerless && !isThreeTier) {
      const fnLabel =
        provider === 'AZURE' ? 'Azure Function App' : provider === 'GCP' ? 'GCP Cloud Function' : 'Lambda Function';

      nodes.push({
        id: 'node_fn',
        kind: 'serverless',
        position: { x: 160, y: 160 },
        data: {
          kind: 'serverless',
          label: fnLabel,
          provider,
          templateRef: NODE_TEMPLATE_MAP['serverless'][provider],
          config: { function_name: 'workload-processor', runtime: provider === 'AWS' ? 'nodejs18.x' : 'nodejs18' },
          monthlyCost: 5,
          notes: 'Event-driven serverless compute runtime',
        },
      });

      if (wantsNoSql || (!wantsStorage && !wantsQueue)) {
        const nosqlLabel =
          provider === 'AZURE' ? 'Cosmos DB NoSQL' : provider === 'GCP' ? 'Firestore Database' : 'DynamoDB Table';
        nodes.push({
          id: 'node_nosql',
          kind: 'nosql',
          position: { x: 440, y: 120 },
          data: {
            kind: 'nosql',
            label: nosqlLabel,
            provider,
            templateRef: NODE_TEMPLATE_MAP['nosql'][provider],
            config: { table_name: 'app-records', billing_mode: 'PAY_PER_REQUEST' },
            monthlyCost: 8,
            notes: 'High-throughput serverless NoSQL database',
          },
        });
        edges.push({ id: 'edge_fn_nosql', source: 'node_fn', target: 'node_nosql' });
      }

      if (wantsQueue) {
        const queueLabel =
          provider === 'AZURE' ? 'Service Bus Queue' : provider === 'GCP' ? 'Pub/Sub Topic' : 'SQS Message Queue';
        nodes.push({
          id: 'node_queue',
          kind: 'queue',
          position: { x: 440, y: 280 },
          data: {
            kind: 'queue',
            label: queueLabel,
            provider,
            templateRef: NODE_TEMPLATE_MAP['queue'][provider],
            config: { queue_name: 'workload-events' },
            monthlyCost: 2,
            notes: 'Decoupled message broker queue',
          },
        });
        edges.push({ id: 'edge_fn_queue', source: 'node_fn', target: 'node_queue' });
      }

      const totalCost = nodes.reduce((sum, n) => sum + (n.data.monthlyCost || 0), 0);
      return {
        name: `${provider} Serverless Architecture`,
        description: `Event-driven serverless workload matching your specification`,
        cloudProvider: provider,
        rationale: `Engineered with serverless compute and decoupled state storage for high availability, zero idle costs, and instant scaling.`,
        estimatedCostMonthlyUsd: totalCost,
        nodes,
        edges,
      };
    }

    // CASE 3: User asked for NoSQL Table only
    if (wantsNoSql && (isExplicitSingle || (!wantsCompute && !wantsDatabase && !wantsNetwork && !isThreeTier))) {
      const nosqlLabel =
        provider === 'AZURE' ? 'Cosmos DB NoSQL' : provider === 'GCP' ? 'Firestore Database' : 'DynamoDB Table';
      nodes.push({
        id: 'node_nosql',
        kind: 'nosql',
        position: { x: 280, y: 160 },
        data: {
          kind: 'nosql',
          label: nosqlLabel,
          provider,
          templateRef: NODE_TEMPLATE_MAP['nosql'][provider],
          config: { table_name: 'app-records', billing_mode: 'PAY_PER_REQUEST' },
          monthlyCost: 8,
          notes: 'Scalable serverless NoSQL datastore',
        },
      });
      return {
        name: `Standalone ${provider} NoSQL Database`,
        description: `Managed ${nosqlLabel} with on-demand capacity`,
        cloudProvider: provider,
        rationale: `Provisioned as a standalone NoSQL datastore per user request with pay-per-request throughput and automated encryption at rest.`,
        estimatedCostMonthlyUsd: 8,
        nodes,
        edges,
      };
    }

    // CASE 4: Standard / Multi-Tier Infrastructure (VPC + Compute / LB + Database / Storage)
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

    if (wantsLoadBalancer) {
      const albLabel = provider === 'AZURE' ? 'Azure Load Balancer' : provider === 'GCP' ? 'Cloud HTTP LB' : 'Application Load Balancer';
      nodes.push({
        id: 'node_alb',
        kind: 'loadbalancer',
        position: { x: 320, y: 160 },
        data: {
          kind: 'loadbalancer',
          label: albLabel,
          provider,
          templateRef: NODE_TEMPLATE_MAP['loadbalancer'][provider],
          config: { alb_name: 'ingress-alb' },
          monthlyCost: 18,
          notes: 'High-availability ingress traffic distributor',
        },
      });
      edges.push({ id: 'edge_vpc_alb', source: 'node_vpc', target: 'node_alb' });
    }

    const webLabel = provider === 'AZURE' ? 'Web VM Tier' : provider === 'GCP' ? 'Compute Engine Web' : 'Web Tier Cluster';
    nodes.push({
      id: 'node_web',
      kind: 'compute',
      position: { x: wantsLoadBalancer ? 560 : 360, y: 120 },
      data: {
        kind: 'compute',
        label: webLabel,
        provider,
        templateRef: NODE_TEMPLATE_MAP['compute'][provider],
        config: {
          server_name: 'prod-frontend',
          instance_type: provider === 'AWS' ? 't3.micro' : 'Standard_B1s',
          allocated_storage_gb: 20,
        },
        monthlyCost: 18,
        notes: 'Workload instances with automated HTTP/HTTPS ingress security rules',
      },
    });

    if (wantsLoadBalancer) {
      edges.push({ id: 'edge_alb_web', source: 'node_alb', target: 'node_web' });
    } else {
      edges.push({ id: 'edge_vpc_web', source: 'node_vpc', target: 'node_web' });
    }

    if (wantsDatabase || (!wantsStorage && !wantsNoSql)) {
      const dbLabel = provider === 'AZURE' ? 'PostgreSQL Flexible' : provider === 'GCP' ? 'Cloud SQL Postgres' : 'RDS PostgreSQL';
      nodes.push({
        id: 'node_db',
        kind: 'database',
        position: { x: wantsLoadBalancer ? 820 : 640, y: 120 },
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
          notes: 'Managed PostgreSQL relational database with automated storage encryption',
        },
      });
      edges.push({ id: 'edge_vpc_db', source: 'node_vpc', target: 'node_db' });
    }

    if (wantsStorage) {
      const storageLabel = provider === 'AZURE' ? 'Blob Storage' : provider === 'GCP' ? 'Cloud Storage' : 'S3 Storage';
      nodes.push({
        id: 'node_storage',
        kind: 'storage',
        position: { x: wantsLoadBalancer ? 820 : 640, y: 280 },
        data: {
          kind: 'storage',
          label: storageLabel,
          provider,
          templateRef: NODE_TEMPLATE_MAP['storage'][provider],
          config: { bucket_name_prefix: 'app-assets', enable_versioning: true },
          monthlyCost: 6,
          notes: 'Secure cloud object storage',
        },
      });
      edges.push({ id: 'edge_web_storage', source: 'node_web', target: 'node_storage' });
    }

    const totalCost = nodes.reduce((sum, n) => sum + (n.data.monthlyCost || 0), 0);

    return {
      name: `${provider} Infrastructure Topology`,
      description: `Optimized ${provider} infrastructure matching your workload requirements`,
      cloudProvider: provider,
      rationale: `Architected with an isolated ${vpcLabel} to secure network boundaries, a scalable compute tier for application serving, and segregated backend data tiers for zero-trust security.`,
      estimatedCostMonthlyUsd: totalCost || 53,
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
