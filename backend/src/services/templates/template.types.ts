import { Provider } from '@prisma/client';

export interface JSONSchemaProperty {
  type: string;
  title?: string;
  description?: string;
  default?: any;
  enum?: any[];
  pattern?: string;
  minimum?: number;
  maximum?: number;
  items?: { type: string };
  minItems?: number;
  maxItems?: number;
}

export interface JSONSchema {
  $schema?: string;
  title?: string;
  description?: string;
  type: 'object';
  required?: string[];
  properties: Record<string, JSONSchemaProperty>;
}

export interface ValidationErrorItem {
  field: string;
  message: string;
  code?: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationErrorItem[];
  sanitizedConfiguration: Record<string, any>;
}

export interface TemplateResponse {
  id: string;
  name: string;
  provider: Provider | null; // Null indicates cross-cloud portable
  version: string;
  description: string | null;
  templateReference: string;
  inputSchema: JSONSchema;
  createdAt: Date;
  updatedAt: Date;
}
