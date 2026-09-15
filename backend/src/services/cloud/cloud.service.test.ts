import { Provider, Role } from '@prisma/client';
import { CloudService } from './cloud.service';
import { prisma } from '../../config/prisma';
import { decryptCredential } from '../../utils/crypto';

// Mock Prisma
jest.mock('../../config/prisma', () => ({
  prisma: {
    cloudAccount: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      delete: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
    },
  },
}));

describe('CloudService', () => {
  let cloudService: CloudService;

  beforeEach(() => {
    cloudService = new CloudService();
    jest.clearAllMocks();
  });

  describe('Cloud Account Onboarding', () => {
    it('should onboard an AWS account, encrypt credentials, and mask account reference in output', async () => {
      const mockAwsCreds = {
        accessKeyId: 'AKIA_MOCK_1234567890',
        secretAccessKey: 'mockSecretAccessKeyLengthOver16Chars!',
        defaultRegion: 'us-east-1',
      };

      (prisma.cloudAccount.create as jest.Mock).mockImplementation((args) => {
        return Promise.resolve({
          id: 'acc-1',
          name: args.data.name,
          provider: args.data.provider,
          accountReference: args.data.accountReference,
          encryptedCredentialReference: args.data.encryptedCredentialReference,
          ownerId: args.data.ownerId,
          projectId: args.data.projectId,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      });

      const res = await cloudService.createCloudAccount('usr-admin', {
        name: 'Primary AWS Prod',
        provider: Provider.AWS,
        credentials: mockAwsCreds,
        skipValidation: true,
      });

      expect(res.id).toBe('acc-1');
      expect(res.name).toBe('Primary AWS Prod');
      expect(res.provider).toBe(Provider.AWS);
      // Ensure encryptedCredentialReference is NOT leaked in response
      expect((res as any).encryptedCredentialReference).toBeUndefined();
      expect(res.maskedAccountReference).toBeDefined();

      // Verify Prisma was called with encrypted credential
      const createCall = (prisma.cloudAccount.create as jest.Mock).mock.calls[0][0];
      const encryptedData = createCall.data.encryptedCredentialReference;
      expect(typeof encryptedData).toBe('string');
      expect(encryptedData.split(':')).toHaveLength(3); // iv:tag:ciphertext

      // Verify credentials can be decrypted correctly
      const decrypted = decryptCredential(encryptedData);
      expect(decrypted.accessKeyId).toBe(mockAwsCreds.accessKeyId);

      // Verify audit log was recorded
      expect(prisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: 'CLOUD_ACCOUNT_ONBOARDED',
            status: 'SUCCESS',
          }),
        }),
      );
    });

    it('should reject invalid AWS access key formatting', async () => {
      await expect(
        cloudService.createCloudAccount('usr-admin', {
          name: 'Invalid AWS Account',
          provider: Provider.AWS,
          credentials: {
            accessKeyId: 'invalid-key',
            secretAccessKey: 'short',
          } as any,
          skipValidation: false,
        }),
      ).rejects.toThrow('Invalid AWS Access Key ID format');
    });

    it('should onboard an Azure account and normalize the subscription ID as account reference', async () => {
      const mockAzureCreds = {
        clientId: '11111111-1111-1111-1111-111111111111',
        clientSecret: 'super-secret-client-secret-value',
        tenantId: '22222222-2222-2222-2222-222222222222',
        subscriptionId: '33333333-3333-3333-3333-333333333333',
      };

      (prisma.cloudAccount.create as jest.Mock).mockImplementation((args) => {
        return Promise.resolve({
          id: 'acc-azure-1',
          name: args.data.name,
          provider: args.data.provider,
          accountReference: args.data.accountReference,
          encryptedCredentialReference: args.data.encryptedCredentialReference,
          ownerId: args.data.ownerId,
          projectId: args.data.projectId,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      });

      const res = await cloudService.createCloudAccount('usr-admin', {
        name: 'Azure Production',
        provider: Provider.AZURE,
        credentials: mockAzureCreds,
        skipValidation: true,
      });

      expect(res.provider).toBe(Provider.AZURE);
      expect(res.accountReference).toBe(mockAzureCreds.subscriptionId);

      // Verify credentials round-trip through encryption
      const createCall = (prisma.cloudAccount.create as jest.Mock).mock.calls[0][0];
      const decrypted = decryptCredential(createCall.data.encryptedCredentialReference);
      expect(decrypted.clientId).toBe(mockAzureCreds.clientId);
      expect(decrypted.tenantId).toBe(mockAzureCreds.tenantId);
    });

    it('should reject Azure onboarding with malformed client ID', async () => {
      await expect(
        cloudService.createCloudAccount('usr-admin', {
          name: 'Broken Azure',
          provider: Provider.AZURE,
          credentials: {
            clientId: 'not-a-uuid',
            clientSecret: 'some-secret-value-long-enough',
            tenantId: '22222222-2222-2222-2222-222222222222',
            subscriptionId: '33333333-3333-3333-3333-333333333333',
          } as any,
          skipValidation: true,
        }),
      ).rejects.toThrow('Invalid Azure Client ID format');
    });

    it('should onboard a GCP account and normalize the project ID as account reference', async () => {
      const mockGcpCreds = {
        projectId: 'infra-platform-prod',
        clientEmail: 'terraform@infra-platform-prod.iam.gserviceaccount.com',
        privateKey:
          '-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC7VJTUt9Us8cKj\nMzEfYyjiWA4yX0nWVZbZJkZKq0PnHnRmNhU7wW0binH0uBHzfRKhh0Oa2Y0OF9Uu\nTmncJFQCLw-----END PRIVATE KEY-----\n',
      };

      (prisma.cloudAccount.create as jest.Mock).mockImplementation((args) => {
        return Promise.resolve({
          id: 'acc-gcp-1',
          name: args.data.name,
          provider: args.data.provider,
          accountReference: args.data.accountReference,
          encryptedCredentialReference: args.data.encryptedCredentialReference,
          ownerId: args.data.ownerId,
          projectId: args.data.projectId,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      });
      (prisma.cloudAccount.findUnique as jest.Mock).mockResolvedValue(null);

      const res = await cloudService.createCloudAccount('usr-admin', {
        name: 'GCP Production',
        provider: Provider.GCP,
        credentials: mockGcpCreds,
        skipValidation: true,
      });

      expect(res.provider).toBe(Provider.GCP);
      expect(res.accountReference).toBe(mockGcpCreds.projectId);

      const createCall = (prisma.cloudAccount.create as jest.Mock).mock.calls[0][0];
      const decrypted = decryptCredential(createCall.data.encryptedCredentialReference);
      expect(decrypted.clientEmail).toBe(mockGcpCreds.clientEmail);
    });

    it('should reject GCP onboarding with malformed service account email', async () => {
      await expect(
        cloudService.createCloudAccount('usr-admin', {
          name: 'Broken GCP',
          provider: Provider.GCP,
          credentials: {
            projectId: 'infra-platform-prod',
            clientEmail: 'not-a-service-account@gmail.com',
            privateKey: 'not-a-private-key',
          } as any,
          skipValidation: true,
        }),
      ).rejects.toThrow('Invalid GCP Client Email format');
    });
  });

  describe('Safe Account Deletion', () => {
    it('should prevent account deletion if active environments are associated', async () => {
      (prisma.cloudAccount.findUnique as jest.Mock).mockResolvedValue({
        id: 'acc-bound',
        name: 'Bound Account',
        environments: [{ id: 'env-1', name: 'production' }],
      });

      await expect(cloudService.deleteCloudAccount('acc-bound', 'usr-admin', Role.ADMIN)).rejects.toThrow(
        'currently associated with 1 environment',
      );
      expect(prisma.cloudAccount.delete).not.toHaveBeenCalled();
    });

    it('should allow deletion when no environments are associated', async () => {
      (prisma.cloudAccount.findUnique as jest.Mock).mockResolvedValue({
        id: 'acc-free',
        name: 'Free Account',
        environments: [],
      });

      const res = await cloudService.deleteCloudAccount('acc-free', 'usr-admin', Role.ADMIN);
      expect(res.success).toBe(true);
      expect(prisma.cloudAccount.delete).toHaveBeenCalledWith({ where: { id: 'acc-free' } });
    });
  });
});
