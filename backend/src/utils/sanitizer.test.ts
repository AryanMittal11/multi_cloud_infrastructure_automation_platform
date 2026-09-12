import { sanitizeLogs, sanitizeObject } from './sanitizer';

describe('Sanitizer Utility', () => {
  it('should redact AWS Access Key IDs', () => {
    const raw = 'Configuring client with key AKIAIOSFODNN7EXAMPLE and region us-east-1';
    const clean = sanitizeLogs(raw);
    expect(clean).not.toContain('AKIAIOSFODNN7EXAMPLE');
    expect(clean).toContain('[REDACTED_AWS_ACCESS_KEY]');
  });

  it('should redact private key blocks', () => {
    const raw = `Error loading certificate:
-----BEGIN RSA PRIVATE KEY-----
MIIEowIBAAKCAQEA0Y1W9X...fakekeycontent...
-----END RSA PRIVATE KEY-----
Failed to bind server.`;
    const clean = sanitizeLogs(raw);
    expect(clean).not.toContain('-----BEGIN RSA PRIVATE KEY-----');
    expect(clean).toContain('[REDACTED_PRIVATE_KEY]');
  });

  it('should redact JWT tokens', () => {
    const raw = 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.do_not_leak_this_signature';
    const clean = sanitizeLogs(raw);
    expect(clean).not.toContain('eyJhbGci');
    expect(clean).toContain('[REDACTED_JWT_TOKEN]');
  });

  it('should redact explicitly provided sensitive secrets', () => {
    const secret = 'custom-db-super-password';
    const raw = `Connecting to postgresql://admin:${secret}@localhost:5432/appdb`;
    const clean = sanitizeLogs(raw, [secret]);
    expect(clean).not.toContain(secret);
    expect(clean).toContain('[REDACTED_KNOWN_SECRET]');
  });

  it('should sanitize nested objects by masking sensitive keys', () => {
    const payload = {
      id: 'usr-123',
      name: 'John Doe',
      passwordHash: '$2a$10$abcdefghijklmnopqrstuvwxyz',
      nested: {
        apiSecret: 'secret-xyz-987',
        regularField: 'safe-value',
      },
    };

    const clean = sanitizeObject(payload);
    expect(clean.passwordHash).toBe('[REDACTED]');
    expect(clean.nested.apiSecret).toBe('[REDACTED]');
    expect(clean.nested.regularField).toBe('safe-value');
    expect(clean.id).toBe('usr-123');
  });
});
