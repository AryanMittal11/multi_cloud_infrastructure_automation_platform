import { Provider } from '@prisma/client';
import { cloudMapper } from './cloud.mapper';
import { outputNormalizer } from './output.normalizer';
import {
  COMPUTE_TIER_SKU_MAP,
  REGION_MAP,
  ARCHETYPE_SPECS,
  ComputeTier,
  UniversalRegion,
} from './portability.types';

describe('CloudMapper (Sub-Phase 2.3.2)', () => {
  describe('Compute tier translation', () => {
    it.each([
      ['small', 't3.micro', 'Standard_B1s', 'e2-micro'],
      ['medium', 't3.medium', 'Standard_B2s', 'e2-medium'],
      ['large', 't3.xlarge', 'Standard_B4ms', 'e2-standard-4'],
    ] as Array<[ComputeTier, string, string, string]>)(
      'maps tier "%s" to provider SKUs across all clouds',
      (tier, aws, azure, gcp) => {
        expect(COMPUTE_TIER_SKU_MAP.AWS[tier].compute).toBe(aws);
        expect(COMPUTE_TIER_SKU_MAP.AZURE[tier].compute).toBe(azure);
        expect(COMPUTE_TIER_SKU_MAP.GCP[tier].compute).toBe(gcp);
      },
    );

    it('maps the canonical web-service-stack medium intent onto each provider', () => {
      const intent = { archetype: 'web-service-stack' as const, tier: 'medium' as const, region: 'us-east-1' as const };

      const awsPlan = cloudMapper.mapIntent(intent, Provider.AWS);
      expect(awsPlan.computeSku).toBe('t3.medium');
      expect(awsPlan.databaseSku).toBe('db.t3.medium');
      expect(awsPlan.region).toBe('us-east-1');
      expect(awsPlan.modules).toEqual(['aws_vpc', 'aws_ec2_web', 'aws_rds_postgres']);

      const azurePlan = cloudMapper.mapIntent(intent, Provider.AZURE);
      expect(azurePlan.computeSku).toBe('Standard_B2s');
      expect(azurePlan.region).toBe('eastus');
      expect(azurePlan.modules).toEqual(['azure_vnet', 'azure_vm_web', 'azure_postgres_flexible']);

      const gcpPlan = cloudMapper.mapIntent(intent, Provider.GCP);
      expect(gcpPlan.computeSku).toBe('e2-medium');
      expect(gcpPlan.region).toBe('us-east1');
      expect(gcpPlan.modules).toEqual(['gcp_vpc', 'gcp_compute_web', 'gcp_cloud_sql_postgres']);
    });
  });

  describe('Regional normalization', () => {
    it('normalizes a universal region across all providers (us-east-1 <-> eastus <-> us-east1)', () => {
      const intent = { archetype: 'secure-network' as const, tier: 'small' as const, region: 'us-east-1' as const };

      expect(cloudMapper.mapIntent(intent, Provider.AWS).region).toBe('us-east-1');
      expect(cloudMapper.mapIntent(intent, Provider.AZURE).region).toBe('eastus');
      expect(cloudMapper.mapIntent(intent, Provider.GCP).region).toBe('us-east1');
    });

    it('normalizes the european region across all providers', () => {
      const intent = { archetype: 'secure-network' as const, tier: 'small' as const, region: 'europe-west' as const };

      expect(cloudMapper.mapIntent(intent, Provider.AWS).region).toBe('eu-west-1');
      expect(cloudMapper.mapIntent(intent, Provider.AZURE).region).toBe('westeurope');
      expect(cloudMapper.mapIntent(intent, Provider.GCP).region).toBe('europe-west1');
    });

    it('translates provider-native regions back to the universal identifier', () => {
      expect(cloudMapper.toUniversalRegion(Provider.AWS, 'us-east-1')).toBe('us-east-1');
      expect(cloudMapper.toUniversalRegion(Provider.AZURE, 'eastus')).toBe('us-east-1');
      expect(cloudMapper.toUniversalRegion(Provider.GCP, 'us-east1')).toBe('us-east-1');
      expect(cloudMapper.toUniversalRegion(Provider.AWS, 'mars-central-1')).toBeNull();
    });
  });

  describe('Archetype framework (Sub-Phase 2.3.1)', () => {
    it('defines the three unified archetypes with provider module chains', () => {
      const archetypes = cloudMapper.describeArchetypes();
      expect(archetypes.map((a) => a.archetype).sort()).toEqual([
        'secure-network',
        'storage-backend',
        'web-service-stack',
      ]);

      expect(ARCHETYPE_SPECS['storage-backend'].moduleMap.AWS).toEqual(['aws_vpc', 'aws_s3_bucket']);
      expect(ARCHETYPE_SPECS['storage-backend'].moduleMap.AZURE).toEqual([
        'azure_vnet',
        'azure_blob_storage',
      ]);
      expect(ARCHETYPE_SPECS['storage-backend'].moduleMap.GCP).toEqual(['gcp_vpc', 'gcp_storage_bucket']);
    });

    it('rejects unknown archetypes and tiers', () => {
      expect(() =>
        cloudMapper.mapIntent(
          { archetype: 'quantum-fleet' as any, tier: 'small', region: 'us-east-1' },
          Provider.AWS,
        ),
      ).toThrow('Unknown template archetype');

      expect(() =>
        cloudMapper.mapIntent(
          { archetype: 'secure-network', tier: 'gigantic' as any, region: 'us-east-1' },
          Provider.AWS,
        ),
      ).toThrow('Unknown compute tier');
    });
  });

  describe('Cross-provider comparison', () => {
    it('produces comparable plans across AWS, Azure, and GCP', () => {
      const intent = { archetype: 'web-service-stack' as const, tier: 'large' as const, region: 'asia-southeast' as const };
      const plans = cloudMapper.compareAcrossProviders(intent);

      expect(plans).toHaveLength(3);
      expect(plans.map((p) => p.provider)).toEqual([Provider.AWS, Provider.AZURE, Provider.GCP]);
      expect(plans.map((p) => p.region)).toEqual(['ap-southeast-1', 'southeastasia', 'asia-southeast1']);
    });
  });
});

