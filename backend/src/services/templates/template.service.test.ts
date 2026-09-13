import { TemplateService } from './template.service';
import { prisma } from '../../config/prisma';
import { Provider } from '@prisma/client';

// Mock Prisma
jest.mock('../../config/prisma', () => ({
  prisma: {
    template: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  },
}));

describe('TemplateService', () => {
  let templateService: TemplateService;

  beforeEach(() => {
    templateService = new TemplateService();
    jest.clearAllMocks();
  });

  describe('Template Catalog Operations', () => {
    it('should return list of templates from database', async () => {
      const mockTemplates = [
        {
          id: 'tmpl-1',
          name: 'AWS Modular VPC',
          provider: Provider.AWS,
          version: '1.0.0',
          description: 'Modular VPC',
          templateReference: 'templates/aws/aws_vpc',
          inputSchema: { type: 'object', properties: {} },
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      (prisma.template.findMany as jest.Mock).mockResolvedValue(mockTemplates);

      const result = await templateService.listTemplates({ provider: Provider.AWS });

      expect(prisma.template.findMany).toHaveBeenCalledWith({
        where: { provider: Provider.AWS },
        orderBy: { name: 'asc' },
      });
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('AWS Modular VPC');
    });

    it('should validate configuration using template inputSchema', async () => {
      const mockTemplate = {
        id: 'tmpl-vpc',
        name: 'AWS VPC',
        provider: Provider.AWS,
        version: '1.0.0',
        inputSchema: {
          type: 'object',
          required: ['vpc_cidr'],
          properties: {
            vpc_cidr: { type: 'string' },
            environment_name: { type: 'string', default: 'dev-network' },
          },
        },
      };

      (prisma.template.findUnique as jest.Mock).mockResolvedValue(mockTemplate);

      const validation = await templateService.validateConfiguration('tmpl-vpc', {
        vpc_cidr: '10.0.0.0/16',
      });

      expect(validation.valid).toBe(true);
      expect(validation.sanitizedConfiguration.environment_name).toBe('dev-network');
    });

    it('should throw 404 for unknown template ID during validation', async () => {
      (prisma.template.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        templateService.validateConfiguration('tmpl-unknown', { foo: 'bar' }),
      ).rejects.toThrow('Template not found');
    });
  });
});
