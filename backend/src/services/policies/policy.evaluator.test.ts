import { evaluatePlanPolicy } from './policy.evaluator';

describe('policy.evaluator (builtin-guardrails-v1)', () => {
  it('passes a clean, well-formed configuration', () => {
    const result = evaluatePlanPolicy(
      { environment_name: 'prod-vpc', vpc_cidr: '10.0.0.0/16' },
      'CREATE',
    );

    expect(result.evaluator).toBe('builtin-guardrails-v1');
    expect(result.passed).toBe(true);
    expect(result.results.every((r) => r.passed)).toBe(true);
  });

  it('flags non-RFC1918 CIDR blocks', () => {
    const result = evaluatePlanPolicy(
      { environment_name: 'edge-net', vpc_cidr: '8.8.8.0/24' },
      'CREATE',
    );

    const cidrRule = result.results.find((r) => r.policy === 'private-cidr-only');
    expect(result.passed).toBe(false);
    expect(cidrRule?.passed).toBe(false);
    expect(cidrRule?.message).toContain('8.8.8.0/24');
  });

  it('flags public exposure flags enabled', () => {
    const result = evaluatePlanPolicy(
      { environment_name: 'open-bucket', publicly_accessible: true },
      'CREATE',
    );

    const exposure = result.results.find(
      (r) => r.policy === 'no-unrestricted-public-exposure',
    );
    expect(exposure?.passed).toBe(false);
    expect(result.passed).toBe(false);
  });

  it('flags explicitly disabled encryption', () => {
    const result = evaluatePlanPolicy(
      { environment_name: 'no-crypto', storage_encrypted: false },
      'CREATE',
    );

    const encryption = result.results.find(
      (r) => r.policy === 'encryption-at-rest-preferred',
    );
    expect(encryption?.passed).toBe(false);
  });

  it('flags invalid environment_name (naming convention)', () => {
    const result = evaluatePlanPolicy(
      { environment_name: 'Bad_Name!' },
      'CREATE',
    );

    const naming = result.results.find((r) => r.policy === 'naming-convention');
    expect(naming?.passed).toBe(false);
  });

  it('handles nested subnet arrays and evaluates each CIDR', () => {
    const result = evaluatePlanPolicy(
      {
        environment_name: 'hub-net',
        subnet_cidrs: ['10.1.0.0/24', '172.16.4.0/22'],
      },
      'CREATE',
    );

    const cidrRule = result.results.find((r) => r.policy === 'private-cidr-only');
    expect(cidrRule?.passed).toBe(true);
    expect(cidrRule?.message).toContain('2 CIDR block(s)');
  });

  it('marks destroy plans as confirmation-gated', () => {
    const result = evaluatePlanPolicy(
      { environment_name: 'doomed-env' },
      'DESTROY',
    );

    const destructive = result.results.find(
      (r) => r.policy === 'destructive-confirmation',
    );
    expect(destructive?.passed).toBe(true);
    expect(destructive?.message).toContain('typed confirmation');
  });
});
