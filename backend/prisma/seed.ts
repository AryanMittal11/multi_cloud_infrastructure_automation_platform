import { PrismaClient, Role, Provider } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // 1. Seed Users
  const passwordHash = await bcrypt.hash('AdminPassword123!', 10);
  const devPasswordHash = await bcrypt.hash('DevPassword123!', 10);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@multicloud.local' },
    update: {},
    create: {
      name: 'Platform Administrator',
      email: 'admin@multicloud.local',
      passwordHash,
      role: Role.ADMIN,
    },
  });

  const developer = await prisma.user.upsert({
    where: { email: 'dev@multicloud.local' },
    update: {},
    create: {
      name: 'DevOps Engineer',
      email: 'dev@multicloud.local',
      passwordHash: devPasswordHash,
      role: Role.DEVELOPER,
    },
  });

  console.log(`✅ Seeded users: ${admin.email} (ADMIN), ${developer.email} (DEVELOPER)`);

  // 2. Seed Default Project
  const project = await prisma.project.upsert({
    where: { id: '00000000-0000-0000-0000-000000000001' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000001',
      name: 'Default Cloud Infrastructure',
      description: 'Primary project for enterprise multi-cloud workloads and templates',
      ownerId: admin.id,
    },
  });

  // 3. Seed Environments
  const envDev = await prisma.environment.upsert({
    where: {
      projectId_name: {
        projectId: project.id,
        name: 'development',
      },
    },
    update: {},
    create: {
      name: 'development',
      projectId: project.id,
    },
  });

  const envProd = await prisma.environment.upsert({
    where: {
      projectId_name: {
        projectId: project.id,
        name: 'production',
      },
    },
    update: {},
    create: {
      name: 'production',
      projectId: project.id,
    },
  });

  console.log(`✅ Seeded project "${project.name}" with environments [${envDev.name}, ${envProd.name}]`);

  // 4. Seed Canonical Templates (AWS & Cross-Cloud)
  const templates = [
    {
      id: '10000000-0000-0000-0000-000000000001',
      name: 'AWS Modular VPC',
      provider: Provider.AWS,
      version: '1.0.0',
      description: 'Standard multi-AZ Virtual Private Cloud with public/private subnets and route tables',
      templateReference: 'templates/aws/aws_vpc',
      inputSchema: {
        type: 'object',
        required: ['vpc_cidr', 'environment_name'],
        properties: {
          vpc_cidr: {
            type: 'string',
            default: '10.0.0.0/16',
            description: 'CIDR block for the VPC',
          },
          environment_name: {
            type: 'string',
            default: 'dev-network',
            description: 'Name tag for network resources',
          },
          enable_nat_gateway: {
            type: 'boolean',
            default: true,
            description: 'Whether to deploy a NAT Gateway for private subnets',
          },
        },
      },
    },
    {
      id: '10000000-0000-0000-0000-000000000002',
      name: 'AWS EC2 Web Server',
      provider: Provider.AWS,
      version: '1.0.0',
      description: 'Scalable Linux compute instance with attached security group and public Elastic IP',
      templateReference: 'templates/aws/aws_ec2_web',
      inputSchema: {
        type: 'object',
        required: ['instance_type', 'server_name'],
        properties: {
          instance_type: {
            type: 'string',
            enum: ['t3.micro', 't3.small', 't3.medium', 't3.large'],
            default: 't3.micro',
            description: 'EC2 instance compute size',
          },
          server_name: {
            type: 'string',
            default: 'web-frontend',
            description: 'Human-readable server name tag',
          },
          allocated_storage_gb: {
            type: 'number',
            default: 20,
            description: 'Root EBS volume size in GB',
          },
        },
      },
    },
    {
      id: '10000000-0000-0000-0000-000000000003',
      name: 'AWS RDS PostgreSQL Database',
      provider: Provider.AWS,
      version: '1.0.0',
      description: 'Automated relational database service running PostgreSQL engine',
      templateReference: 'templates/aws/aws_rds_postgres',
      inputSchema: {
        type: 'object',
        required: ['db_name', 'db_instance_class'],
        properties: {
          db_name: {
            type: 'string',
            default: 'appdb',
            description: 'Initial database name',
          },
          db_instance_class: {
            type: 'string',
            default: 'db.t3.micro',
            description: 'RDS compute instance tier',
          },
          allocated_storage: {
            type: 'number',
            default: 20,
            description: 'Allocated storage in GB',
          },
        },
      },
    },
    {
      id: '10000000-0000-0000-0000-000000000004',
      name: 'Universal Web Stack (Cross-Cloud)',
      provider: null, // Cross-cloud portable
      version: '1.0.0',
      description: 'Portable architecture template mapped dynamically across AWS, Azure, or GCP',
      templateReference: 'templates/cross_cloud/web_stack',
      inputSchema: {
        type: 'object',
        required: ['tier', 'region'],
        properties: {
          tier: {
            type: 'string',
            enum: ['small', 'medium', 'large'],
            default: 'small',
            description: 'Normalized sizing across target cloud providers',
          },
          region: {
            type: 'string',
            default: 'us-east-1',
            description: 'Target region',
          },
        },
      },
    },
  ];

  for (const t of templates) {
    await prisma.template.upsert({
      where: { id: t.id },
      update: {},
      create: {
        id: t.id,
        name: t.name,
        provider: t.provider,
        version: t.version,
        description: t.description,
        templateReference: t.templateReference,
        inputSchema: t.inputSchema,
      },
    });
  }

  console.log(`✅ Seeded ${templates.length} canonical infrastructure templates`);
  console.log('🎉 Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
