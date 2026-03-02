import Joi from 'joi';
import { onCall } from 'firebase-functions/v2/https';
import { getDataSource } from '../db/data-source';
import { NotificationEntity } from '../db/entities/NotificationEntity';
import { NotificationTokenEntity } from '../db/entities/NotificationTokenEntity';
import { verifyFirebaseUser } from '../lib/auth';
import { mapError, notFound } from '../lib/errors';
import { uuidSchema, validatePayload } from '../lib/validators';

export const notificationsRegisterToken = onCall(async (request) => {
  try {
    const uid = verifyFirebaseUser(request);
    const payload = validatePayload(
      Joi.object({
        storeId: uuidSchema.required(),
        token: Joi.string().min(20).max(255).required(),
        platform: Joi.string().max(30).required(),
        deviceInfo: Joi.object().unknown(true).allow(null),
      }),
      request.data,
    );

    const ds = await getDataSource();
    const repo = ds.getRepository(NotificationTokenEntity);
    let row = await repo.findOne({ where: { token: payload.token } });
    if (!row) row = repo.create({ token: payload.token });
    row.uid = uid;
    row.storeId = payload.storeId;
    row.platform = payload.platform;
    row.deviceInfo = payload.deviceInfo ?? null;
    row.lastSeenAt = new Date();
    await repo.save(row);

    return { ok: true };
  } catch (error) {
    mapError(error);
  }
});

export const notificationsList = onCall(async (request) => {
  try {
    const uid = verifyFirebaseUser(request);
    const payload = validatePayload(
      Joi.object({
        storeId: uuidSchema.required(),
        filterType: Joi.string().valid('order', 'payment', 'shipping', 'offer', 'system').optional(),
        page: Joi.number().integer().min(1).default(1),
        pageSize: Joi.number().integer().min(1).max(100).default(20),
      }),
      request.data,
    );

    const repo = (await getDataSource()).getRepository(NotificationEntity);
    const where = payload.filterType ? { storeId: payload.storeId, uid, type: payload.filterType } : { storeId: payload.storeId, uid };

    const [items, total] = await repo.findAndCount({ where, order: { createdAt: 'DESC' }, skip: (payload.page - 1) * payload.pageSize, take: payload.pageSize });
    const unreadCount = await repo.count({ where: { storeId: payload.storeId, uid, isRead: false } });
    return { items, total, unreadCount };
  } catch (error) {
    mapError(error);
  }
});

export const notificationsMarkRead = onCall(async (request) => {
  try {
    const uid = verifyFirebaseUser(request);
    const payload = validatePayload(Joi.object({ storeId: uuidSchema.required(), id: uuidSchema.required() }), request.data);
    const repo = (await getDataSource()).getRepository(NotificationEntity);
    const row = await repo.findOne({ where: { id: payload.id, storeId: payload.storeId, uid } });
    if (!row) notFound('Notification not found.');
    row.isRead = true;
    await repo.save(row);
    return { success: true };
  } catch (error) {
    mapError(error);
  }
});

export const notificationsMarkAllRead = onCall(async (request) => {
  try {
    const uid = verifyFirebaseUser(request);
    const payload = validatePayload(Joi.object({ storeId: uuidSchema.required() }), request.data);
    await (await getDataSource())
      .getRepository(NotificationEntity)
      .createQueryBuilder()
      .update(NotificationEntity)
      .set({ isRead: true })
      .where('storeId = :storeId', { storeId: payload.storeId })
      .andWhere('uid = :uid', { uid })
      .execute();
    return { success: true };
  } catch (error) {
    mapError(error);
  }
});

export const notificationsDelete = onCall(async (request) => {
  try {
    const uid = verifyFirebaseUser(request);
    const payload = validatePayload(Joi.object({ storeId: uuidSchema.required(), id: uuidSchema.required() }), request.data);
    await (await getDataSource()).getRepository(NotificationEntity).delete({ id: payload.id, storeId: payload.storeId, uid });
    return { success: true };
  } catch (error) {
    mapError(error);
  }
});
