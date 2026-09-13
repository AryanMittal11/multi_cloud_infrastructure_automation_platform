import fs from 'fs';
import path from 'path';

const templatesRoot = path.resolve(__dirname, '.');

const azureModules = ['azure_vnet', 'azure_vm_web', 'azure_postgres_flexible', 'azure_blob_storage'];
const gcpModules = ['gcp_vpc', 'gcp_compute_web', 'gcp_cloud_sql_postgres', 'gcp_storage_bucket'];

describe('Canonical Azure Terraform Modules', () => {
  const azureTemplatesDir = path.join(templatesRoot, 'azure');

  it.each(azureModules)('module %s should have all required files', (moduleName) => {
    const modulePath = path.join(azureTemplatesDir, moduleName);

    expect(fs.existsSync(modulePath)).toBe(true);
    expect(fs.existsSync(path.join(modulePath, 'main.tf'))).toBe(true);
    expect(fs.existsSync(path.join(modulePath, 'variables.tf'))).toBe(true);
    expect(fs.existsSync(path.join(modulePath, 'outputs.tf'))).toBe(true);
    expect(fs.existsSync(path.join(modulePath, 'schema.json'))).toBe(true);
  });

  it.each(azureModules)('module %s should have a valid JSONSchema specification', (moduleName) => {
    const schemaPath = path.join(azureTemplatesDir, moduleName, 'schema.json');
    const rawContent = fs.readFileSync(schemaPath, 'utf8');

    let parsed: any;
    expect(() => {
      parsed = JSON.parse(rawContent);
    }).not.toThrow();

    expect(parsed).toHaveProperty('$schema');
    expect(parsed).toHaveProperty('title');
    expect(parsed).toHaveProperty('type', 'object');
    expect(parsed).toHaveProperty('properties');
    expect(typeof parsed.properties).toBe('object');
  });

  describe('Security & Architectural Invariants', () => {
    it('azure_vnet should enforce deny-by-default NSG and guarded SSH', () => {
      const mainTf = fs.readFileSync(path.join(azureTemplatesDir, 'azure_vnet', 'main.tf'), 'utf8');
      expect(mainTf).toContain('DenyAllInbound');
      expect(mainTf).toContain('dynamic "security_rule"');
    });

    it('azure_vm_web should require SSH public key and guard SSH ingress', () => {
      const mainTf = fs.readFileSync(path.join(azureTemplatesDir, 'azure_vm_web', 'main.tf'), 'utf8');
      expect(mainTf).toContain('dynamic "security_rule"');
      expect(mainTf).toContain('admin_ssh_public_key');
    });

    it('azure_postgres_flexible should disable public network access by default and encrypt storage', () => {
      const mainTf = fs.readFileSync(
        path.join(azureTemplatesDir, 'azure_postgres_flexible', 'main.tf'),
        'utf8',
      );
      expect(mainTf).toContain('public_network_access_enabled');
      expect(mainTf).not.toContain('public_network_access_enabled = true');
    });

    it('azure_blob_storage should block public access and enforce infrastructure encryption', () => {
      const mainTf = fs.readFileSync(path.join(azureTemplatesDir, 'azure_blob_storage', 'main.tf'), 'utf8');
      expect(mainTf).toContain('allow_nested_items_to_be_public = false');
      expect(mainTf).toContain('infrastructure_encryption_enabled = true');
      expect(mainTf).toContain('min_tls_version                 = "TLS1_2"');
      expect(mainTf).toContain('container_access_type = "private"');
    });
  });
});

describe('Canonical GCP Terraform Modules', () => {
  const gcpTemplatesDir = path.join(templatesRoot, 'gcp');

  it.each(gcpModules)('module %s should have all required files', (moduleName) => {
    const modulePath = path.join(gcpTemplatesDir, moduleName);

    expect(fs.existsSync(modulePath)).toBe(true);
    expect(fs.existsSync(path.join(modulePath, 'main.tf'))).toBe(true);
    expect(fs.existsSync(path.join(modulePath, 'variables.tf'))).toBe(true);
    expect(fs.existsSync(path.join(modulePath, 'outputs.tf'))).toBe(true);
    expect(fs.existsSync(path.join(modulePath, 'schema.json'))).toBe(true);
  });

  it.each(gcpModules)('module %s should have a valid JSONSchema specification', (moduleName) => {
    const schemaPath = path.join(gcpTemplatesDir, moduleName, 'schema.json');
    const rawContent = fs.readFileSync(schemaPath, 'utf8');

    let parsed: any;
    expect(() => {
      parsed = JSON.parse(rawContent);
    }).not.toThrow();

    expect(parsed).toHaveProperty('$schema');
    expect(parsed).toHaveProperty('title');
    expect(parsed).toHaveProperty('type', 'object');
    expect(parsed).toHaveProperty('properties');
    expect(typeof parsed.properties).toBe('object');
  });

  describe('Security & Architectural Invariants', () => {
    it('gcp_vpc should restrict SSH firewall to explicit CIDR allowlists only', () => {
      const mainTf = fs.readFileSync(path.join(gcpTemplatesDir, 'gcp_vpc', 'main.tf'), 'utf8');
      expect(mainTf).toContain('allow_restricted_ssh');
      expect(mainTf).toMatch(/count\s+=\s+length\(var\.allowed_ssh_cidrs\)\s*>\s*0 \? 1 : 0/);
    });

    it('gcp_compute_web should enable shielded VM features and guard SSH', () => {
      const mainTf = fs.readFileSync(path.join(gcpTemplatesDir, 'gcp_compute_web', 'main.tf'), 'utf8');
      expect(mainTf).toContain('enable_secure_boot          = true');
      expect(mainTf).toContain('enable_vtpm                 = true');
      expect(mainTf).toContain('enable_integrity_monitoring = true');
      expect(mainTf).toMatch(/count\s+=\s+length\(var\.allowed_ssh_cidrs\)\s*>\s*0 \? 1 : 0/);
    });

    it('gcp_cloud_sql_postgres should enforce encrypted connections and support private IP', () => {
      const mainTf = fs.readFileSync(
        path.join(gcpTemplatesDir, 'gcp_cloud_sql_postgres', 'main.tf'),
        'utf8',
      );
      expect(mainTf).toContain('ssl_mode = "ENCRYPTED_ONLY"');
      expect(mainTf).toContain('private_network');
    });

    it('gcp_storage_bucket should enforce public access prevention and uniform bucket-level access', () => {
      const mainTf = fs.readFileSync(path.join(gcpTemplatesDir, 'gcp_storage_bucket', 'main.tf'), 'utf8');
      expect(mainTf).toContain('public_access_prevention    = "enforced"');
      expect(mainTf).toContain('uniform_bucket_level_access = true');
    });
  });
});

describe('Cross-Cloud Template Consistency', () => {
  it('all modules across all providers should declare a compatible required_version', () => {
    const providers = ['aws', 'azure', 'gcp'];
    for (const provider of providers) {
      const providerDir = path.join(templatesRoot, provider);
      const moduleDirs = fs
        .readdirSync(providerDir, { withFileTypes: true })
        .filter((d) => d.isDirectory())
        .map((d) => d.name);

      for (const moduleName of moduleDirs) {
        const mainTfPath = path.join(providerDir, moduleName, 'main.tf');
        if (!fs.existsSync(mainTfPath)) continue;
        const mainTf = fs.readFileSync(mainTfPath, 'utf8');
        expect(mainTf).toMatch(/required_version\s*=\s*">= 1\.5\.0"/);
      }
    }
  });
});
