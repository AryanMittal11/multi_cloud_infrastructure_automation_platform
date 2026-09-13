import { validateTemplateInput } from './template.validator';
import { JSONSchema } from './template.types';

describe('JSONSchema Template Validator', () => {
  const sampleSchema: JSONSchema = {
    $schema: 'http://json-schema.org/draft-07/schema#',
    title: 'Test Web Server',
    type: 'object',
    required: ['server_name', 'instance_type'],
    properties: {
      server_name: {
        type: 'string',
        description: 'Server name',
      },
      instance_type: {
        type: 'string',
        enum: ['t3.micro', 't3.small', 't3.medium'],
        default: 't3.micro',
      },
      storage_gb: {
        type: 'number',
        default: 20,
        minimum: 10,
        maximum: 100,
      },
      enable_monitoring: {
        type: 'boolean',
        default: false,
      },
      subnet_cidrs: {
        type: 'array',
        minItems: 2,
        items: { type: 'string' },
      },
      vpc_cidr: {
        type: 'string',
        pattern: '^10\\..*$',
      },
    },
  };

  it('should validate valid configuration and inject default values', () => {
    const input = {
      server_name: 'prod-web-01',
      instance_type: 't3.small',
    };

    const result = validateTemplateInput(sampleSchema, input);

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.sanitizedConfiguration.server_name).toBe('prod-web-01');
    expect(result.sanitizedConfiguration.instance_type).toBe('t3.small');
    // Defaults injected
    expect(result.sanitizedConfiguration.storage_gb).toBe(20);
    expect(result.sanitizedConfiguration.enable_monitoring).toBe(false);
  });

  it('should reject missing required fields', () => {
    const input = {
      server_name: 'test-server',
      // missing instance_type
    };

    const result = validateTemplateInput(sampleSchema, input);

    expect(result.valid).toBe(false);
    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: 'instance_type', code: 'REQUIRED' }),
      ]),
    );
  });

  it('should reject invalid enum values', () => {
    const input = {
      server_name: 'test-server',
      instance_type: 'c5.massive' as any, // Not in enum
    };

    const result = validateTemplateInput(sampleSchema, input);

    expect(result.valid).toBe(false);
    expect(result.errors[0].code).toBe('INVALID_ENUM');
  });

  it('should reject numbers outside minimum and maximum range', () => {
    const input = {
      server_name: 'test-server',
      instance_type: 't3.micro',
      storage_gb: 5, // Below minimum of 10
    };

    const result = validateTemplateInput(sampleSchema, input);

    expect(result.valid).toBe(false);
    expect(result.errors[0].code).toBe('MINIMUM');
  });

  it('should reject regex pattern mismatches', () => {
    const input = {
      server_name: 'test-server',
      instance_type: 't3.micro',
      vpc_cidr: '192.168.1.0/24', // Does not match pattern ^10\..*$
    };

    const result = validateTemplateInput(sampleSchema, input);

    expect(result.valid).toBe(false);
    expect(result.errors[0].code).toBe('PATTERN_MISMATCH');
  });

  it('should validate array items and minimum length constraints', () => {
    const input = {
      server_name: 'test-server',
      instance_type: 't3.micro',
      subnet_cidrs: ['10.0.1.0/24'], // Only 1 item, requires 2
    };

    const result = validateTemplateInput(sampleSchema, input);

    expect(result.valid).toBe(false);
    expect(result.errors[0].code).toBe('MIN_ITEMS');
  });
});
