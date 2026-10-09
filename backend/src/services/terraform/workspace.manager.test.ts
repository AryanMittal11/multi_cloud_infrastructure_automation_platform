import fs from 'fs';
import path from 'path';
import { WorkspaceManager } from './workspace.manager';

describe('WorkspaceManager', () => {
  const testBaseDir = path.join(__dirname, 'test_workspaces');
  let workspaceManager: WorkspaceManager;

  beforeEach(() => {
    workspaceManager = new WorkspaceManager(testBaseDir);
  });

  afterEach(() => {
    if (fs.existsSync(testBaseDir)) {
      fs.rmSync(testBaseDir, { recursive: true, force: true });
    }
  });

  it('should prepare an isolated workspace with tfvars and provider config', async () => {
    const deploymentId = 'dep-test-uuid-1';
    const config = {
      deploymentId,
      templateReference: 'templates/aws/aws_vpc',
      configuration: {
        vpc_cidr: '10.0.0.0/16',
        environment_name: 'test-env',
      },
      cloudCredentials: {
        AWS_ACCESS_KEY_ID: 'AKIA_TEST',
      },
      region: 'us-west-2',
    };

    const workspaceDir = await workspaceManager.prepareWorkspace(config);

    expect(fs.existsSync(workspaceDir)).toBe(true);

    // Verify terraform.tfvars.json exists and contains configuration
    const tfvarsFile = path.join(workspaceDir, 'terraform.tfvars.json');
    expect(fs.existsSync(tfvarsFile)).toBe(true);
    const parsedTfvars = JSON.parse(fs.readFileSync(tfvarsFile, 'utf8'));
    expect(parsedTfvars.vpc_cidr).toBe('10.0.0.0/16');

    // Verify provider override was written
    const providerFile = path.join(workspaceDir, 'providers.tf');
    expect(fs.existsSync(providerFile)).toBe(true);
    const providerContent = fs.readFileSync(providerFile, 'utf8');
    expect(providerContent).toContain('us-west-2');
  });

  it('should cleanup workspace files', async () => {
    const deploymentId = 'dep-cleanup-test';
    const workspaceDir = await workspaceManager.prepareWorkspace({
      deploymentId,
      templateReference: 'templates/aws/aws_vpc',
      configuration: {},
      cloudCredentials: {},
    });

    expect(fs.existsSync(workspaceDir)).toBe(true);

    await workspaceManager.cleanupWorkspace(deploymentId, false);
    expect(fs.existsSync(workspaceDir)).toBe(false);
  });

  it('should seed a destroy workspace with the target deployment state', async () => {
    const sourceId = 'dep-create-source';
    const sourceDir = path.join(testBaseDir, sourceId);
    fs.mkdirSync(sourceDir, { recursive: true });
    const state = { version: 4, resources: [{ type: 'aws_vpc', name: 'main' }] };
    fs.writeFileSync(path.join(sourceDir, 'terraform.tfstate'), JSON.stringify(state), 'utf8');

    const destroyDir = await workspaceManager.prepareWorkspace({
      deploymentId: 'dep-destroy',
      stateSourceDeploymentId: sourceId,
      templateReference: 'templates/aws/aws_vpc',
      configuration: {},
      cloudCredentials: {},
    });

    expect(JSON.parse(fs.readFileSync(path.join(destroyDir, 'terraform.tfstate'), 'utf8')))
      .toEqual(state);
  });

  it('should refuse teardown when the target deployment state is missing', async () => {
    await expect(workspaceManager.prepareWorkspace({
      deploymentId: 'dep-destroy',
      stateSourceDeploymentId: 'dep-without-state',
      templateReference: 'templates/aws/aws_vpc',
      configuration: {},
      cloudCredentials: {},
    })).rejects.toThrow('Terraform state for target deployment [dep-without-state] is missing');
  });

  it('should sync the empty post-destroy state back to the source deployment', async () => {
    const sourceId = 'dep-create-source';
    const sourceDir = path.join(testBaseDir, sourceId);
    const destroyDir = path.join(testBaseDir, 'dep-destroy');
    fs.mkdirSync(sourceDir, { recursive: true });
    fs.mkdirSync(destroyDir, { recursive: true });
    fs.writeFileSync(
      path.join(sourceDir, 'terraform.tfstate'),
      JSON.stringify({ version: 4, resources: [{ type: 'aws_vpc', name: 'main' }] }),
      'utf8',
    );
    fs.writeFileSync(
      path.join(destroyDir, 'terraform.tfstate'),
      JSON.stringify({ version: 4, resources: [] }),
      'utf8',
    );

    await workspaceManager.syncStateToDeployment(destroyDir, sourceId);

    const synced = JSON.parse(fs.readFileSync(path.join(sourceDir, 'terraform.tfstate'), 'utf8'));
    expect(synced.resources).toEqual([]);
  });

  it('should generate an Azure provider block for Azure template references', async () => {
    const deploymentId = 'dep-azure-test';
    const workspaceDir = await workspaceManager.prepareWorkspace({
      deploymentId,
      templateReference: 'templates/azure/azure_vnet',
      configuration: { location: 'westeurope' },
      cloudCredentials: {},
      region: 'westeurope',
    });

    const providerContent = fs.readFileSync(path.join(workspaceDir, 'providers.tf'), 'utf8');
    expect(providerContent).toContain('provider "azurerm"');
    expect(providerContent).toContain('westeurope');
    // Zero Secret Leakage: credentials must never be written into HCL
    expect(providerContent).not.toMatch(/client_secret|ARM_CLIENT/);
  });

  it('should generate a GCP provider block for GCP template references', async () => {
    const deploymentId = 'dep-gcp-test';
    const workspaceDir = await workspaceManager.prepareWorkspace({
      deploymentId,
      templateReference: 'templates/gcp/gcp_vpc',
      configuration: { region: 'europe-west1' },
      cloudCredentials: {},
      region: 'europe-west1',
    });

    const providerContent = fs.readFileSync(path.join(workspaceDir, 'providers.tf'), 'utf8');
    expect(providerContent).toContain('provider "google"');
    expect(providerContent).toContain('europe-west1');
    // Zero Secret Leakage: no credential assignment may appear in the provider stanza
    const providerStanza = providerContent.split('provider "google"')[1];
    expect(providerStanza).not.toMatch(/credentials|private_key|GOOGLE_CREDENTIALS/);
  });

  it('should resolve the provider from arbitrary reference formats', () => {
    expect(workspaceManager.resolveProviderFromReference('templates/azure/azure_vnet')).toBe('AZURE');
    expect(workspaceManager.resolveProviderFromReference('templates/gcp/gcp_vpc')).toBe('GCP');
    expect(workspaceManager.resolveProviderFromReference('templates/aws/aws_vpc')).toBe('AWS');
    expect(workspaceManager.resolveProviderFromReference('templates/unknown/module')).toBe('AWS');
  });
});
