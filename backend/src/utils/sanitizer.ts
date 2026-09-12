/**
 * Sensitive Data & Log Sanitization Utility
 * Prevents credential leakage across logs, terminal output streams, and error messages.
 */

const SENSITIVE_PATTERNS: Array<{ regex: RegExp; replacement: string }> = [
  // AWS Access Key ID (e.g. AKIAIOSFODNN7EXAMPLE)
  {
    regex: /(?:AKIA|ASIA|AROA|AIDA)[A-Z0-9]{16}/g,
    replacement: '[REDACTED_AWS_ACCESS_KEY]',
  },
  // JWT Tokens (header.payload.signature)
  {
    regex: /eyJ[a-zA-Z0-9_-]{10,}\.eyJ[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}/g,
    replacement: '[REDACTED_JWT_TOKEN]',
  },
  // AWS Secret Access Key or general key/secret assignments (e.g. secret_key="...")
  {
    regex: /(?:secret[_-]?key|access[_-]?token|password|client[_-]?secret)\s*[:=]\s*["']?([^\s"',;]+)["']?/gi,
    replacement: '$1: [REDACTED_SECRET]',
  },
  // Authorization Headers (Bearer / Basic tokens)
  {
    regex: /(?:authorization|bearer)\s+[a-zA-Z0-9\-_.]+/gi,
    replacement: 'Authorization: Bearer [REDACTED_TOKEN]',
  },
  // Standard RSA / EC / OpenSSH Private Keys
  {
    regex: /-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g,
    replacement: '[REDACTED_PRIVATE_KEY]',
  },
];

/**
 * Sanitizes an arbitrary log or terminal output string by masking known secret patterns
 * and any explicitly supplied sensitive strings.
 *
 * @param output Raw log or terminal string
 * @param knownSecrets Optional list of raw secrets to scrub
 * @returns Sanitized string safe for logging and display
 */
export function sanitizeLogs(output: string, knownSecrets: string[] = []): string {
  if (!output || typeof output !== 'string') {
    return output;
  }

  let sanitized = output;

  // 1. Redact explicitly known secret values
  for (const secret of knownSecrets) {
    if (secret && typeof secret === 'string' && secret.trim().length >= 4) {
      // Escape special regex characters in the secret string
      const escaped = secret.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      sanitized = sanitized.replace(new RegExp(escaped, 'g'), '[REDACTED_KNOWN_SECRET]');
    }
  }

  // 2. Redact matches for known sensitive regex patterns
  for (const { regex, replacement } of SENSITIVE_PATTERNS) {
    sanitized = sanitized.replace(regex, replacement);
  }

  return sanitized;
}

/**
 * Strips or masks sensitive properties from an object prior to API response or logging.
 *
 * @param obj Object to sanitize
 * @param sensitiveKeys Keys to mask (defaults to password, secret, token, credentials)
 * @returns Sanitized object clone
 */
export function sanitizeObject<T extends Record<string, any>>(
  obj: T,
  sensitiveKeys: string[] = ['password', 'passwordHash', 'secret', 'token', 'credentials', 'credential', 'encryptedCredentialReference'],
): T {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }

  const copy: any = Array.isArray(obj) ? [...obj] : { ...obj };

  for (const key of Object.keys(copy)) {
    const isSensitive = sensitiveKeys.some((k) => key.toLowerCase().includes(k.toLowerCase()));

    if (isSensitive) {
      copy[key] = '[REDACTED]';
    } else if (typeof copy[key] === 'object' && copy[key] !== null) {
      copy[key] = sanitizeObject(copy[key], sensitiveKeys);
    }
  }

  return copy as T;
}
