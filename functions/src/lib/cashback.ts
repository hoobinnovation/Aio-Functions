import { DataSource } from 'typeorm';
import { CashbackCampaignEntity } from '../db/entities/CashbackCampaignEntity';
import { CashbackRedemptionEntity } from '../db/entities/CashbackRedemptionEntity';
import { WalletAccountEntity } from '../db/entities/WalletAccountEntity';
import { WalletTransactionEntity } from '../db/entities/WalletTransactionEntity';

export const computeCashback = async (ds: DataSource, input: { storeId: string; uid: string; subtotal: number; productIds: string[]; categoryIds: string[]; }): Promise<{ campaign: CashbackCampaignEntity | null; amount: number }> => {
  const repo = ds.getRepository(CashbackCampaignEntity);
  const list = await repo.find({ where: { storeId: input.storeId, isActive: true }, order: { createdAt: 'ASC' } });
  const now = new Date();
  for (const c of list) {
    if (c.startAt && c.startAt > now) continue;
    if (c.endAt && c.endAt < now) continue;
    if (c.minSubtotal && input.subtotal < Number(c.minSubtotal)) continue;
    if (c.usageLimitTotal !== null && c.usageLimitTotal !== undefined && c.usedCount >= c.usageLimitTotal) continue;

    const target = (c.targetJson ?? {}) as { productIds?: string[]; categoryIds?: string[] };
    if (c.type === 'products' && target.productIds && !input.productIds.some((id) => target.productIds?.includes(id))) continue;
    if (c.type === 'categories' && target.categoryIds && !input.categoryIds.some((id) => target.categoryIds?.includes(id))) continue;

    const raw = c.rewardType === 'percent' ? (input.subtotal * Number(c.value)) / 100 : Number(c.value);
    const amount = c.maxReward ? Math.min(raw, Number(c.maxReward)) : raw;
    if (amount > 0) return { campaign: c, amount };
  }
  return { campaign: null, amount: 0 };
};

export const applyCashbackEarn = async (input: {
  ds: DataSource;
  storeId: string;
  uid: string;
  orderId: string;
  amount: number;
  campaign: CashbackCampaignEntity;
}): Promise<void> => {
  const qr = input.ds.createQueryRunner();
  await qr.connect();
  await qr.startTransaction();
  try {
    const accRepo = qr.manager.getRepository(WalletAccountEntity);
    const txnRepo = qr.manager.getRepository(WalletTransactionEntity);
    const redRepo = qr.manager.getRepository(CashbackRedemptionEntity);
    const campRepo = qr.manager.getRepository(CashbackCampaignEntity);

    if (input.campaign.usageLimitPerUser !== null && input.campaign.usageLimitPerUser !== undefined) {
      const usedByUser = await redRepo.count({ where: { campaignId: input.campaign.id, uid: input.uid } });
      if (usedByUser >= input.campaign.usageLimitPerUser) {
        await qr.rollbackTransaction();
        return;
      }
    }

    let account = await accRepo.findOne({ where: { storeId: input.storeId, uid: input.uid } });
    if (!account) account = await accRepo.save(accRepo.create({ storeId: input.storeId, uid: input.uid, balance: '0.00' }));
    account.balance = (Number(account.balance) + input.amount).toFixed(2);
    await accRepo.save(account);

    await txnRepo.save(txnRepo.create({ storeId: input.storeId, uid: input.uid, type: 'cashback_earn', amount: input.amount.toFixed(2), reason: 'Cashback earned', refType: 'order', refId: input.orderId }));
    await redRepo.save(redRepo.create({ storeId: input.storeId, campaignId: input.campaign.id, uid: input.uid, orderId: input.orderId }));

    input.campaign.usedCount += 1;
    await campRepo.save(input.campaign);

    await qr.commitTransaction();
  } catch (e) {
    await qr.rollbackTransaction();
    throw e;
  } finally {
    await qr.release();
  }
};
