import { aiService } from './ai.service';

describe('AiService', () => {
  it('should generate an AWS architecture with VPC, compute, and database', async () => {
    const result = await aiService.generateArchitecture({
      prompt: 'I need an AWS web app with postgres database and public subnets',
      cloudProvider: 'AWS',
    });

    expect(result.name).toContain('AWS');
    expect(result.cloudProvider).toBe('AWS');
    expect(result.nodes.length).toBeGreaterThanOrEqual(3);

    const kinds = result.nodes.map((n) => n.kind);
    expect(kinds).toContain('network');
    expect(kinds).toContain('compute');
    expect(kinds).toContain('database');

    expect(result.edges.length).toBeGreaterThanOrEqual(2);
    expect(result.terraformCode).toContain('module "primary_vpc"');
    expect(result.terraformCode).toContain('module "web_tier_cluster"');
    expect(result.terraformCode).toContain('module "rds_postgresql"');
  });

  it('should generate an Azure architecture with VNet and storage', async () => {
    const result = await aiService.generateArchitecture({
      prompt: 'Azure microservice architecture with blob storage container for assets',
      cloudProvider: 'AZURE',
    });

    expect(result.cloudProvider).toBe('AZURE');
    const kinds = result.nodes.map((n) => n.kind);
    expect(kinds).toContain('network');
    expect(kinds).toContain('compute');
    expect(kinds).toContain('storage');
    expect(result.terraformCode).toContain('azurerm');
  });

  it('should generate a GCP architecture', async () => {
    const result = await aiService.generateArchitecture({
      prompt: 'GCP compute engine with cloud SQL',
      cloudProvider: 'GCP',
    });

    expect(result.cloudProvider).toBe('GCP');
    const kinds = result.nodes.map((n) => n.kind);
    expect(kinds).toContain('network');
    expect(kinds).toContain('compute');
    expect(kinds).toContain('database');
    expect(result.terraformCode).toContain('google');
  });

  it('should reject empty prompts', async () => {
    await expect(aiService.generateArchitecture({ prompt: '   ' })).rejects.toThrow(
      'A prompt describing your architecture requirements is required',
    );
  });
});
