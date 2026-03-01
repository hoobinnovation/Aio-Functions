import Joi from 'joi';
import { onCall } from 'firebase-functions/v2/https';
import { getDataSource } from '../../db/data-source';
import { LoyaltyAccountEntity } from '../../db/entities/LoyaltyAccountEntity';
import { LoyaltySettingEntity } from '../../db/entities/LoyaltySettingEntity';
import { LoyaltyTierEntity } from '../../db/entities/LoyaltyTierEntity';
import { LoyaltyTransactionEntity } from '../../db/entities/LoyaltyTransactionEntity';
import { writeAudit } from '../../lib/audit';
import { verifyAdminRole, verifyFirebaseUser, verifyStoreAccess } from '../../lib/auth';
import { mapError, notFound } from '../../lib/errors';
import { uuidSchema, validatePayload } from '../../lib/validators';

const ensureAdmin = async (uid: string, storeId: string) => {
  await verifyAdminRole(uid, ['SUPER_ADMIN', 'STORE_ADMIN']);
  await verifyStoreAccess(uid, storeId);
};

export const adminLoyaltyGetSettings = onCall(async (request) => {
  try {
    const payload = validatePayload(Joi.object({ storeId: uuidSchema.required() }), request.data);
    const uid = verifyFirebaseUser(request);
    await ensureAdmin(uid, payload.storeId);
    const repo = (await getDataSource()).getRepository(LoyaltySettingEntity);
    let row = await repo.findOne({ where: { storeId: payload.storeId } });
    if (!row) row = await repo.save(repo.create({ storeId: payload.storeId, pointsPerCurrency: '1.0000', expiryDays: 365, redemptionEnabled: true, currencyPerPoint: '1.0000' }));
    return { settings: row };
  } catch (error) { mapError(error); }
});

export const adminLoyaltyUpdateSettings = onCall(async (request) => {
  try {
    const payload = validatePayload(Joi.object({ storeId: uuidSchema.required(), pointsPerCurrency: Joi.number().positive().required(), expiryDays: Joi.number().integer().min(1).required(), redemptionEnabled: Joi.boolean().required(), currencyPerPoint: Joi.number().positive().required() }), request.data);
    const uid = verifyFirebaseUser(request);
    await ensureAdmin(uid, payload.storeId);

    const repo = (await getDataSource()).getRepository(LoyaltySettingEntity);
    let row = await repo.findOne({ where: { storeId: payload.storeId } });
    if (!row) row = repo.create({ storeId: payload.storeId });
    row.pointsPerCurrency = payload.pointsPerCurrency.toFixed(4);
    row.expiryDays = payload.expiryDays;
    row.redemptionEnabled = payload.redemptionEnabled;
    row.currencyPerPoint = payload.currencyPerPoint.toFixed(4);
    row = await repo.save(row);

    await writeAudit({ actorType: 'admin', actorUid: uid, action: 'admin.loyalty.update_settings', targetType: 'loyalty_settings', targetId: row.storeId, storeId: row.storeId });
    return { settings: row };
  } catch (error) { mapError(error); }
});

const tierSchema = Joi.object({ name: Joi.string().min(1).max(100).required(), thresholdPoints: Joi.number().integer().min(0).required(), multiplier: Joi.number().positive().required(), isActive: Joi.boolean().default(true), sortOrder: Joi.number().integer().min(0).default(0) });

export const adminLoyaltyTiersList = onCall(async (request) => {
  try {
    const payload = validatePayload(Joi.object({ storeId: uuidSchema.required() }), request.data);
    const uid = verifyFirebaseUser(request);
    await ensureAdmin(uid, payload.storeId);
    const items = await (await getDataSource()).getRepository(LoyaltyTierEntity).find({ where: { storeId: payload.storeId }, order: { sortOrder: 'ASC' } });
    return { items };
  } catch (error) { mapError(error); }
});

