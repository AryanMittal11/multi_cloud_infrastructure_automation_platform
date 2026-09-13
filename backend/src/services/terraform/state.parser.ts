import fs from 'fs';
import path from 'path';
import { ParsedResourceItem, ParsedStateResult } from './terraform.types';

export class StateParser {
  /**
   * Parses the terraform.tfstate or terraform show -json output from a workspace.
   */
  parseWorkspaceState(workspaceDir: string): ParsedStateResult {
    const statePath = path.join(workspaceDir, 'terraform.tfstate');

    if (!fs.existsSync(statePath)) {
      return { resources: [], outputs: {} };
    }

    try {
      const rawState = JSON.parse(fs.readFileSync(statePath, 'utf8'));
      return this.parseStateJson(rawState);
    } catch (err) {
      console.error(`Error parsing terraform.tfstate at ${statePath}:`, err);
      return { resources: [], outputs: {} };
    }
  }

  /**
   * Parses raw Terraform state JSON into platform resource descriptors.
   */
  parseStateJson(state: any): ParsedStateResult {
    const resources: ParsedResourceItem[] = [];
    const outputs: Record<string, any> = {};

    // 1. Parse Outputs
    if (state.outputs && typeof state.outputs === 'object') {
      for (const [key, valueObj] of Object.entries<any>(state.outputs)) {
        outputs[key] = valueObj.value !== undefined ? valueObj.value : valueObj;
      }
    }

    // 2. Parse Resources
    const rawResources = Array.isArray(state.resources) ? state.resources : [];

    for (const res of rawResources) {
      // Each resource entry may have multiple instances (e.g. with count)
      const instances = Array.isArray(res.instances) ? res.instances : [];

      for (let i = 0; i < instances.length; i++) {
        const inst = instances[i];
        const attributes = inst.attributes || {};

        // Extract primary native provider resource ID
        const providerResourceId =
          attributes.arn ||
          attributes.id ||
          attributes.vpc_id ||
          attributes.bucket ||
          `${res.type}.${res.name}`;

        const item: ParsedResourceItem = {
          type: res.type,
          name: instances.length > 1 ? `${res.name}[${i}]` : res.name,
          provider: (res.provider || 'aws').replace(/^provider\[.*?\]\./, '').toUpperCase(),
          providerResourceId,
          status: 'ACTIVE',
          outputs: attributes,
          dependencies: inst.dependencies || [],
        };

        resources.push(item);
      }
    }

    return {
      resources,
      outputs,
      formatVersion: state.version ? String(state.version) : undefined,
    };
  }
}

export const stateParser = new StateParser();
