import { logger } from '../../utils/logger';

/**
 * Built-in policy engine ("guardrails-v1").
 *
 * A deterministic, configuration-based evaluation that runs after every
 * successful Terraform plan. It is intentionally simple and auditable:
 * each rule inspects the deployment configuration (never credentials)
 * and returns a structured result that is persisted on the deployment
 * as `policyEvaluation` and surfaced in the plan review UI.
 *
 * This is not a substitute for OPA/Sentinel; it covers the core
 * invariants the platform promises out of the box.
 */

export type PolicySeverity = 'LOW' | 'MEDIUM' | 'HIGH';

export interface PolicyRuleResult {
  policy: string;
  severity: PolicySeverity;
  passed: boolean;
  message: string;
}

export interface PolicyEvaluation {
  evaluator: 'builtin-guardrails-v1';
  evaluatedAt: string;
  operationType: string;
  passed: boolean;
  results: PolicyRuleResult[];
}

/** RFC 1918 private IPv4 ranges. */
const PRIVATE_CIDRS = [
  { network: '10.0.0.0', bits: 8 },
  { network: '172.16.0.0', bits: 12 },
  { network: '192.168.0.0', bits: 16 },
];

function ipToLong(ip: string): number {
  const parts = ip.split('.').map((p) => parseInt(p, 10));
  if (parts.length !== 4 || parts.some((p) => Number.isNaN(p) || p < 0 || p > 255)) {
    return NaN;
  }
  return ((parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3]) >>> 0;
}

function isPrivateCidr(cidr: string): boolean {
  const [addr, bitsStr] = cidr.split('/');
  const bits = parseInt(bitsStr, 10);
  if (Number.isNaN(bits) || bits < 0 || bits > 32) return false;
  const ip = ipToLong(addr);
  if (Number.isNaN(ip)) return false;

  return PRIVATE_CIDRS.some(({ network, bits: netBits }) => {
    if (bits < netBits) return false;
    const netIp = ipToLong(network);
    const mask = (0xffffffff << (32 - netBits)) >>> 0;
    return (ip & mask) === (netIp & mask);
  });
}

/** Recursively collect values for keys matching any of the given names. */
function collectValues(obj: unknown, keyPattern: RegExp, out: Array<{ key: string; value: unknown }> = []): Array<{ key: string; value: unknown }> {
  if (obj && typeof obj === 'object') {
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      if (keyPattern.test(key)) out.push({ key, value });
      collectValues(value, keyPattern, out);
    }
  }
  return out;
}

const CIDR_KEY = /^(vpc_?cidr|subnet_?cidrs?|cidr_?blocks?|public_?subnet_?cidr|private_?subnet_?cidr)$/i;
const PUBLIC_EXPOSURE_KEY = /(publicly_?accessible|public_?access|allow_?public|public_ip|assign_?public_?ip)/i;
const ENCRYPTION_KEY = /(storage_?encrypted|encrypt_?volume|encryption|disk_?encryption|at_?rest_?encryption)/i;

export function evaluatePlanPolicy(
  configuration: Record<string, unknown>,
  operationType: string,
): PolicyEvaluation {
  const results: PolicyRuleResult[] = [];
  const config = configuration || {};

  // 1. Naming convention — environment_name must be DNS-safe and descriptive
  const envName = typeof config.environment_name === 'string' ? config.environment_name : '';
  results.push({
    policy: 'naming-convention',
    severity: 'MEDIUM',
    passed: /^[a-z][a-z0-9-]{2,28}$/.test(envName),
    message: envName
      ? `environment_name "${envName}" ${/^[a-z][a-z0-9-]{2,28}$/.test(envName) ? 'follows' : 'violates'} the DNS-safe naming convention (lowercase, hyphens, 3-29 chars)`
      : 'environment_name is missing from the configuration',
  });

  // 2. Private CIDR discipline — all CIDR blocks must be RFC 1918
  const cidrs = collectValues(config, CIDR_KEY);
  if (cidrs.length === 0) {
    results.push({
      policy: 'private-cidr-only',
      severity: 'LOW',
      passed: true,
      message: 'No CIDR blocks configured; rule not applicable',
    });
  } else {
    const flat = cidrs.flatMap(({ key, value }) =>
      (Array.isArray(value) ? value : [value]).map((v) => ({ key, cidr: String(v) })),
    );
    const offenders = flat.filter(({ cidr }) => !isPrivateCidr(cidr));
    results.push({
      policy: 'private-cidr-only',
      severity: 'MEDIUM',
      passed: offenders.length === 0,
      message:
        offenders.length === 0
          ? `All ${flat.length} CIDR block(s) are within RFC 1918 private ranges`
          : `Non-private CIDR detected: ${offenders.map((o) => `${o.key}=${o.cidr}`).join(', ')}`,
    });
  }

  // 3. Public exposure guard — explicit public-access flags must not be enabled
  const exposures = collectValues(config, PUBLIC_EXPOSURE_KEY).filter(
    ({ value }) => value === true || value === 'true',
  );
  results.push({
    policy: 'no-unrestricted-public-exposure',
    severity: 'HIGH',
    passed: exposures.length === 0,
    message:
      exposures.length === 0
        ? 'No public-access flags enabled in configuration'
        : `Public exposure enabled via: ${exposures.map((e) => e.key).join(', ')} — must be reviewed before apply`,
  });

  // 4. Encryption preference — explicit encryption=false is flagged
  const disabled = collectValues(config, ENCRYPTION_KEY).filter(
    ({ value }) => value === false || value === 'false',
  );
  results.push({
    policy: 'encryption-at-rest-preferred',
    severity: 'MEDIUM',
    passed: disabled.length === 0,
    message:
      disabled.length === 0
        ? 'No explicitly disabled encryption settings'
        : `Encryption explicitly disabled for: ${disabled.map((d) => d.key).join(', ')}`,
  });

  // 5. Destructive-confirmation — recorded for the audit trail
  const isDestructive = operationType === 'DESTROY';
  results.push({
    policy: 'destructive-confirmation',
    severity: 'LOW',
    passed: true,
    message: isDestructive
      ? 'Destroy plan requires typed confirmation keyword at approval time'
      : 'Non-destructive operation; standard approval gate applies',
  });

  const evaluation: PolicyEvaluation = {
    evaluator: 'builtin-guardrails-v1',
    evaluatedAt: new Date().toISOString(),
    operationType,
    passed: results.every((r) => r.passed),
    results,
  };

  logger.info(
    `Policy evaluation [builtin-guardrails-v1]: ${evaluation.passed ? 'PASSED' : 'FLAGGED'} (${results.filter((r) => !r.passed).length} finding(s))`,
  );
  return evaluation;
}

export const policyEvaluator = { evaluatePlanPolicy };
