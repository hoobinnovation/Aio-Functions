import Joi from 'joi';
import { onCall } from 'firebase-functions/v2/https';
import { getDataSource } from '../../db/data-source';
import { verifyAdminRole, verifyFirebaseUser, verifyStoreAccess } from '../../lib/auth';
import { mapError } from '../../lib/errors';
import { uuidSchema, validatePayload } from '../../lib/validators';

const ensureAdmin = async (uid: string, storeId: string): Promise<void> => {
  await verifyAdminRole(uid, ['SUPER_ADMIN', 'STORE_ADMIN', 'MARKETING', 'SUPPORT']);
  await verifyStoreAccess(uid, storeId);
};

export const adminReportsAttributionOverview = onCall(async (request) => {
  try {
    const payload = validatePayload(
      Joi.object({
        storeId: uuidSchema.required(),
        from: Joi.date().required(),
        to: Joi.date().required(),
        groupBy: Joi.string().valid('source', 'campaign').required(),
      }),
      request.data,
    );
    const uid = verifyFirebaseUser(request);
    await ensureAdmin(uid, payload.storeId);

    const field = payload.groupBy === 'campaign' ? "JSON_UNQUOTE(JSON_EXTRACT(oa.lastTouchJson, '$.utm_campaign'))" : "JSON_UNQUOTE(JSON_EXTRACT(oa.lastTouchJson, '$.utm_source'))";

    const items = await (await getDataSource())
      .getRepository('order_attribution')
      .createQueryBuilder('oa')
      .innerJoin('orders', 'o', 'o.id = oa.orderId')
      .select(`${field}`, 'bucket')
      .addSelect('COUNT(1)', 'ordersCount')
      .addSelect('COALESCE(SUM(o.total),0)', 'salesTotal')
      .where('oa.storeId = :storeId', { storeId: payload.storeId })
      .andWhere('o.createdAt BETWEEN :from AND :to', { from: payload.from, to: payload.to })
      .groupBy('bucket')
      .orderBy('salesTotal', 'DESC')
      .getRawMany();

    return { items };
  } catch (error) {
    mapError(error);
  }
});

export const adminReportsTopCampaigns = onCall(async (request) => {
  try {
    const payload = validatePayload(
      Joi.object({
        storeId: uuidSchema.required(),
        from: Joi.date().required(),
        to: Joi.date().required(),
        limit: Joi.number().integer().min(1).max(100).default(10),
      }),
      request.data,
    );
    const uid = verifyFirebaseUser(request);
    await ensureAdmin(uid, payload.storeId);

    const items = await (await getDataSource())
      .getRepository('order_attribution')
      .createQueryBuilder('oa')
      .innerJoin('orders', 'o', 'o.id = oa.orderId')
      .select("JSON_UNQUOTE(JSON_EXTRACT(oa.lastTouchJson, '$.utm_campaign'))", 'campaign')
      .addSelect('COUNT(1)', 'ordersCount')
      .addSelect('COALESCE(SUM(o.total),0)', 'salesTotal')
      .where('oa.storeId = :storeId', { storeId: payload.storeId })
      .andWhere('o.createdAt BETWEEN :from AND :to', { from: payload.from, to: payload.to })
      .groupBy('campaign')
      .orderBy('salesTotal', 'DESC')
      .limit(payload.limit)
      .getRawMany();

    return { items };
  } catch (error) {
    mapError(error);
  }
});
