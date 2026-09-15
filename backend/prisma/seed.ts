import { PrismaClient, Role, Provider } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // ==========================================
  // 0. Clean Existing Data
  // ==========================================
  console.log('🧹 Cleaning existing data...');
  await prisma.auditLog.deleteMany({});
  await prisma.resource.deleteMany({});
  await prisma.deployment.deleteMany({});
  await prisma.architectureDesign.deleteMany({});
  await prisma.environment.deleteMany({});
  await prisma.project.deleteMany({});
  await prisma.cloudAccount.deleteMany({});
  await prisma.user.deleteMany({});

  // ==========================================
  // 1. Seed Admin (Site Owner)
  // The admin is the platform owner — there should only ever be ONE.
  // Credentials: admin@multicloud.local / AdminPassword123!
  // ==========================================
  const adminPasswordHash = await bcrypt.hash('AdminPassword123!', 10);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@multicloud.local' },
    update: {},
    create: {
      name: 'Site Owner',
      email: 'admin@multicloud.local',
      passwordHash: adminPasswordHash,
      role: Role.ADMIN,
    },
  });

  console.log(`✅ Seeded users:`);
  console.log(`   👑 Site Owner:  ${admin.email}  (ADMIN)   — password: AdminPassword123!`);

  // 2. Seed Canonical Templates (AWS, Azure, GCP & Cross-Cloud)
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
            description: 'Universal region (e.g. us-east-1, europe-west, asia-southeast)',
          },
        },
      },
    },
    // Azure Templates
    {
      id: '20000000-0000-0000-0000-000000000001',
      name: 'Azure Modular VNet',
      provider: Provider.AZURE,
      version: '1.0.0',
      description: 'Configurable Azure Virtual Network with public/private subnets and deny-by-default NSG',
      templateReference: 'templates/azure/azure_vnet',
      inputSchema: {
        type: 'object',
        required: ['environment_name', 'location'],
        properties: {
          environment_name: {
            type: 'string',
            default: 'dev-network',
            description: 'Name prefix for VNet resources',
          },
          location: {
            type: 'string',
            enum: ['eastus', 'westus2', 'northeurope', 'westeurope'],
            default: 'eastus',
            description: 'Azure region',
          },
          vnet_address_space: {
            type: 'string',
            default: '10.1.0.0/16',
            description: 'Address space for the VNet',
          },
        },
      },
    },
    {
      id: '20000000-0000-0000-0000-000000000002',
      name: 'Azure VM Web Server',
      provider: Provider.AZURE,
      version: '1.0.0',
      description: 'Ubuntu Linux VM with Nginx, static public IP, guarded NSG, and encrypted premium disk',
      templateReference: 'templates/azure/azure_vm_web',
      inputSchema: {
        type: 'object',
        required: ['resource_group_name', 'subnet_id', 'admin_ssh_public_key'],
        properties: {
          server_name: {
            type: 'string',
            default: 'web-frontend',
            description: 'Name prefix for VM resources',
          },
          resource_group_name: {
            type: 'string',
            description: 'Existing resource group (typically from the Azure VNet template)',
          },
          subnet_id: {
            type: 'string',
            description: 'Subnet resource ID (typically from the Azure VNet template)',
          },
          vm_size: {
            type: 'string',
            enum: ['Standard_B1s', 'Standard_B2s', 'Standard_B2ms'],
            default: 'Standard_B1s',
            description: 'Azure VM compute tier',
          },
          admin_ssh_public_key: {
            type: 'string',
            description: 'SSH public key for administrative access',
          },
        },
      },
    },
    {
      id: '20000000-0000-0000-0000-000000000003',
      name: 'Azure PostgreSQL Flexible Server',
      provider: Provider.AZURE,
      version: '1.0.0',
      description: 'Managed PostgreSQL with encrypted storage, private DNS, and restricted network access',
      templateReference: 'templates/azure/azure_postgres_flexible',
      inputSchema: {
        type: 'object',
        required: ['resource_group_name', 'vnet_id'],
        properties: {
          server_name: {
            type: 'string',
            default: 'platform-postgres',
            description: 'Globally unique server identifier',
          },
          resource_group_name: {
            type: 'string',
            description: 'Existing resource group (typically from the Azure VNet template)',
          },
          vnet_id: {
            type: 'string',
            description: 'VNet resource ID for private DNS resolution',
          },
          sku_name: {
            type: 'string',
            enum: ['B_Standard_B1ms', 'B_Standard_B2s', 'GP_Standard_D2ds_v4'],
            default: 'B_Standard_B1ms',
            description: 'Flexible Server compute tier',
          },
        },
      },
    },
    {
      id: '20000000-0000-0000-0000-000000000004',
      name: 'Azure Blob Storage Account',
      provider: Provider.AZURE,
      version: '1.0.0',
      description: 'Secure storage account with private container, double encryption, and public access blocked',
      templateReference: 'templates/azure/azure_blob_storage',
      inputSchema: {
        type: 'object',
        required: ['resource_group_name'],
        properties: {
          storage_name_prefix: {
            type: 'string',
            default: 'multicloudstorage',
            description: 'Storage account name prefix (3-16 lowercase alphanumerics)',
          },
          resource_group_name: {
            type: 'string',
            description: 'Existing resource group (typically from the Azure VNet template)',
          },
          replication_type: {
            type: 'string',
            enum: ['LRS', 'ZRS', 'GRS'],
            default: 'LRS',
            description: 'Storage replication strategy',
          },
        },
      },
    },
    // GCP Templates
    {
      id: '30000000-0000-0000-0000-000000000001',
      name: 'GCP Custom VPC Network',
      provider: Provider.GCP,
      version: '1.0.0',
      description: 'Custom GCP VPC with regional subnetworks, Cloud NAT egress, and deny-by-default firewall',
      templateReference: 'templates/gcp/gcp_vpc',
      inputSchema: {
        type: 'object',
        required: ['gcp_project_id', 'environment_name'],
        properties: {
          gcp_project_id: {
            type: 'string',
            description: 'GCP project ID where network resources will be created',
          },
          environment_name: {
            type: 'string',
            default: 'dev-network',
            description: 'Name prefix for VPC resources',
          },
          region: {
            type: 'string',
            enum: ['us-east1', 'us-central1', 'europe-west1', 'asia-southeast1'],
            default: 'us-east1',
            description: 'GCP region',
          },
        },
      },
    },
    {
      id: '30000000-0000-0000-0000-000000000002',
      name: 'GCP Compute Engine Web Server',
      provider: Provider.GCP,
      version: '1.0.0',
      description: 'Ubuntu VM with Nginx, reserved static IP, shielded VM features, and guarded firewall',
      templateReference: 'templates/gcp/gcp_compute_web',
      inputSchema: {
        type: 'object',
        required: ['gcp_project_id', 'network_name', 'subnet_self_link'],
        properties: {
          server_name: {
            type: 'string',
            default: 'web-frontend',
            description: 'Name prefix for instance resources',
          },
          gcp_project_id: {
            type: 'string',
            description: 'GCP project ID',
          },
          network_name: {
            type: 'string',
            description: 'VPC network name (typically from the GCP VPC template)',
          },
          subnet_self_link: {
            type: 'string',
            description: 'Subnetwork self-link (typically from the GCP VPC template)',
          },
          machine_type: {
            type: 'string',
            enum: ['e2-micro', 'e2-small', 'e2-medium'],
            default: 'e2-micro',
            description: 'GCP machine type',
          },
        },
      },
    },
    {
      id: '30000000-0000-0000-0000-000000000003',
      name: 'GCP Cloud SQL PostgreSQL',
      provider: Provider.GCP,
      version: '1.0.0',
      description: 'Managed PostgreSQL with private IP, SSD storage, automated backups, and authorized networks',
      templateReference: 'templates/gcp/gcp_cloud_sql_postgres',
      inputSchema: {
        type: 'object',
        required: ['gcp_project_id', 'network_self_link'],
        properties: {
          instance_name: {
            type: 'string',
            default: 'platform-postgres',
            description: 'Globally unique instance identifier',
          },
          gcp_project_id: {
            type: 'string',
            description: 'GCP project ID',
          },
          network_self_link: {
            type: 'string',
            description: 'VPC network self-link for private IP connectivity',
          },
          tier: {
            type: 'string',
            enum: ['db-f1-micro', 'db-g1-small', 'db-custom-2-7680'],
            default: 'db-f1-micro',
            description: 'Cloud SQL machine tier',
          },
        },
      },
    },
    {
      id: '30000000-0000-0000-0000-000000000004',
      name: 'GCP Cloud Storage Bucket',
      provider: Provider.GCP,
      version: '1.0.0',
      description: 'Secure bucket with public access prevention, uniform IAM, encryption, and versioning',
      templateReference: 'templates/gcp/gcp_storage_bucket',
      inputSchema: {
        type: 'object',
        required: ['gcp_project_id'],
        properties: {
          bucket_name_prefix: {
            type: 'string',
            default: 'multicloud-storage',
            description: 'Bucket name prefix (random suffix appended for uniqueness)',
          },
          gcp_project_id: {
            type: 'string',
            description: 'GCP project ID',
          },
          location: {
            type: 'string',
            enum: ['US', 'EU', 'ASIA', 'us-east1', 'europe-west1'],
            default: 'US',
            description: 'GCP location (multi-region or region)',
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
