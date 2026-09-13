import { Provider } from '@prisma/client';
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
  });

  describe('Safe Account Deletion', () => {
    it('should prevent account deletion if active environments are associated', async () => {
      (prisma.cloudAccount.findUnique as jest.Mock).mockResolvedValue({
        id: 'acc-bound',
        name: 'Bound Account',
        environments: [{ id: 'env-1', name: 'production' }],
      });

      await expect(cloudService.deleteCloudAccount('acc-bound', 'usr-admin')).rejects.toThrow(
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

      const res = await cloudService.deleteCloudAccount('acc-free', 'usr-admin');
      expect(res.success).toBe(true);
      expect(prisma.cloudAccount.delete).toHaveBeenCalledWith({ where: { id: 'acc-free' } });
    });
  });
});
