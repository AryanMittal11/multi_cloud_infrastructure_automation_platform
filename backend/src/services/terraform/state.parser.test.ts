import { StateParser } from './state.parser';

describe('StateParser', () => {
  let stateParser: StateParser;

  beforeEach(() => {
    stateParser = new StateParser();
  });

  it('should parse resources, outputs, and extract primary IDs from state JSON', () => {
    const mockState = {
      version: 4,
      outputs: {
        web_url: {
          value: 'http://54.210.10.20',
          type: 'string',
        },
        vpc_id: {
          value: 'vpc-12345678',
          type: 'string',
        },
      },
      resources: [
        {
          type: 'aws_instance',
          name: 'web',
          provider: 'provider["registry.terraform.io/hashicorp/aws"]',
          instances: [
            {
              attributes: {
                id: 'i-0abcdef1234567890',
                arn: 'arn:aws:ec2:us-east-1:123456789012:instance/i-0abcdef1234567890',
                public_ip: '54.210.10.20',
                instance_type: 't3.micro',
              },
              dependencies: ['aws_security_group.web'],
            },
          ],
        },
      ],
    };

    const parsed = stateParser.parseStateJson(mockState);

    expect(parsed.outputs.web_url).toBe('http://54.210.10.20');
    expect(parsed.resources).toHaveLength(1);

    const resource = parsed.resources[0];
    expect(resource.type).toBe('aws_instance');
    expect(resource.name).toBe('web');
    expect(resource.provider).toBe('AWS');
    expect(resource.providerResourceId).toContain('i-0abcdef1234567890');
    expect(resource.dependencies).toEqual(['aws_security_group.web']);
    expect(resource.status).toBe('ACTIVE');
  });
});
