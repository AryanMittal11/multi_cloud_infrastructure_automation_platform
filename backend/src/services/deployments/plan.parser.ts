import { PlanSummary, ResourcePlanAction } from './deployment.types';

export class PlanParser {
  /**
   * Parses raw Terraform plan output into a structured PlanSummary.
   */
  parsePlanOutput(rawOutput: string | null): PlanSummary {
    if (!rawOutput || typeof rawOutput !== 'string') {
      return {
        toAdd: 0,
        toChange: 0,
        toDestroy: 0,
        resourceActions: [],
        isDestructive: false,
      };
    }

    let toAdd = 0;
    let toChange = 0;
    let toDestroy = 0;
    const resourceActions: ResourcePlanAction[] = [];

    // 1. Extract canonical summary line: "Plan: X to add, Y to change, Z to destroy."
    const planMatch = rawOutput.match(
      /Plan:\s*(\d+)\s+to\s+add,\s*(\d+)\s+to\s+change,\s*(\d+)\s+to\s+destroy/i,
    );

    if (planMatch) {
      toAdd = parseInt(planMatch[1], 10) || 0;
      toChange = parseInt(planMatch[2], 10) || 0;
      toDestroy = parseInt(planMatch[3], 10) || 0;
    }

    // 2. Extract resource-level changes
    // Pattern: # aws_vpc.main will be created / updated / destroyed
    const resourceActionRegex = /#\s+([a-zA-Z0-9_-]+)\.([a-zA-Z0-9_\[\]-]+)\s+will\s+be\s+(created|updated in-place|destroyed|replaced)/gi;
    let match: RegExpExecArray | null;

    while ((match = resourceActionRegex.exec(rawOutput)) !== null) {
      const type = match[1];
      const name = match[2];
      const actionText = match[3].toLowerCase();

      let action: ResourcePlanAction['action'] = 'create';
      let changeSymbol: ResourcePlanAction['changeSymbol'] = '+';

      if (actionText.includes('created')) {
        action = 'create';
        changeSymbol = '+';
      } else if (actionText.includes('updated')) {
        action = 'update';
        changeSymbol = '~';
      } else if (actionText.includes('destroyed')) {
        action = 'destroy';
        changeSymbol = '-';
      } else if (actionText.includes('replaced')) {
        action = 'replace';
        changeSymbol = '-/+';
      }

      resourceActions.push({
        address: `${type}.${name}`,
        type,
        name,
        action,
        changeSymbol,
      });
    }

    // If summary line was not found, fallback to counting parsed resource actions
    if (!planMatch && resourceActions.length > 0) {
      toAdd = resourceActions.filter((r) => r.action === 'create' || r.action === 'replace').length;
      toChange = resourceActions.filter((r) => r.action === 'update').length;
      toDestroy = resourceActions.filter((r) => r.action === 'destroy' || r.action === 'replace').length;
    }

    return {
      toAdd,
      toChange,
      toDestroy,
      resourceActions,
      isDestructive: toDestroy > 0,
    };
  }
}

export const planParser = new PlanParser();
