import Joi from 'joi';
import { onCall } from 'firebase-functions/v2/https';
import { getDataSource } from '../../db/data-source';
import { CouponEntity } from '../../db/entities/CouponEntity';
import { writeAudit } from '../../lib/audit';
import { verifyAdminRole, verifyFirebaseUser, verifyStoreAccess } from '../../lib/auth';
import { mapError, notFound } from '../../lib/errors';
import { uuidSchema, validatePayload } from '../../lib/validators';

const schema = Joi.object({
  code: Joi.string().trim().uppercase().max(50).required(),
  discountType: Joi.string().valid('percent', 'fixed').required(),
  discountValue: Joi.number().positive().required(),
  minOrderTotal: Joi.number().min(0).allow(null),
  usageLimit: Joi.number().integer().min(0).default(0),
  isActive: Joi.boolean().default(true),
});

const verifyAccess = async (uid: string, storeId: string): Promise<void> => {
  await verifyAdminRole(uid, ['SUPER_ADMIN', 'STORE_ADMIN']);
  await verifyStoreAccess(uid, storeId);
};

export const adminCouponsList = onCall(async (request) => {
  try {
    const payload = validatePayload(Joi.object({ storeId: uuidSchema.required() }), request.data);
    const uid = verifyFirebaseUser(request);
    await verifyAccess(uid, payload.storeId);
    const items = await (await getDataSource()).getRepository(CouponEntity).find({ where: { storeId: payload.storeId }, order: { createdAt: 'DESC' } });
    return { items };
  } catch (error) { mapError(error); }
});

export const adminCouponsCreate = onCall(async (request) => {
  try {
    const payload = validatePayload(Joi.object({ storeId: uuidSchema.required(), payload: schema.required() }), request.data);
    const uid = verifyFirebaseUser(request);
    await verifyAccess(uid, payload.storeId);

    const repo = (await getDataSource()).getRepository(CouponEntity);
    const row = await repo.save(repo.create({ ...payload.payload, storeId: payload.storeId, discountValue: Number(payload.payload.discountValue).toFixed(2), minOrderTotal: payload.payload.minOrderTotal !== null && payload.payload.minOrderTotal !== undefined ? Number(payload.payload.minOrderTotal).toFixed(2) : null }));
    await writeAudit({ actorType: 'admin', actorUid: uid, action: 'admin.coupon.create', targetType: 'coupon', targetId: row.id, storeId: row.storeId });
    return { coupon: row };
  } catch (error) { mapError(error); }
});

export const adminCouponsUpdate = onCall(async (request) => {
  try {
    const payload = validatePayload(Joi.object({ storeId: uuidSchema.required(), couponId: uuidSchema.required(), payload: schema.fork(['code','discountType','discountValue'], (s)=>s.optional()).min(1).required() }), request.data);
    const uid = verifyFirebaseUser(request);
    await verifyAccess(uid, payload.storeId);

    const repo = (await getDataSource()).getRepository(CouponEntity);
    const row = await repo.findOne({ where: { id: payload.couponId, storeId: payload.storeId } });
    if (!row) notFound('Coupon not found.');
    Object.assign(row, payload.payload);
    if (payload.payload.discountValue !== undefined) row.discountValue = Number(payload.payload.discountValue).toFixed(2);
    if (payload.payload.minOrderTotal !== undefined) row.minOrderTotal = payload.payload.minOrderTotal === null ? null : Number(payload.payload.minOrderTotal).toFixed(2);
    const saved = await repo.save(row);
    await writeAudit({ actorType: 'admin', actorUid: uid, action: 'admin.coupon.update', targetType: 'coupon', targetId: saved.id, storeId: saved.storeId });
    return { coupon: saved };
  } catch (error) { mapError(error); }
});

export const adminCouponsDisable = onCall(async (request) => {
  try {
    const payload = validatePayload(Joi.object({ storeId: uuidSchema.required(), couponId: uuidSchema.required() }), request.data);
    const uid = verifyFirebaseUser(request);
    await verifyAccess(uid, payload.storeId);
    const repo = (await getDataSource()).getRepository(CouponEntity);
    const row = await repo.findOne({ where: { id: payload.couponId, storeId: payload.storeId } });
    if (!row) notFound('Coupon not found.');
    row.isActive = false;
    await repo.save(row);
    await writeAudit({ actorType: 'admin', actorUid: uid, action: 'admin.coupon.disable', targetType: 'coupon', targetId: row.id, storeId: row.storeId });
    return { success: true };
  } catch (error) { mapError(error); }
});
