import { Provider } from '@prisma/client';
import {
  NormalizedOutputKey,
  NormalizedOutputSet,
  OUTPUT_KEY_SYNONYMS,
} from './portability.types';

export interface RawProviderOutput {
  provider: Provider;
  /** Raw Terraform state outputs keyed by provider-specific names */
  outputs: Record<string, any>;
}

export class OutputNormalizer {
  /**
   * Normalizes heterogeneous provider outputs into the common platform resource
   * descriptors: compute_public_ip, database_endpoint, storage_uri, network_id.
   */
  normalize(raw: RawProviderOutput): NormalizedOutputSet {
    const normalized: NormalizedOutputSet = { extras: {} };
    const consumedKeys = new Set<string>();

    for (const [descriptorKey, synonyms] of Object.entries(OUTPUT_KEY_SYNONYMS)) {
      for (const synonym of synonyms) {
        // Exact key match first
        if (Object.prototype.hasOwnProperty.call(raw.outputs, synonym)) {
          const value = raw.outputs[synonym];
          (normalized as any)[descriptorKey] = this.coerceToString(value);
          consumedKeys.add(synonym);
          break;
        }

        // Case-insensitive / prefixed fuzzy match fallback (e.g. 'web_public_ip')
        const fuzzyKey = Object.keys(raw.outputs).find(
          (k) =>
            !consumedKeys.has(k) &&
            k.toLowerCase().endsWith(synonym.toLowerCase()),
        );
        if (fuzzyKey !== undefined) {
          const value = raw.outputs[fuzzyKey];
          (normalized as any)[descriptorKey] = this.coerceToString(value);
          consumedKeys.add(fuzzyKey);
          break;
        }
      }
    }

    // Passthrough of remaining provider-specific outputs
    for (const [key, value] of Object.entries(raw.outputs)) {
      if (!consumedKeys.has(key)) {
        normalized.extras[key] = value;
      }
    }

    return normalized;
  }

  /**
   * Normalizes a collection of provider resource records (from the state parser)
   * and enriches each with normalized connection descriptors when applicable.
   */
  normalizeResourceOutputs(
    provider: Provider,
    resources: Array<{
      type: string;
      name: string;
      outputs: Record<string, any>;
    }>,
  ): NormalizedOutputSet {
    // Merge all resource attribute outputs into a single flattened view, then normalize.
    // Priority follows declaration order (network -> compute -> database -> storage consumers first).
    const flattened: Record<string, any> = {};
    for (const res of resources) {
      for (const [key, value] of Object.entries(res.outputs || {})) {
        if (!Object.prototype.hasOwnProperty.call(flattened, key)) {
          flattened[key] = value;
        }
      }
    }

    return this.normalize({ provider, outputs: flattened });
  }

  /**
   * Resolves a specific normalized descriptor from a raw output set.
   */
  resolveDescriptor(key: NormalizedOutputKey, raw: RawProviderOutput): string | null {
    for (const synonym of OUTPUT_KEY_SYNONYMS[key]) {
      if (Object.prototype.hasOwnProperty.call(raw.outputs, synonym)) {
        return this.coerceToString(raw.outputs[synonym]);
      }
    }
    return null;
  }

  private coerceToString(value: any): string {
    if (value === null || value === undefined) return '';
    if (typeof value === 'string') return value;
    if (Array.isArray(value)) return value[0] !== undefined ? String(value[0]) : '';
    if (typeof value === 'object') {
      // Terraform sometimes wraps values in { value: ... } or { sensitive: true, value: ... }
      if (typeof value.value !== 'undefined') return this.coerceToString(value.value);
      return JSON.stringify(value);
    }
    return String(value);
  }
}

export const outputNormalizer = new OutputNormalizer();
