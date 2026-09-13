import { Provider } from '@prisma/client';
import {
  ArchetypeSpec,
  ARCHETYPE_SPECS,
  COMPUTE_TIER_SKU_MAP,
  ComputeTier,
  REGION_MAP,
  ProviderSkuSet,
  TemplateArchetype,
  UniversalRegion,
} from './portability.types';

export interface UniversalIntent {
  archetype: TemplateArchetype;
  /** Abstract compute tier sizing (small | medium | large) */
  tier: ComputeTier;
  /** Canonical universal region identifier (e.g. 'us-east-1') */
  region: UniversalRegion;
}

export interface ProviderMappedPlan {
  provider: Provider;
  archetype: TemplateArchetype;
  /** Ordered provider-native Terraform module references */
  modules: string[];
  /** Provider-native compute SKU translated from the abstract tier */
  computeSku: string;
  /** Provider-native database SKU translated from the abstract tier */
  databaseSku: string;
  /** Provider-native region translated from the universal region */
  region: string;
  /** Resource layers this archetype instantiates, in dependency order */
  resourceLayers: string[];
}

export class CloudMapper {
  /**
   * Resolves the universal intent into a concrete, provider-specific provisioning plan.
   */
  mapIntent(intent: UniversalIntent, targetProvider: Provider): ProviderMappedPlan {
    const archetypeSpec: ArchetypeSpec = ARCHETYPE_SPECS[intent.archetype];
    if (!archetypeSpec) {
      const error: any = new Error(`Unknown template archetype: ${intent.archetype}`);
      error.statusCode = 400;
      throw error;
    }

    const tierMap = COMPUTE_TIER_SKU_MAP[targetProvider];
    if (!tierMap) {
      const error: any = new Error(`Unsupported cloud provider: ${targetProvider}`);
      error.statusCode = 400;
      throw error;
    }

    const skuSet: ProviderSkuSet = tierMap[intent.tier];
    if (!skuSet) {
      const error: any = new Error(`Unknown compute tier: ${intent.tier}`);
      error.statusCode = 400;
      throw error;
    }

    const regionEntry = REGION_MAP[intent.region];
    if (!regionEntry) {
      const error: any = new Error(`Unknown universal region: ${intent.region}`);
      error.statusCode = 400;
      throw error;
    }

    return {
      provider: targetProvider,
      archetype: intent.archetype,
      modules: archetypeSpec.moduleMap[targetProvider],
      computeSku: skuSet.compute,
      databaseSku: skuSet.database,
      region: regionEntry[targetProvider],
      resourceLayers: archetypeSpec.resourceLayers,
    };
  }

  /**
   * Lists the provider module chains for every archetype (catalog introspection helper).
   */
  describeArchetypes(): ArchetypeSpec[] {
    return Object.values(ARCHETYPE_SPECS);
  }

  /**
   * Produces a cross-provider comparison of a universal intent (used by the
   * multi-cloud cost comparison tooling and deployment previews).
   */
  compareAcrossProviders(intent: UniversalIntent): ProviderMappedPlan[] {
    return (['AWS', 'AZURE', 'GCP'] as Provider[]).map((provider) =>
      this.mapIntent(intent, provider),
    );
  }

  /**
   * Translates a provider-native region back into the universal region identifier.
   */
  toUniversalRegion(provider: Provider, nativeRegion: string): UniversalRegion | null {
    for (const [universal, entry] of Object.entries(REGION_MAP)) {
      if (entry[provider] === nativeRegion) return universal as UniversalRegion;
    }
    return null;
  }
}

export const cloudMapper = new CloudMapper();
