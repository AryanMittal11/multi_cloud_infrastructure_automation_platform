import { encryptCredential, decryptCredential, maskSecret } from './crypto';

describe('AES-256-GCM Crypto Utility', () => {
  const sampleCredentials = {
    accessKeyId: 'AKIAIOSFODNN7EXAMPLE',
    secretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
    region: 'us-east-1',
  };

  it('should encrypt and decrypt an object payload correctly', () => {
    const encrypted = encryptCredential(sampleCredentials);
    expect(typeof encrypted).toBe('string');
    expect(encrypted.split(':')).toHaveLength(3); // iv:authTag:ciphertext

    const decrypted = decryptCredential<typeof sampleCredentials>(encrypted);
    expect(decrypted).toEqual(sampleCredentials);
  });

  it('should encrypt and decrypt a raw string payload correctly', () => {
    const secret = 'my-super-secret-password-12345';
    const encrypted = encryptCredential(secret);
    const decrypted = decryptCredential<string>(encrypted);
    expect(decrypted).toBe(secret);
  });

  it('should produce different ciphertexts for the same plaintext due to random IVs', () => {
    const secret = 'identical-secret';
    const enc1 = encryptCredential(secret);
    const enc2 = encryptCredential(secret);
    expect(enc1).not.toBe(enc2);
  });

  it('should fail to decrypt if the ciphertext or tag has been tampered with', () => {
    const encrypted = encryptCredential(sampleCredentials);
    const parts = encrypted.split(':');

    // Tamper with the ciphertext
    const tamperedCiphertext = parts[2].slice(0, -2) + (parts[2].endsWith('a') ? 'b' : 'a');
    const tamperedEncrypted = `${parts[0]}:${parts[1]}:${tamperedCiphertext}`;

    expect(() => decryptCredential(tamperedEncrypted)).toThrow();
  });

  it('should correctly mask secrets with customizable suffix length', () => {
    expect(maskSecret('AKIAIOSFODNN7EXAMPLE', 4)).toBe('••••••••••••MPLE');
    expect(maskSecret('short', 2)).toBe('•••rt');
    expect(maskSecret('ab', 4)).toBe('••••••••');
  });
});
