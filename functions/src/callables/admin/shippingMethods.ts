import Joi from 'joi';
import { onCall } from 'firebase-functions/v2/https';
import { getDataSource } from '../../db/data-source';
import { ShippingMethodEntity } from '../../db/entities/ShippingMethodEntity';
import { writeAudit } from '../../lib/audit';
import { verifyAdminRole, verifyFirebaseUser, verifyStoreAccess } from '../../lib/auth';
import { mapError, notFound } from '../../lib/errors';
import { uuidSchema, validatePayload } from '../../lib/validators';

const payloadSchema = Joi.object({
  name: Joi.string().min(2).max(120).required(),
  type: Joi.string().valid('flat', 'by_area', 'pickup').required(),
  cost: Joi.number().min(0).default(0),
  rules: Joi.object().unknown(true).allow(null),
  estimatedDays: Joi.number().integer().min(0).allow(null),
  isActive: Joi.boolean().default(true),
});

const verifyAccess = async (uid: string, storeId: string) => {
  await verifyAdminRole(uid, ['SUPER_ADMIN', 'STORE_ADMIN']);
  await verifyStoreAccess(uid, storeId);
};

export const adminShippingMethodsList = onCall(async (request) => {
  try {
    const payload = validatePayload(Joi.object({ storeId: uuidSchema.required() }), request.data);
    const uid = verifyFirebaseUser(request);
    await verifyAccess(uid, payload.storeId);
    const items = await (await getDataSource()).getRepository(ShippingMethodEntity).find({ where: { storeId: payload.storeId }, order: { createdAt: 'ASC' } });
    return { items };
  } catch (error) { mapError(error); }
});

export const adminShippingMethodsCreate = onCall(async (request) => {
  try {
    const payload = validatePayload(Joi.object({ storeId: uuidSchema.required(), payload: payloadSchema.required() }), request.data);
    const uid = verifyFirebaseUser(request);
    await verifyAccess(uid, payload.storeId);

    const repo = (await getDataSource()).getRepository(ShippingMethodEntity);
    const row = await repo.save(repo.create({ ...payload.payload, storeId: payload.storeId, cost: Number(payload.payload.cost).toFixed(2) }));
    await writeAudit({ actorType: 'admin', actorUid: uid, action: 'admin.shipping_method.create', targetType: 'shipping_method', targetId: row.id, storeId: row.storeId });
    return { method: row };
  } catch (error) { mapError(error); }
});

export const adminShippingMethodsUpdate = onCall(async (request) => {
  try {
    const payload = validatePayload(Joi.object({ storeId: uuidSchema.required(), shippingMethodId: uuidSchema.required(), payload: payloadSchema.fork(['name','type'], (s)=>s.optional()).min(1).required() }), request.data);
    const uid = verifyFirebaseUser(request);
    await verifyAccess(uid, payload.storeId);

    const repo = (await getDataSource()).getRepository(ShippingMethodEntity);
    const row = await repo.findOne({ where: { id: payload.shippingMethodId, storeId: payload.storeId } });
    if (!row) notFound('Shipping method not found.');
    Object.assign(row, payload.payload);
    if (payload.payload.cost !== undefined) row.cost = Number(payload.payload.cost).toFixed(2);
    const saved = await repo.save(row);
    await writeAudit({ actorType: 'admin', actorUid: uid, action: 'admin.shipping_method.update', targetType: 'shipping_method', targetId: saved.id, storeId: saved.storeId });
    return { method: saved };
  } catch (error) { mapError(error); }
});

export const adminShippingMethodsDisable = onCall(async (request) => {
  try {
    const payload = validatePayload(Joi.object({ storeId: uuidSchema.required(), shippingMethodId: uuidSchema.required() }), request.data);
    const uid = verifyFirebaseUser(request);
    await verifyAccess(uid, payload.storeId);

    const repo = (await getDataSource()).getRepository(ShippingMethodEntity);
    const row = await repo.findOne({ where: { id: payload.shippingMethodId, storeId: payload.storeId } });
    if (!row) notFound('Shipping method not found.');
    row.isActive = false;
    const saved = await repo.save(row);
    await writeAudit({ actorType: 'admin', actorUid: uid, action: 'admin.shipping_method.disable', targetType: 'shipping_method', targetId: saved.id, storeId: saved.storeId });
    return { success: true };
  } catch (error) { mapError(error); }
});
