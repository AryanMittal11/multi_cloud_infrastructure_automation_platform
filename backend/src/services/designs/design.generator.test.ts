import { generateDesignTerraform, hclIdentifier, hclValue } from './design.generator';
import { DesignNodeInput, DesignEdgeInput } from './design.service';

describe('Design Generator', () => {
  it('should sanitize identifiers and format HCL values', () => {
    expect(hclIdentifier('Showcase VPC 01')).toBe('showcase_vpc_01');
    expect(hclIdentifier('!@#$%')).toBe('resource');
    expect(hclValue('hello')).toBe('"hello"');
    expect(hclValue(42)).toBe('42');
    expect(hclValue(true)).toBe('true');
    expect(hclValue(['a', 'b'])).toBe('["a", "b"]');
  });

  it('should generate valid Terraform modules and provider configuration', () => {
    const nodes: DesignNodeInput[] = [
      {
        id: 'node-vpc',
        kind: 'network',
        position: { x: 0, y: 0 },
        data: {
          kind: 'network',
          label: 'Primary VPC',
          provider: 'AWS',
          templateRef: 'templates/aws/aws_vpc',
          config: { vpc_cidr: '10.0.0.0/16' },
        },
      },
      {
        id: 'node-web',
        kind: 'compute',
        position: { x: 100, y: 100 },
        data: {
          kind: 'compute',
          label: 'Web Tier',
          provider: 'AWS',
          templateRef: 'templates/aws/aws_ec2_web',
          config: { instance_type: 't3.micro' },
        },
      },
    ];

    const edges: DesignEdgeInput[] = [
      {
        id: 'edge-1',
        source: 'node-vpc',
        target: 'node-web',
      },
    ];

    const { mainTf, schemaJson } = generateDesignTerraform('Production Stack', 'AWS', nodes, edges);

    expect(mainTf).toContain('Production Stack');
    expect(mainTf).toContain('module "primary_vpc"');
    expect(mainTf).toContain('source = "../../templates/aws/aws_vpc"');
    expect(mainTf).toContain('module "web_tier"');
    expect(mainTf).toContain('source = "../../templates/aws/aws_ec2_web"');
    // Wired arguments from VPC
    expect(mainTf).toContain('vpc_id = module.primary_vpc.vpc_id');
    expect(mainTf).toContain('subnet_id = module.primary_vpc.public_subnet_ids[0]');
    // Valid depends_on block
    expect(mainTf).toContain('depends_on = [\n    module.primary_vpc,\n  ]');
    expect(schemaJson).toBeDefined();
  });

  it('should correctly configure Azure provider and wire VNet to VM', () => {
    const nodes: DesignNodeInput[] = [
      {
        id: 'node-vnet',
        kind: 'network',
        position: { x: 0, y: 0 },
        data: {
          kind: 'network',
          label: 'Azure VNet',
          provider: 'AZURE',
          templateRef: 'templates/azure/azure_vnet',
          config: {},
        },
      },
      {
        id: 'node-vm',
        kind: 'compute',
        position: { x: 100, y: 100 },
        data: {
          kind: 'compute',
          label: 'Azure VM',
          provider: 'AZURE',
          templateRef: 'templates/azure/azure_vm_web',
          config: {},
        },
      },
    ];

    const edges: DesignEdgeInput[] = [
      {
        id: 'edge-az',
        source: 'node-vnet',
        target: 'node-vm',
      },
    ];

    const { mainTf } = generateDesignTerraform('Azure Stack', 'AZURE', nodes, edges);

    expect(mainTf).toContain('azurerm');
    expect(mainTf).toContain('module "azure_vnet"');
    expect(mainTf).toContain('module "azure_vm"');
    expect(mainTf).toContain('resource_group_name = module.azure_vnet.resource_group_name');
    expect(mainTf).toContain('subnet_id = module.azure_vnet.public_subnet_id');
    expect(mainTf).toContain('module.azure_vnet');
  });
});
