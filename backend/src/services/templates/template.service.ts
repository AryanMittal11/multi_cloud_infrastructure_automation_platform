import fs from 'fs';
import path from 'path';
import { Provider } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { validateTemplateInput } from './template.validator';
import { JSONSchema, TemplateResponse, ValidationResult } from './template.types';

export class TemplateService {
  private templatesRootDir: string;

  constructor(templatesRootDir?: string) {
    // Defaults to backend/templates
    this.templatesRootDir =
      templatesRootDir || path.resolve(__dirname, '../../../templates');
  }

  /**
   * Scans templates on disk and synchronizes catalog entries with the database.
   */
  async syncTemplatesFromDisk(): Promise<{ syncedCount: number; templates: TemplateResponse[] }> {
    const awsDir = path.join(this.templatesRootDir, 'aws');
    const syncedTemplates: any[] = [];

    if (fs.existsSync(awsDir)) {
      const moduleDirs = fs
        .readdirSync(awsDir, { withFileTypes: true })
        .filter((d) => d.isDirectory())
        .map((d) => d.name);

      for (const moduleName of moduleDirs) {
        const schemaPath = path.join(awsDir, moduleName, 'schema.json');
        if (!fs.existsSync(schemaPath)) continue;

        try {
          const schemaContent: JSONSchema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
          const templateRef = `templates/aws/${moduleName}`;

          const existing = await prisma.template.findFirst({
            where: { templateReference: templateRef },
          });

          const name = schemaContent.title || moduleName;
          const description = schemaContent.description || null;

          let record;
          if (existing) {
            record = await prisma.template.update({
              where: { id: existing.id },
              data: {
                name,
                provider: Provider.AWS,
                version: '1.0.0',
                description,
                inputSchema: schemaContent as any,
              },
            });
          } else {
            record = await prisma.template.create({
              data: {
                name,
                provider: Provider.AWS,
                version: '1.0.0',
                description,
                templateReference: templateRef,
                inputSchema: schemaContent as any,
              },
            });
          }

          syncedTemplates.push(record);
        } catch (err) {
          console.error(`Failed to ingest template schema at ${schemaPath}:`, err);
        }
      }
    }

    return {
      syncedCount: syncedTemplates.length,
      templates: syncedTemplates.map((t) => this.formatTemplate(t)),
    };
  }

  /**
   * Lists available infrastructure templates.
   */
  async listTemplates(filter?: { provider?: Provider }): Promise<TemplateResponse[]> {
    const where: any = {};
    if (filter?.provider) {
      where.provider = filter.provider;
    }

    let templates = await prisma.template.findMany({
      where,
      orderBy: { name: 'asc' },
    });

    // Auto-sync if catalog is currently empty
    if (templates.length === 0) {
      const syncResult = await this.syncTemplatesFromDisk();
      templates = syncResult.templates as any;
    }

    return templates.map((t) => this.formatTemplate(t));
  }

  /**
   * Retrieves a single template by ID.
   */
  async getTemplateById(id: string): Promise<TemplateResponse | null> {
    const template = await prisma.template.findUnique({
      where: { id },
    });

    if (!template) return null;
    return this.formatTemplate(template);
  }

  /**
   * Validates user-supplied configuration values against the template's JSONSchema.
   */
  async validateConfiguration(
    templateId: string,
    configuration: Record<string, any>,
  ): Promise<ValidationResult> {
    const template = await prisma.template.findUnique({
      where: { id: templateId },
    });

    if (!template) {
      const error: any = new Error('Template not found');
      error.statusCode = 404;
      throw error;
    }

    const schema = template.inputSchema as unknown as JSONSchema;
    return validateTemplateInput(schema, configuration);
  }

  private formatTemplate(template: any): TemplateResponse {
    return {
      id: template.id,
      name: template.name,
      provider: template.provider,
      version: template.version,
      description: template.description,
      templateReference: template.templateReference,
      inputSchema: template.inputSchema as JSONSchema,
      createdAt: template.createdAt,
      updatedAt: template.updatedAt,
    };
  }
}

export const templateService = new TemplateService();