export const adminLoyaltyTiersCreate = onCall(async (request) => {
  try {
    const payload = validatePayload(Joi.object({ storeId: uuidSchema.required(), payload: tierSchema.required() }), request.data);
    const uid = verifyFirebaseUser(request);
    await ensureAdmin(uid, payload.storeId);
    const repo = (await getDataSource()).getRepository(LoyaltyTierEntity);
    const row = await repo.save(repo.create({ ...payload.payload, storeId: payload.storeId, multiplier: payload.payload.multiplier.toFixed(2) }));
    await writeAudit({ actorType: 'admin', actorUid: uid, action: 'admin.loyalty.tier.create', targetType: 'loyalty_tier', targetId: row.id, storeId: row.storeId });
    return { tier: row };
  } catch (error) { mapError(error); }
});

export const adminLoyaltyTiersUpdate = onCall(async (request) => {
  try {
    const payload = validatePayload(Joi.object({ storeId: uuidSchema.required(), tierId: uuidSchema.required(), payload: tierSchema.fork(['name','thresholdPoints','multiplier'], (s)=>s.optional()).min(1).required() }), request.data);
    const uid = verifyFirebaseUser(request);
    await ensureAdmin(uid, payload.storeId);
    const repo = (await getDataSource()).getRepository(LoyaltyTierEntity);
    const row = await repo.findOne({ where: { id: payload.tierId, storeId: payload.storeId } });
    if (!row) notFound('Tier not found.');
    Object.assign(row, payload.payload);
    if (payload.payload.multiplier !== undefined) row.multiplier = payload.payload.multiplier.toFixed(2);
    const saved = await repo.save(row);
    await writeAudit({ actorType: 'admin', actorUid: uid, action: 'admin.loyalty.tier.update', targetType: 'loyalty_tier', targetId: saved.id, storeId: saved.storeId });
    return { tier: saved };
  } catch (error) { mapError(error); }
});

export const adminLoyaltyTiersDelete = onCall(async (request) => {
  try {
    const payload = validatePayload(Joi.object({ storeId: uuidSchema.required(), tierId: uuidSchema.required() }), request.data);
    const uid = verifyFirebaseUser(request);
    await ensureAdmin(uid, payload.storeId);
    await (await getDataSource()).getRepository(LoyaltyTierEntity).delete({ id: payload.tierId, storeId: payload.storeId });
    await writeAudit({ actorType: 'admin', actorUid: uid, action: 'admin.loyalty.tier.delete', targetType: 'loyalty_tier', targetId: payload.tierId, storeId: payload.storeId });
    return { success: true };
  } catch (error) { mapError(error); }
});

export const adminLoyaltyAdjustUserPoints = onCall(async (request) => {
  try {
    const payload = validatePayload(Joi.object({ storeId: uuidSchema.required(), uid: Joi.string().required(), points: Joi.number().integer().required(), reason: Joi.string().min(1).max(191).required() }), request.data);
    const adminUid = verifyFirebaseUser(request);
    await ensureAdmin(adminUid, payload.storeId);

    const ds = await getDataSource();
    const qr = ds.createQueryRunner();
    await qr.connect();
    await qr.startTransaction();
    try {
      const accountRepo = qr.manager.getRepository(LoyaltyAccountEntity);
      const txnRepo = qr.manager.getRepository(LoyaltyTransactionEntity);
      let account = await accountRepo.findOne({ where: { storeId: payload.storeId, uid: payload.uid } });
      if (!account) account = await accountRepo.save(accountRepo.create({ storeId: payload.storeId, uid: payload.uid, balance: 0 }));
      account.balance += payload.points;
      await accountRepo.save(account);
      await txnRepo.save(txnRepo.create({ storeId: payload.storeId, uid: payload.uid, type: 'adjust', points: payload.points, reason: payload.reason, refType: 'admin', refId: adminUid }));
      await writeAudit({ actorType: 'admin', actorUid: adminUid, action: 'admin.loyalty.adjust_points', targetType: 'loyalty_account', targetId: account.id, storeId: payload.storeId, metadata: { points: payload.points, reason: payload.reason, targetUid: payload.uid } }, qr.manager);
      await qr.commitTransaction();
      return { balance: account.balance };
    } catch (e) { await qr.rollbackTransaction(); throw e; } finally { await qr.release(); }
  } catch (error) { mapError(error); }
});
