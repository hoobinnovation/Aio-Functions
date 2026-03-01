import Joi from 'joi';
import { onCall } from 'firebase-functions/v2/https';
import { getDataSource } from '../db/data-source';
import { LoyaltyAccountEntity } from '../db/entities/LoyaltyAccountEntity';
import { LoyaltySettingEntity } from '../db/entities/LoyaltySettingEntity';
import { LoyaltyTierEntity } from '../db/entities/LoyaltyTierEntity';
import { LoyaltyTransactionEntity } from '../db/entities/LoyaltyTransactionEntity';
import { verifyFirebaseUser } from '../lib/auth';
import { failedPrecondition, mapError } from '../lib/errors';
import { uuidSchema, validatePayload } from '../lib/validators';

const getOrCreateAccount = async (storeId: string, uid: string): Promise<LoyaltyAccountEntity> => {
  const repo = (await getDataSource()).getRepository(LoyaltyAccountEntity);
  let account = await repo.findOne({ where: { storeId, uid } });
  if (!account) account = await repo.save(repo.create({ storeId, uid, balance: 0 }));
  return account;
};

const getSettings = async (storeId: string): Promise<LoyaltySettingEntity> => {
  const repo = (await getDataSource()).getRepository(LoyaltySettingEntity);
  let row = await repo.findOne({ where: { storeId } });
  if (!row) row = await repo.save(repo.create({ storeId, pointsPerCurrency: '1.0000', expiryDays: 365, redemptionEnabled: true, currencyPerPoint: '1.0000' }));
  return row;
};

export const loyaltyGetDashboard = onCall(async (request) => {
  try {
    const uid = verifyFirebaseUser(request);
    const payload = validatePayload(Joi.object({ storeId: uuidSchema.required() }), request.data);
    const account = await getOrCreateAccount(payload.storeId, uid);
    const settings = await getSettings(payload.storeId);
    const recentTxns = await (await getDataSource()).getRepository(LoyaltyTransactionEntity).find({ where: { storeId: payload.storeId, uid }, order: { createdAt: 'DESC' }, take: 20 });
    const tier = account.tierId ? await (await getDataSource()).getRepository(LoyaltyTierEntity).findOne({ where: { id: account.tierId } }) : null;
    return { balance: account.balance, tier, settingsSummary: settings, recentTxns };
  } catch (error) { mapError(error); }
});

export const loyaltyListTransactions = onCall(async (request) => {
  try {
    const uid = verifyFirebaseUser(request);
    const payload = validatePayload(Joi.object({ storeId: uuidSchema.required(), type: Joi.string().valid('earn','redeem','expire','adjust').optional(), page: Joi.number().integer().min(1).default(1), pageSize: Joi.number().integer().min(1).max(100).default(20) }), request.data);
    const repo = (await getDataSource()).getRepository(LoyaltyTransactionEntity);
    const where = payload.type ? { storeId: payload.storeId, uid, type: payload.type } : { storeId: payload.storeId, uid };
    const [items, total] = await repo.findAndCount({ where, order: { createdAt: 'DESC' }, skip: (payload.page - 1) * payload.pageSize, take: payload.pageSize });
    return { items, total };
  } catch (error) { mapError(error); }
});

export const loyaltyRedeem = onCall(async (request) => {
  try {
    const uid = verifyFirebaseUser(request);
    const payload = validatePayload(Joi.object({ storeId: uuidSchema.required(), points: Joi.number().integer().min(1).required() }), request.data);

    const ds = await getDataSource();
    const qr = ds.createQueryRunner();
    await qr.connect();
    await qr.startTransaction();
    try {
      const settingsRepo = qr.manager.getRepository(LoyaltySettingEntity);
      const accountRepo = qr.manager.getRepository(LoyaltyAccountEntity);
      const txnRepo = qr.manager.getRepository(LoyaltyTransactionEntity);

      let settings = await settingsRepo.findOne({ where: { storeId: payload.storeId } });
      if (!settings) settings = await settingsRepo.save(settingsRepo.create({ storeId: payload.storeId, pointsPerCurrency: '1.0000', expiryDays: 365, redemptionEnabled: true, currencyPerPoint: '1.0000' }));
      if (!settings.redemptionEnabled) failedPrecondition('Redemption is disabled.');

      let account = await accountRepo.findOne({ where: { storeId: payload.storeId, uid } });
      if (!account) account = await accountRepo.save(accountRepo.create({ storeId: payload.storeId, uid, balance: 0 }));
      if (account.balance < payload.points) failedPrecondition('Not enough points.');

      account.balance -= payload.points;
      await accountRepo.save(account);
      await txnRepo.save(txnRepo.create({ storeId: payload.storeId, uid, type: 'redeem', points: -payload.points, reason: 'User redeem', refType: 'user', refId: uid }));

      await qr.commitTransaction();
      return { newBalance: account.balance, redeemedValue: payload.points * Number(settings.currencyPerPoint) };
    } catch (e) { await qr.rollbackTransaction(); throw e; } finally { await qr.release(); }
  } catch (error) { mapError(error); }
});
