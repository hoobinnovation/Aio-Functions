import Joi from 'joi';
import { onCall } from 'firebase-functions/v2/https';
import { getDataSource } from '../db/data-source';
import { verifyAdminRole, verifyFirebaseUser, verifyStoreAccess } from '../lib/auth';
import { mapError } from '../lib/errors';
import { uuidSchema, validatePayload } from '../lib/validators';

const ensureAdmin = async (uid: string, storeId: string): Promise<void> => {
  await verifyAdminRole(uid, ['SUPER_ADMIN', 'STORE_ADMIN', 'SUPPORT']);
  await verifyStoreAccess(uid, storeId);
};

export const reportsOverview = onCall(async (request) => {
  try {
    const payload = validatePayload(Joi.object({ storeId: uuidSchema.required(), from: Joi.date().required(), to: Joi.date().required(), granularity: Joi.string().valid('day', 'week').default('day') }), request.data);
    const uid = verifyFirebaseUser(request);
    await ensureAdmin(uid, payload.storeId);

    const ds = await getDataSource();
    const groupExpr = payload.granularity === 'week' ? 'YEARWEEK(o.createdAt, 1)' : 'DATE(o.createdAt)';

    const timeseries = await ds.getRepository('orders').createQueryBuilder('o')
      .select(`${groupExpr}`, 'bucket')
      .addSelect('SUM(o.total)', 'salesTotal')
      .addSelect('COUNT(1)', 'ordersCount')
      .addSelect("SUM(CASE WHEN o.paymentStatus='paid' THEN 1 ELSE 0 END)", 'paidOrdersCount')
      .where('o.storeId = :storeId', { storeId: payload.storeId })
      .andWhere('o.createdAt BETWEEN :from AND :to', { from: payload.from, to: payload.to })
      .groupBy('bucket')
      .orderBy('bucket', 'ASC')
      .getRawMany();

    const kpis = await ds.getRepository('orders').createQueryBuilder('o')
      .select('COALESCE(SUM(o.total),0)', 'salesTotal')
      .addSelect('COUNT(1)', 'ordersCount')
      .addSelect('COALESCE(AVG(o.total),0)', 'aov')
      .addSelect('COUNT(DISTINCT o.uid)', 'newCustomers')
      .where('o.storeId = :storeId', { storeId: payload.storeId })
      .andWhere('o.createdAt BETWEEN :from AND :to', { from: payload.from, to: payload.to })
      .getRawOne();

    const points = await ds.getRepository('loyalty_transactions').createQueryBuilder('lt')
      .select('COALESCE(SUM(CASE WHEN lt.points > 0 THEN lt.points ELSE 0 END),0)', 'pointsIssued')
      .addSelect('COALESCE(ABS(SUM(CASE WHEN lt.points < 0 THEN lt.points ELSE 0 END)),0)', 'pointsRedeemed')
      .where('lt.storeId = :storeId', { storeId: payload.storeId })
      .andWhere('lt.createdAt BETWEEN :from AND :to', { from: payload.from, to: payload.to })
      .getRawOne();

    return { timeseries, kpis: { ...kpis, ...points } };
  } catch (error) { mapError(error); }
});

export const reportsTopProducts = onCall(async (request) => {
  try {
    const payload = validatePayload(Joi.object({ storeId: uuidSchema.required(), from: Joi.date().required(), to: Joi.date().required(), limit: Joi.number().integer().min(1).max(100).default(10) }), request.data);
    const uid = verifyFirebaseUser(request);
    await ensureAdmin(uid, payload.storeId);

    const rows = await (await getDataSource()).getRepository('order_items').createQueryBuilder('oi')
      .select('oi.productId', 'productId')
      .addSelect('MAX(oi.nameSnapshot)', 'name')
      .addSelect('SUM(oi.qty)', 'qty')
      .addSelect('SUM(oi.lineTotal)', 'sales')
      .where('oi.storeId = :storeId', { storeId: payload.storeId })
      .andWhere('oi.createdAt BETWEEN :from AND :to', { from: payload.from, to: payload.to })
      .groupBy('oi.productId')
      .orderBy('sales', 'DESC')
      .limit(payload.limit)
      .getRawMany();

    return { items: rows };
  } catch (error) { mapError(error); }
});

export const reportsOrdersByStatus = onCall(async (request) => {
  try {
    const payload = validatePayload(Joi.object({ storeId: uuidSchema.required(), from: Joi.date().required(), to: Joi.date().required() }), request.data);
    const uid = verifyFirebaseUser(request);
    await ensureAdmin(uid, payload.storeId);

    const rows = await (await getDataSource()).getRepository('orders').createQueryBuilder('o')
      .select('o.status', 'status')
      .addSelect('COUNT(1)', 'count')
      .where('o.storeId = :storeId', { storeId: payload.storeId })
      .andWhere('o.createdAt BETWEEN :from AND :to', { from: payload.from, to: payload.to })
      .groupBy('o.status')
      .getRawMany();

    return { items: rows };
  } catch (error) { mapError(error); }
});
