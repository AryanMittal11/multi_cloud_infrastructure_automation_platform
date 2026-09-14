/**
 * Admin Showcase — prepares representative artifacts the first time an
 * ADMIN signs in, so every platform capability is visible immediately:
 *
 *  - "Showcase" project with development/staging/production environments
 *  - A mock AWS cloud account bound to development
 *  - Two saved visual designs (three-tier web stack, network foundation)
 *  - One SUCCEEDED CREATE deployment with recorded resources (VPC + web server)
 *
 * Idempotent: guarded by an audit marker (SHOWCASE_PREPARED), so repeat
 * logins are no-ops. Failures never block login itself.
 */

import { prisma } from '../../config/prisma';
import { Provider } from '@prisma/client';
import { encryptCredential } from '../../utils/crypto';
import { logger } from '../../utils/logger';

const SHOWCASE_MARKER = 'SHOWCASE_PREPARED';
const SHOWCASE_PROJECT_NAME = 'Showcase';

export class ShowcaseService {
  async prepareShowcaseForAdmin(adminUserId: string): Promise<void> {
    try {
      // Idempotency: skip if already prepared
      const marker = await prisma.auditLog.findFirst({
        where: { action: SHOWCASE_MARKER, status: 'SUCCESS' },
      });
      if (marker) return;

      // Never owned by the seeded demo admin only — any first admin login triggers it
      await this.seedShowcase(adminUserId);
    } catch (err) {
      // Showcase is best-effort; never block authentication
      logger.warn(`Showcase preparation skipped: ${(err as Error).message}`);
    }
  }

