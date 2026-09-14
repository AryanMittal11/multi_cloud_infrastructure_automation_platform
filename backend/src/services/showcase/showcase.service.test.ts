import { showcaseService } from './showcase.service';
import { prisma } from '../../config/prisma';

jest.mock('../../config/prisma', () => ({
  prisma: {
    auditLog: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
    project: { create: jest.fn() },
    environment: { createMany: jest.fn(), findFirstOrThrow: jest.fn(), update: jest.fn() },
    cloudAccount: { create: jest.fn() },
    template: { findFirst: jest.fn() },
    architectureDesign: { create: jest.fn() },
    deployment: { create: jest.fn() },
    resource: { create: jest.fn() },
  },
}));

jest.mock('../../utils/crypto', () => ({
  encryptCredential: jest.fn(() => 'encrypted'),
}));

jest.mock('../../utils/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

import { logger } from '../../utils/logger';

const mockedPrisma = prisma as jest.Mocked<typeof prisma>;

describe('showcase.service', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('seeds showcase artifacts on first admin login', async () => {
    (prisma.auditLog.findFirst as jest.Mock).mockResolvedValue(null); // not prepared yet
    (prisma.project.create as jest.Mock).mockResolvedValue({ id: 'proj-1', name: 'Showcase' });
    (prisma.environment.findFirstOrThrow as jest.Mock).mockResolvedValue({ id: 'env-1' });
    (prisma.cloudAccount.create as jest.Mock).mockResolvedValue({ id: 'acc-1' });
    (prisma.template.findFirst as jest.Mock).mockResolvedValue({ id: 'tmpl-1' });
    (prisma.deployment.create as jest.Mock).mockResolvedValue({ id: 'dep-1' });
    (prisma.resource.create as jest.Mock).mockResolvedValue({ id: 'res-1' });
    (logger.warn as jest.Mock).mockImplementation((msg: string) => {
      throw new Error(`showcase swallowed an error: ${msg}`);
    });

    await showcaseService.prepareShowcaseForAdmin('admin-1');

    expect(prisma.project.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ name: 'Showcase' }) })
    );
    expect(prisma.cloudAccount.create).toHaveBeenCalledTimes(1);
    expect(prisma.architectureDesign.create).toHaveBeenCalledTimes(2);
    expect(prisma.deployment.create).toHaveBeenCalledTimes(1);
    expect(prisma.resource.create).toHaveBeenCalledTimes(3);
    // marker written last
    expect(prisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ action: 'SHOWCASE_PREPARED' }) })
    );
  });

  it('is a no-op once the marker exists', async () => {
    (prisma.auditLog.findFirst as jest.Mock).mockResolvedValue({ id: 'marker' });

    await showcaseService.prepareShowcaseForAdmin('admin-1');

    expect(prisma.project.create).not.toHaveBeenCalled();
    expect(prisma.auditLog.create).not.toHaveBeenCalled();
  });

  it('never throws — failures are swallowed so login proceeds', async () => {
    (prisma.auditLog.findFirst as jest.Mock).mockRejectedValue(new Error('db down'));

    await expect(showcaseService.prepareShowcaseForAdmin('admin-1')).resolves.toBeUndefined();
  });
});
