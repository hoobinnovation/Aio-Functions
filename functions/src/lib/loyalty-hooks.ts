import { EntityManager } from 'typeorm';
import { LoyaltyAccountEntity } from '../db/entities/LoyaltyAccountEntity';
import { LoyaltySettingEntity } from '../db/entities/LoyaltySettingEntity';
import { LoyaltyTransactionEntity } from '../db/entities/LoyaltyTransactionEntity';

export const issueLoyaltyPointsForPaidOrder = async (input: {
  manager: EntityManager;
  storeId: string;
  uid: string;
  orderId: string;
  amount: number;
}): Promise<number> => {
  const settingsRepo = input.manager.getRepository(LoyaltySettingEntity);
  const accountRepo = input.manager.getRepository(LoyaltyAccountEntity);
  const txnRepo = input.manager.getRepository(LoyaltyTransactionEntity);

  let settings = await settingsRepo.findOne({ where: { storeId: input.storeId } });
  if (!settings) {
    settings = await settingsRepo.save(
      settingsRepo.create({
        storeId: input.storeId,
        pointsPerCurrency: '1.0000',
        expiryDays: 365,
        redemptionEnabled: true,
        currencyPerPoint: '1.0000',
      }),
    );
  }

  const points = Math.floor(input.amount * Number(settings.pointsPerCurrency));
  if (points <= 0) return 0;

  let account = await accountRepo.findOne({ where: { storeId: input.storeId, uid: input.uid } });
  if (!account) {
    account = await accountRepo.save(accountRepo.create({ storeId: input.storeId, uid: input.uid, balance: 0 }));
  }

  account.balance += points;
  await accountRepo.save(account);

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + settings.expiryDays);

  await txnRepo.save(
    txnRepo.create({
      storeId: input.storeId,
      uid: input.uid,
      type: 'earn',
      points,
      reason: 'Order paid',
      refType: 'order',
      refId: input.orderId,
      expiresAt,
    }),
  );

  return points;
};
