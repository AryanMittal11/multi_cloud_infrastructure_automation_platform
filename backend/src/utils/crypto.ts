import crypto from 'crypto';
import { env } from '../config/env';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH_BYTES = 12; // Standard 96-bit IV recommended for GCM
const AUTH_TAG_LENGTH_BYTES = 16; // 128-bit authentication tag

/**
 * Derives a consistent 32-byte cryptographic key from the configured environment secret.
 */
function getEncryptionKey(): Buffer {
  const secret = env.CREDENTIAL_ENCRYPTION_KEY;
  if (/^[0-9a-fA-F]{64}$/.test(secret)) {
    return Buffer.from(secret, 'hex');
  }
  return crypto.createHash('sha256').update(secret).digest();
}

/**
 * Encrypts arbitrary serializable data using AES-256-GCM.
 * Output format: <iv_hex>:<authTag_hex>:<ciphertext_hex>
 *
 * @param data String or serializable object to encrypt
 * @returns Serialized encrypted string with IV and auth tag
 */
export function encryptCredential(data: Record<string, any> | string): string {
  const plaintext = typeof data === 'string' ? data : JSON.stringify(data);
  const iv = crypto.randomBytes(IV_LENGTH_BYTES);
  const key = getEncryptionKey();

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH_BYTES,
  });

  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
}

/**
 * Decrypts a previously encrypted AES-256-GCM string and validates its integrity tag.
 *
 * @param encryptedString Serialized format: <iv_hex>:<authTag_hex>:<ciphertext_hex>
 * @returns Decrypted string or parsed object
 */
export function decryptCredential<T = any>(encryptedString: string): T {
  const parts = encryptedString.split(':');
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted credential format. Expected iv:authTag:ciphertext');
  }

  const [ivHex, authTagHex, ciphertextHex] = parts;
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const ciphertext = Buffer.from(ciphertextHex, 'hex');
  const key = getEncryptionKey();

  if (iv.length !== IV_LENGTH_BYTES) {
    throw new Error(`Invalid IV length: expected ${IV_LENGTH_BYTES} bytes, got ${iv.length}`);
  }

  if (authTag.length !== AUTH_TAG_LENGTH_BYTES) {
    throw new Error(
      `Invalid auth tag length: expected ${AUTH_TAG_LENGTH_BYTES} bytes, got ${authTag.length}`,
    );
  }

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH_BYTES,
  });

  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');

  try {
    return JSON.parse(decrypted) as T;
  } catch {
    return decrypted as unknown as T;
  }
}

/**
 * Masks a sensitive string for safe display, revealing only leading or trailing characters.
 *
 * @param value Secret string to mask (e.g. API key, token)
 * @param visibleSuffixChars Number of characters to leave unmasked at end
 * @returns Masked string e.g. "••••••••••••1234"
 */
export function maskSecret(value: string, visibleSuffixChars: number = 4): string {
  if (!value || value.length <= visibleSuffixChars) {
    return '••••••••';
  }
  const suffix = value.slice(-visibleSuffixChars);
  return '•'.repeat(Math.min(value.length - visibleSuffixChars, 12)) + suffix;
}
