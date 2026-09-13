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
    const providerFile = path.join(workspaceDir, 'provider_override.tf');
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
});
