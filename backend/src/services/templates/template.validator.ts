import { JSONSchema, ValidationErrorItem, ValidationResult } from './template.types';

/**
 * Validates user-supplied deployment parameters against a template JSONSchema.
 * Automatically injects schema defaults for omitted optional properties.
 */
export function validateTemplateInput(
  schema: JSONSchema,
  input: Record<string, any> = {},
): ValidationResult {
  const errors: ValidationErrorItem[] = [];
  const sanitized: Record<string, any> = {};

  const properties = schema.properties || {};
  const requiredFields = new Set(schema.required || []);

  // 1. Check required fields
  for (const field of requiredFields) {
    const value = input[field];
    if (value === undefined || value === null || (typeof value === 'string' && value.trim() === '')) {
      errors.push({
        field,
        message: `Field "${field}" is required`,
        code: 'REQUIRED',
      });
    }
  }

  // 2. Validate provided or default properties
  for (const [key, prop] of Object.entries(properties)) {
    let value = input[key];

    // Apply default value if omitted and defined
    if ((value === undefined || value === null || value === '') && prop.default !== undefined) {
      value = prop.default;
    }

    // If still undefined and not required, skip type checking
    if (value === undefined || value === null) {
      continue;
    }

    // Type checking
    switch (prop.type) {
      case 'string':
        if (typeof value !== 'string') {
          errors.push({
            field: key,
            message: `Field "${key}" must be a string`,
            code: 'INVALID_TYPE',
          });
          continue;
        }

        // Pattern matching
        if (prop.pattern) {
          try {
            const regex = new RegExp(prop.pattern);
            if (!regex.test(value)) {
              errors.push({
                field: key,
                message: `Field "${key}" must match pattern: ${prop.pattern}`,
                code: 'PATTERN_MISMATCH',
              });
              continue;
            }
          } catch {
            // In case of malformed regex in schema
          }
        }

        // Enum checking
        if (prop.enum && !prop.enum.includes(value)) {
          errors.push({
            field: key,
            message: `Field "${key}" must be one of: [${prop.enum.join(', ')}]`,
            code: 'INVALID_ENUM',
          });
          continue;
        }
        break;

      case 'number':
      case 'integer':
        if (typeof value !== 'number' || isNaN(value)) {
          errors.push({
            field: key,
            message: `Field "${key}" must be a number`,
            code: 'INVALID_TYPE',
          });
          continue;
        }

        if (prop.minimum !== undefined && value < prop.minimum) {
          errors.push({
            field: key,
            message: `Field "${key}" must be at least ${prop.minimum}`,
            code: 'MINIMUM',
          });
          continue;
        }

        if (prop.maximum !== undefined && value > prop.maximum) {
          errors.push({
            field: key,
            message: `Field "${key}" cannot exceed ${prop.maximum}`,
            code: 'MAXIMUM',
          });
          continue;
        }
        break;

      case 'boolean':
        if (typeof value !== 'boolean') {
          errors.push({
            field: key,
            message: `Field "${key}" must be a boolean`,
            code: 'INVALID_TYPE',
          });
          continue;
        }
        break;

      case 'array':
        if (!Array.isArray(value)) {
          errors.push({
            field: key,
            message: `Field "${key}" must be an array`,
            code: 'INVALID_TYPE',
          });
          continue;
        }

        if (prop.minItems !== undefined && value.length < prop.minItems) {
          errors.push({
            field: key,
            message: `Field "${key}" must contain at least ${prop.minItems} item(s)`,
            code: 'MIN_ITEMS',
          });
          continue;
        }

        if (prop.items?.type) {
          const itemType = prop.items.type;
          const hasInvalidItem = value.some((item) => typeof item !== itemType);
          if (hasInvalidItem) {
            errors.push({
              field: key,
              message: `All items in "${key}" must be of type ${itemType}`,
              code: 'INVALID_ITEM_TYPE',
            });
            continue;
          }
        }
        break;

      case 'object':
        if (typeof value !== 'object' || Array.isArray(value)) {
          errors.push({
            field: key,
            message: `Field "${key}" must be an object`,
            code: 'INVALID_TYPE',
          });
          continue;
        }
        break;
    }

    sanitized[key] = value;
  }

  return {
    valid: errors.length === 0,
    errors,
    sanitizedConfiguration: sanitized,
  };
}
