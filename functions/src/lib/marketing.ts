import { EntityManager } from 'typeorm';
import { MarketingTouchpointEntity } from '../db/entities/MarketingTouchpointEntity';
import { OrderAttributionEntity } from '../db/entities/OrderAttributionEntity';
import { getDataSource } from '../db/data-source';

export const upsertTouchpoint = async (input: {
  storeId: string;
  sessionId: string;
  uid?: string | null;
  deviceIdHash?: string | null;
  touch: Record<string, unknown>;
}): Promise<MarketingTouchpointEntity> => {
  const repo = (await getDataSource()).getRepository(MarketingTouchpointEntity);
  let row = await repo.findOne({ where: { storeId: input.storeId, sessionId: input.sessionId } });
  if (!row) {
    row = repo.create({
      storeId: input.storeId,
      sessionId: input.sessionId,
      uid: input.uid ?? null,
      deviceIdHash: input.deviceIdHash ?? null,
      firstTouchJson: input.touch,
      lastTouchJson: input.touch,
    });
  } else {
    row.lastTouchJson = input.touch;
    if (input.uid) row.uid = input.uid;
    if (input.deviceIdHash) row.deviceIdHash = input.deviceIdHash;
  }
  return repo.save(row);
};

export const attachOrderAttribution = async (input: {
  manager?: EntityManager;
  storeId: string;
  orderId: string;
  insuranceOrderId?: string | null;
  sessionId?: string | null;
}): Promise<void> => {
  if (!input.sessionId) return;
  const repoTouch = input.manager
    ? input.manager.getRepository(MarketingTouchpointEntity)
    : (await getDataSource()).getRepository(MarketingTouchpointEntity);
  const touch = await repoTouch.findOne({ where: { storeId: input.storeId, sessionId: input.sessionId } });
  if (!touch) return;

  const repoAttr = input.manager
    ? input.manager.getRepository(OrderAttributionEntity)
    : (await getDataSource()).getRepository(OrderAttributionEntity);
  await repoAttr.save(
    repoAttr.create({
      orderId: input.orderId,
      storeId: input.storeId,
      insuranceOrderId: input.insuranceOrderId ?? null,
      firstTouchJson: touch.firstTouchJson,
      lastTouchJson: touch.lastTouchJson,
    }),
  );
};
