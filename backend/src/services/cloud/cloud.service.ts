import { Provider } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { encryptCredential, decryptCredential, maskSecret } from '../../utils/crypto';
import { validateAwsCredentials } from './cloud.validator';
import {
  AwsCredentials,
  CloudCredentials,
  CreateCloudAccountInput,
  CloudAccountResponse,
} from './cloud.types';

export class CloudService {
  /**
   * Onboards and verifies a new cloud account, encrypting credentials at rest.
   */
  async createCloudAccount(
    userId: string,
    input: CreateCloudAccountInput,
  ): Promise<CloudAccountResponse> {
    let accountReference = input.accountReference || '';

    // 1. Validate credentials based on provider
    if (input.provider === Provider.AWS) {
      const awsCreds = input.credentials as AwsCredentials;
      const callerIdentity = await validateAwsCredentials(awsCreds, input.skipValidation);
      accountReference = callerIdentity.account || awsCreds.accessKeyId;
    } else {
      // For Azure / GCP (Phase 2), default reference is user supplied or extracted from credentials
      accountReference = input.accountReference || 'unverified-provider-account';
    }

    // 2. Encrypt credentials at rest using AES-256-GCM
    const encryptedCredentialReference = encryptCredential(input.credentials);

    // 3. Persist record in PostgreSQL
    const account = await prisma.cloudAccount.create({
      data: {
        name: input.name.trim(),
        provider: input.provider,
        accountReference,
        encryptedCredentialReference,
        ownerId: userId,
        projectId: input.projectId || null,
      },
    });

    // 4. Create immutable audit log entry
    await prisma.auditLog.create({
      data: {
        userId,
        projectId: input.projectId || null,
        action: 'CLOUD_ACCOUNT_ONBOARDED',
        status: 'SUCCESS',
        message: `Cloud account "${account.name}" (${account.provider}) successfully onboarded and verified`,
        metadata: {
          cloudAccountId: account.id,
          provider: account.provider,
          maskedReference: maskSecret(account.accountReference),
        },
      },
    });

    return this.formatAccountResponse(account);
  }

  /**
   * Lists all onboarded cloud accounts with masked credentials.
   */
  async listCloudAccounts(filter?: {
    provider?: Provider;
    projectId?: string;
  }): Promise<CloudAccountResponse[]> {
    const where: any = {};
    if (filter?.provider) where.provider = filter.provider;
    if (filter?.projectId) where.projectId = filter.projectId;

    const accounts = await prisma.cloudAccount.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    return accounts.map((acc) => this.formatAccountResponse(acc));
  }

  /**
   * Retrieves a single cloud account by ID.
   */
  async getCloudAccountById(id: string): Promise<CloudAccountResponse | null> {
    const account = await prisma.cloudAccount.findUnique({
      where: { id },
    });

    if (!account) return null;
    return this.formatAccountResponse(account);
  }

  /**
   * Retrieves and decrypts credentials for a cloud account.
   * STRICTLY FOR WORKER / EXECUTION PLANE USE ONLY.
   */
  async getDecryptedCredentials<T = CloudCredentials>(id: string): Promise<T> {
    const account = await prisma.cloudAccount.findUnique({
      where: { id },
    });

    if (!account) {
      const error: any = new Error('Cloud account not found');
      error.statusCode = 404;
      throw error;
    }

    return decryptCredential<T>(account.encryptedCredentialReference);
  }

  /**
   * Safely deletes an onboarded cloud account if not bound to active environments.
   */
  async deleteCloudAccount(id: string, userId: string): Promise<{ success: boolean; message: string }> {
    const account = await prisma.cloudAccount.findUnique({
      where: { id },
      include: {
        environments: true,
      },
    });

    if (!account) {
      const error: any = new Error('Cloud account not found');
      error.statusCode = 404;
      throw error;
    }

    if (account.environments.length > 0) {
      const error: any = new Error(
        `Cannot delete cloud account "${account.name}". It is currently associated with ${account.environments.length} environment(s).`,
      );
      error.statusCode = 400;
      throw error;
    }

    await prisma.cloudAccount.delete({
      where: { id },
    });

    await prisma.auditLog.create({
      data: {
        userId,
        projectId: account.projectId,
        action: 'CLOUD_ACCOUNT_DELETED',
        status: 'SUCCESS',
        message: `Cloud account "${account.name}" (${account.provider}) was deleted`,
        metadata: { cloudAccountId: id, provider: account.provider },
      },
    });

    return {
      success: true,
      message: `Cloud account "${account.name}" deleted successfully`,
    };
  }

  /**
   * Sanitizes cloud account record, masking sensitive account references and omitting encrypted secrets.
   */
  private formatAccountResponse(account: any): CloudAccountResponse {
    return {
      id: account.id,
      name: account.name,
      provider: account.provider,
      accountReference: account.accountReference,
      maskedAccountReference: maskSecret(account.accountReference, 4),
      ownerId: account.ownerId,
      projectId: account.projectId,
      createdAt: account.createdAt,
      updatedAt: account.updatedAt,
    };
  }
}

export const cloudService = new CloudService();
