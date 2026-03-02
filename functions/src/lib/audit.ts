import { EntityManager } from 'typeorm';
import { getDataSource } from '../db/data-source';
import { AuditLogEntity } from '../db/entities/AuditLogEntity';

type AuditInput = {
  actorType: 'user' | 'admin' | 'system';
  actorUid?: string | null;
  action: string;
  targetType: string;
  targetId: string;
  storeId?: string | null;
  metadata?: Record<string, unknown> | null;
};

export const writeAudit = async (input: AuditInput, manager?: EntityManager): Promise<void> => {
  const repo = manager
    ? manager.getRepository(AuditLogEntity)
    : (await getDataSource()).getRepository(AuditLogEntity);

  await repo.save(
    repo.create({
      actorType: input.actorType,
      actorUid: input.actorUid ?? null,
      action: input.action,
      targetType: input.targetType,
      targetId: input.targetId,
      storeId: input.storeId ?? null,
      metadata: input.metadata ?? null,
    }),
  );
};
