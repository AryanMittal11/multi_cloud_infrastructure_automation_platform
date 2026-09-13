import fs from 'fs';
import path from 'path';

describe('Canonical AWS Terraform Modules', () => {
  const awsTemplatesDir = path.join(__dirname);
  const expectedModules = ['aws_vpc', 'aws_ec2_web', 'aws_rds_postgres', 'aws_s3_bucket'];

  it.each(expectedModules)('module %s should have all required files', (moduleName) => {
    const modulePath = path.join(awsTemplatesDir, moduleName);

    expect(fs.existsSync(modulePath)).toBe(true);
    expect(fs.existsSync(path.join(modulePath, 'main.tf'))).toBe(true);
    expect(fs.existsSync(path.join(modulePath, 'variables.tf'))).toBe(true);
    expect(fs.existsSync(path.join(modulePath, 'outputs.tf'))).toBe(true);
    expect(fs.existsSync(path.join(modulePath, 'schema.json'))).toBe(true);
  });

  it.each(expectedModules)('module %s should have a valid JSONSchema specification', (moduleName) => {
    const schemaPath = path.join(awsTemplatesDir, moduleName, 'schema.json');
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
    it('aws_s3_bucket should enforce public access block and server-side encryption', () => {
      const mainTf = fs.readFileSync(path.join(awsTemplatesDir, 'aws_s3_bucket', 'main.tf'), 'utf8');
      expect(mainTf).toContain('aws_s3_bucket_public_access_block');
      expect(mainTf).toContain('block_public_acls       = true');
      expect(mainTf).toContain('aws_s3_bucket_server_side_encryption_configuration');
    });

    it('aws_ec2_web should enforce root volume encryption and disallow open SSH by default', () => {
      const mainTf = fs.readFileSync(path.join(awsTemplatesDir, 'aws_ec2_web', 'main.tf'), 'utf8');
      expect(mainTf).toContain('encrypted             = true');
      expect(mainTf).toContain('dynamic "ingress"');

      const varsTf = fs.readFileSync(path.join(awsTemplatesDir, 'aws_ec2_web', 'variables.tf'), 'utf8');
      expect(varsTf).toContain('variable "allowed_ssh_cidr"');
    });

    it('aws_rds_postgres should enforce storage encryption', () => {
      const mainTf = fs.readFileSync(path.join(awsTemplatesDir, 'aws_rds_postgres', 'main.tf'), 'utf8');
      expect(mainTf).toContain('storage_encrypted    = true');
      expect(mainTf).toContain('publicly_accessible     = false');
    });
  });
});