  private async seedShowcase(adminUserId: string): Promise<void> {
    // ---- Project + environments ----
    const project = await prisma.project.create({
      data: {
        name: SHOWCASE_PROJECT_NAME,
        description:
          'Demo workspace prepared for admins: a three-tier web stack across environments, bound to a sandboxed AWS account.',
        ownerId: adminUserId,
      },
    });

    await prisma.environment.createMany({
      data: [
        { name: 'development', projectId: project.id },
        { name: 'staging', projectId: project.id },
        { name: 'production', projectId: project.id },
      ],
    });
    const development = await prisma.environment.findFirstOrThrow({
      where: { projectId: project.id, name: 'development' },
    });

    // ---- Mock AWS cloud account (sandbox keys accepted by the validator) ----
    const account = await prisma.cloudAccount.create({
      data: {
        name: 'Showcase AWS (sandbox)',
        provider: Provider.AWS,
        accountReference: '123456789012',
        encryptedCredentialReference: encryptCredential({
          accessKeyId: 'AKIA_MOCK_SHOWCASE0001',
          secretAccessKey: 'showcase-mock-secret-key-0123456789',
        }),
        ownerId: adminUserId,
        projectId: project.id,
      },
    });

    await prisma.environment.update({
      where: { id: development.id },
      data: { cloudAccountId: account.id },
    });

    // ---- Template (synced catalog: aws_vpc + aws_ec2_web are used below) ----
    const vpcTemplate = await prisma.template.findFirst({
      where: { templateReference: 'templates/aws/aws_vpc' },
    });
    const webTemplate = await prisma.template.findFirst({
      where: { templateReference: 'templates/aws/aws_ec2_web' },
    });

    // ---- Saved designs (visual designer artifacts) ----
    const showcaseDesignNodes = [
      {
        id: 'n-vpc',
        type: 'infra',
        position: { x: 80, y: 160 },
        data: {
          kind: 'network',
          label: 'Showcase VPC',
          provider: 'AWS',
          templateRef: 'templates/aws/aws_vpc',
          config: { vpc_cidr: '10.20.0.0/16' },
        },
      },
      {
        id: 'n-web',
        type: 'infra',
        position: { x: 360, y: 120 },
        data: {
          kind: 'compute',
          label: 'Web tier',
          provider: 'AWS',
          templateRef: 'templates/aws/aws_ec2_web',
          config: { instance_type: 't3.small', instance_count: 2 },
        },
      },
      {
        id: 'n-db',
        type: 'infra',
        position: { x: 360, y: 260 },
        data: {
          kind: 'database',
          label: 'Database tier',
          provider: 'AWS',
          templateRef: 'templates/aws/aws_rds_postgres',
          config: { db_instance_class: 'db.t3.micro' },
        },
      },
    ];
    const showcaseDesignEdges = [
      { id: 'e-vpc-web', source: 'n-vpc', target: 'n-web' },
      { id: 'e-vpc-db', source: 'n-vpc', target: 'n-db' },
    ];

    if (webTemplate) {
      await prisma.architectureDesign.create({
        data: {
          name: 'Three-tier web stack',
          description: 'VPC → web tier → Postgres — the classic landing pattern.',
          cloudProvider: 'AWS',
          nodes: showcaseDesignNodes as any,
          edges: showcaseDesignEdges as any,
          ownerId: adminUserId,
        },
      });
    }

    await prisma.architectureDesign.create({
      data: {
        name: 'Network foundation',
        description: 'Isolated VPC with public/private subnets — start here, then attach workloads.',
        cloudProvider: 'AWS',
        nodes: [showcaseDesignNodes[0]] as any,
        edges: [] as any,
        ownerId: adminUserId,
      },
    });

    // ---- Completed deployment with recorded resources (if templates exist) ----
    if (vpcTemplate && webTemplate) {
      const deployment = await prisma.deployment.create({
        data: {
          projectId: project.id,
          environmentId: development.id,
          templateId: webTemplate.id,
          userId: adminUserId,
          operationType: 'CREATE',
          status: 'SUCCEEDED',
          configuration: {
            region: 'us-east-1',
            instance_type: 't3.small',
            instance_count: 2,
            volume_size: 20,
          },
          planOutput: [
            'Terraform used the selected providers to generate the following execution plan.',
            'Plan: 2 to add, 0 to change, 0 to destroy.',
          ].join('\n'),
          applyOutput: [
            'aws_vpc.showcase: Creating...',
            'aws_vpc.showcase: Creation complete after 2s',
            'aws_instance.web[0]: Creating...',
            'aws_instance.web[1]: Creating...',
            'aws_instance.web[0]: Creation complete after 3s',
            'aws_instance.web[1]: Creation complete after 4s',
            'Apply complete! Resources: 2 added, 0 changed, 0 destroyed.',
          ].join('\n'),
          planTime: new Date(Date.now() - 1000 * 60 * 12),
          applyTime: new Date(Date.now() - 1000 * 60 * 9),
          executionReference: 'showcase-apply-0001',
          policyEvaluation: {
            evaluator: 'builtin-guardrails-v1',
            passed: true,
            results: [
              { rule: 'required-metadata', passed: true, message: 'Deployment carries environment metadata' },
              { rule: 'no-public-admin-access', passed: true, message: 'No public administrative ports exposed' },
            ],
          } as any,
          costEstimate: {
            scope: 'deployment',
            scopeId: 'showcase',
            provider: 'AWS',
            region: 'us-east-1',
            currency: 'USD',
            monthlyTotalUsd: 50,
            lineItems: [
              { resourceType: 'compute', label: 'Compute instance', quantity: 2, unit: 'instance', unitMonthlyUsd: 24, monthlyUsd: 48, basis: 'on-demand general-purpose small tier' },
              { resourceType: 'storage', label: 'Block storage', quantity: 20, unit: 'GB-month', unitMonthlyUsd: 0.1, monthlyUsd: 2, basis: 'standard SSD tier' },
            ],
            assumptions: [
              { label: 'Pricing source', value: 'built-in offline rate card' },
              { label: 'Region', value: 'us-east-1 (multiplier ×1)' },
            ],
            source: 'builtin-rate-card-v1',
            computedAt: new Date().toISOString(),
          } as any,
        },
      });

      // Recorded resources (topology + resources pages render from these)
      const vpcResource = await prisma.resource.create({
        data: {
          deploymentId: deployment.id,
          provider: Provider.AWS,
          resourceType: 'aws_vpc',
          providerResourceId: 'arn:aws:ec2:us-east-1:123456789012:vpc/vpc-showcase0001',
          name: 'showcase-vpc',
          status: 'ACTIVE',
          outputs: { vpc_id: 'vpc-showcase0001', cidr: '10.20.0.0/16' },
          dependencies: [],
        },
      });
      await prisma.resource.create({
        data: {
          deploymentId: deployment.id,
          provider: Provider.AWS,
          resourceType: 'aws_instance',
          providerResourceId: 'arn:aws:ec2:us-east-1:123456789012:instance/i-showcase0001',
          name: 'web-server-1',
          status: 'ACTIVE',
          outputs: { public_ip: '203.0.113.10', instance_type: 't3.small' },
          dependencies: [vpcResource.id],
        },
      });
      await prisma.resource.create({
        data: {
          deploymentId: deployment.id,
          provider: Provider.AWS,
          resourceType: 'aws_instance',
          providerResourceId: 'arn:aws:ec2:us-east-1:123456789012:instance/i-showcase0002',
          name: 'web-server-2',
          status: 'ACTIVE',
          outputs: { public_ip: '203.0.113.11', instance_type: 't3.small' },
          dependencies: [vpcResource.id],
        },
      });

      await prisma.auditLog.create({
        data: {
          userId: adminUserId,
          projectId: project.id,
          deploymentId: deployment.id,
          action: 'DEPLOYMENT_APPLY_SUCCEEDED',
          status: 'SUCCESS',
          message: 'Showcase web stack applied successfully (2 resources)',
        },
      });
    }

    await prisma.auditLog.create({
      data: {
        userId: adminUserId,
        projectId: project.id,
        action: 'PROJECT_CREATED',
        status: 'SUCCESS',
        message: 'Project "Showcase" was created with default environments',
      },
    });

    // Idempotency marker — written last so partial failures retry cleanly
    await prisma.auditLog.create({
      data: {
        userId: adminUserId,
        action: SHOWCASE_MARKER,
        status: 'SUCCESS',
        message: 'Showcase artifacts prepared for admin demo',
      },
    });

    logger.info(`✅ Showcase artifacts prepared for admin [${adminUserId}]`);
  }
}

export const showcaseService = new ShowcaseService();