describe('OutputNormalizer (Sub-Phase 2.3.3)', () => {
  it('normalizes AWS outputs into platform descriptors', () => {
    const normalized = outputNormalizer.normalize({
      provider: Provider.AWS,
      outputs: {
        public_ip: '54.210.10.1',
        db_instance_endpoint: 'appdb.abc123.us-east-1.rds.amazonaws.com',
        bucket_domain_name: 'my-bucket.s3.amazonaws.com',
        vpc_id: 'vpc-0abc123',
        availability_zone: 'us-east-1a',
      },
    });

    expect(normalized.compute_public_ip).toBe('54.210.10.1');
    expect(normalized.database_endpoint).toBe('appdb.abc123.us-east-1.rds.amazonaws.com');
    expect(normalized.storage_uri).toBe('my-bucket.s3.amazonaws.com');
    expect(normalized.network_id).toBe('vpc-0abc123');
    expect(normalized.extras.availability_zone).toBe('us-east-1a');
  });

  it('normalizes Azure outputs into platform descriptors', () => {
    const normalized = outputNormalizer.normalize({
      provider: Provider.AZURE,
      outputs: {
        public_ip_address: '20.101.5.22',
        fqdn: 'platform-postgres.eastus.postgres.database.azure.com',
        storage_uri: 'https://multicloudstorage.blob.core.windows.net/',
        vnet_id: '/subscriptions/sub/resourceGroups/rg/providers/Microsoft.Network/virtualNetworks/vnet',
      },
    });

    expect(normalized.compute_public_ip).toBe('20.101.5.22');
    expect(normalized.database_endpoint).toBe('platform-postgres.eastus.postgres.database.azure.com');
    expect(normalized.storage_uri).toBe('https://multicloudstorage.blob.core.windows.net/');
    expect(normalized.network_id).toContain('/virtualNetworks/vnet');
  });

  it('normalizes GCP outputs into platform descriptors', () => {
    const normalized = outputNormalizer.normalize({
      provider: Provider.GCP,
      outputs: {
        public_ip_address: '34.73.200.10',
        database_endpoint: '10.5.0.3',
        storage_uri: 'gs://my-bucket',
        network_self_link: 'https://www.googleapis.com/compute/v1/projects/p/global/networks/vpc',
      },
    });

    expect(normalized.compute_public_ip).toBe('34.73.200.10');
    expect(normalized.database_endpoint).toBe('10.5.0.3');
    expect(normalized.storage_uri).toBe('gs://my-bucket');
    expect(normalized.network_id).toContain('/networks/vpc');
  });

  it('unwraps Terraform-sensitive value wrappers and arrays', () => {
    const normalized = outputNormalizer.normalize({
      provider: Provider.AWS,
      outputs: {
        public_ip: { value: '1.2.3.4' },
        fqdn: ['wrapped.example.com'],
      },
    });

    expect(normalized.compute_public_ip).toBe('1.2.3.4');
    expect(normalized.database_endpoint).toBe('wrapped.example.com');
  });

  it('resolves a single descriptor on demand', () => {
    expect(
      outputNormalizer.resolveDescriptor('compute_public_ip', {
        provider: Provider.AZURE,
        outputs: { public_ip_address: '52.1.1.1' },
      }),
    ).toBe('52.1.1.1');

    expect(
      outputNormalizer.resolveDescriptor('storage_uri', {
        provider: Provider.GCP,
        outputs: { unrelated: 'value' },
      }),
    ).toBeNull();
  });

  it('flattens and normalizes resource-level outputs from the state parser', () => {
    const normalized = outputNormalizer.normalizeResourceOutputs(Provider.AWS, [
      { type: 'aws_vpc', name: 'main', outputs: { vpc_id: 'vpc-1', id: 'vpc-1' } },
      { type: 'aws_instance', name: 'web', outputs: { public_ip: '3.4.5.6', id: 'i-1' } },
    ]);

    expect(normalized.network_id).toBe('vpc-1');
    expect(normalized.compute_public_ip).toBe('3.4.5.6');
  });
});
