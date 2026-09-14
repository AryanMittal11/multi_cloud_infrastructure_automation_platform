import {
  estimateTemplateCost,
  estimateDeploymentCost,
  classifyTerraformResource,
} from './cost.estimator';

describe('cost.estimator (builtin-rate-card-v1)', () => {
  it('estimates a web template with compute + storage line items', () => {
    const result = estimateTemplateCost({
      templateName: 'aws_ec2_web',
      provider: 'AWS',
      configuration: { instance_count: 2, volume_size: 20 },
      region: 'us-east-1',
    });

    expect(result.currency).toBe('USD');
    expect(result.source).toBe('builtin-rate-card-v1');
    expect(result.lineItems.map((i) => i.resourceType)).toEqual(['compute', 'storage']);
    expect(result.monthlyTotalUsd).toBeCloseTo(2 * 24.0 + 20 * 0.1, 2);
    // Estimates must be labelled with assumptions (platform invariant)
    expect(result.assumptions.length).toBeGreaterThanOrEqual(3);
    expect(result.assumptions.some((a) => a.label === 'Excluded')).toBe(true);
  });

  it('applies a region multiplier above the baseline', () => {
    const baseline = estimateTemplateCost({ templateName: 'web', provider: 'AWS' });
    const tokyoish = estimateTemplateCost({ templateName: 'web', provider: 'AWS', region: 'ap-southeast-1' });
    expect(tokyoish.monthlyTotalUsd).toBeGreaterThan(baseline.monthlyTotalUsd);
  });

  it('falls back to a compute+storage composition for unknown archetypes', () => {
    const result = estimateTemplateCost({ templateName: 'mystery_widget', provider: 'GCP' });
    expect(result.lineItems.map((i) => i.resourceType)).toEqual(['compute', 'storage']);
  });

  it('prices a deployment from its actual terraform resource types', () => {
    const result = estimateDeploymentCost({
      deploymentId: 'dep-1',
      provider: 'AWS',
      region: 'us-east-1',
      resources: [
        { resourceType: 'aws_instance' },
        { resourceType: 'aws_instance' },
        { resourceType: 'aws_db_instance' },
        { resource_type_placeholder: '' } as any, // unknown types are ignored
      ].filter((r) => 'resourceType' in r),
    });

    const labels = result.lineItems.map((i) => i.resourceType);
    expect(labels).toContain('compute');
    expect(labels).toContain('database');
    // 2 compute instances + 8GB assumed storage... storage only appears for storage-class resources
    const compute = result.lineItems.find((i) => i.resourceType === 'compute')!;
    expect(compute.quantity).toBe(2);
  });

  it('classifies provider-specific terraform types across clouds', () => {
    expect(classifyTerraformResource('aws_instance')).toBe('compute');
    expect(classifyTerraformResource('azurerm_linux_virtual_machine')).toBe('compute');
    expect(classifyTerraformResource('google_compute_instance')).toBe('compute');
    expect(classifyTerraformResource('aws_s3_bucket')).toBe('objectstorage');
    expect(classifyTerraformResource('azurerm_kubernetes_cluster')).toBe('cluster');
    expect(classifyTerraformResource('aws_db_instance')).toBe('database');
    expect(classifyTerraformResource('aws_lb')).toBe('loadbalancer');
    expect(classifyTerraformResource('aws_vpc')).toBe('network');
    expect(classifyTerraformResource('weird_unknown_type')).toBeNull();
  });
});
