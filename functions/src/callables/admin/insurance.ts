import Joi from 'joi';
import { EntityManager } from 'typeorm';
import { onCall } from 'firebase-functions/v2/https';
import { getDataSource } from '../../db/data-source';
import { InsuranceOrderEntity } from '../../db/entities/InsuranceOrderEntity';
import { InsuranceOrderItemEntity } from '../../db/entities/InsuranceOrderItemEntity';
import { InsuranceQuoteEventEntity } from '../../db/entities/InsuranceQuoteEventEntity';
import { ShipmentEntity } from '../../db/entities/ShipmentEntity';
import { writeAudit } from '../../lib/audit';
import { verifyAdminRole, verifyFirebaseUser, verifyStoreAccess } from '../../lib/auth';
import { mapError, notFound, failedPrecondition } from '../../lib/errors';
import { pushAndPersistNotifications } from '../../lib/notify';
import { uuidSchema, validatePayload } from '../../lib/validators';

const ensureAdmin = async (uid: string, storeId: string): Promise<void> => {
  await verifyAdminRole(uid, ['SUPER_ADMIN', 'STORE_ADMIN', 'SUPPORT']);
  await verifyStoreAccess(uid, storeId);
};

const recalcTotals = async (manager: EntityManager, order: InsuranceOrderEntity): Promise<InsuranceOrderEntity> => {
  const rows = await manager.getRepository(InsuranceOrderItemEntity).find({ where: { insuranceOrderId: order.id } });
  const subtotal = rows.reduce((sum, row) => sum + Number(row.lineTotal), 0);
  order.subtotal = subtotal.toFixed(2);
  order.total = (subtotal + Number(order.deliveryFee)).toFixed(2);
  return manager.getRepository(InsuranceOrderEntity).save(order);
};

export const adminInsuranceList = onCall(async (request) => {
  try {
    const payload = validatePayload(
      Joi.object({
        storeId: uuidSchema.required(),
        status: Joi.string()
          .valid(
            'insurance_submitted',
            'insurance_under_review',
            'insurance_quote_ready',
            'insurance_customer_approved',
            'insurance_customer_rejected',
            'processing',
            'shipped',
            'delivered',
            'cancelled',
          )
          .optional(),
        page: Joi.number().integer().min(1).default(1),
        pageSize: Joi.number().integer().min(1).max(100).default(20),
      }),
      request.data,
    );
    const uid = verifyFirebaseUser(request);
    await ensureAdmin(uid, payload.storeId);

    const where = payload.status ? { storeId: payload.storeId, status: payload.status } : { storeId: payload.storeId };
    const [items, total] = await (await getDataSource()).getRepository(InsuranceOrderEntity).findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: (payload.page - 1) * payload.pageSize,
      take: payload.pageSize,
    });
    return { items, total };
  } catch (error) {
    mapError(error);
  }
});

export const adminInsuranceGet = onCall(async (request) => {
  try {
    const payload = validatePayload(Joi.object({ storeId: uuidSchema.required(), insuranceOrderId: uuidSchema.required() }), request.data);
    const uid = verifyFirebaseUser(request);
    await ensureAdmin(uid, payload.storeId);

    const ds = await getDataSource();
    const order = await ds.getRepository(InsuranceOrderEntity).findOne({ where: { id: payload.insuranceOrderId, storeId: payload.storeId } });
    if (!order) notFound('Insurance order not found.');
    const items = await ds.getRepository(InsuranceOrderItemEntity).find({ where: { insuranceOrderId: order.id } });
    return { order, items };
  } catch (error) {
    mapError(error);
  }
});

export const adminInsuranceAddItem = onCall(async (request) => {
  try {
    const payload = validatePayload(
      Joi.object({
        storeId: uuidSchema.required(),
        insuranceOrderId: uuidSchema.required(),
        productId: uuidSchema.required(),
        nameSnapshot: Joi.string().required(),
        qty: Joi.number().integer().min(1).required(),
        unitPriceCustomer: Joi.number().positive().required(),
      }),
      request.data,
    );
    const uid = verifyFirebaseUser(request);
    await ensureAdmin(uid, payload.storeId);

    const ds = await getDataSource();
    const qr = ds.createQueryRunner();
    await qr.connect();
    await qr.startTransaction();
    try {
      const orderRepo = qr.manager.getRepository(InsuranceOrderEntity);
      const itemRepo = qr.manager.getRepository(InsuranceOrderItemEntity);
      const eventRepo = qr.manager.getRepository(InsuranceQuoteEventEntity);
      const order = await orderRepo.findOne({ where: { id: payload.insuranceOrderId, storeId: payload.storeId } });
      if (!order) notFound('Insurance order not found.');
      if (order.quoteLocked) failedPrecondition('Quote is locked.');

      const item = await itemRepo.save(
        itemRepo.create({
          insuranceOrderId: order.id,
          storeId: payload.storeId,
          productId: payload.productId,
          nameSnapshot: payload.nameSnapshot,
          qty: payload.qty,
          unitPriceCustomer: payload.unitPriceCustomer.toFixed(2),
          lineTotal: (payload.qty * payload.unitPriceCustomer).toFixed(2),
        }),
      );
      await recalcTotals(qr.manager, order);

      await eventRepo.save(
        eventRepo.create({
          insuranceOrderId: order.id,
          actorType: 'admin',
          actorUid: uid,
          action: 'admin_insurance.add_item',
          payload: { itemId: item.id },
        }),
      );
      await writeAudit({ actorType: 'admin', actorUid: uid, action: 'admin_insurance.add_item', targetType: 'insurance_order', targetId: order.id, storeId: payload.storeId }, qr.manager);

      await qr.commitTransaction();
      return { item };
    } catch (error) {
      await qr.rollbackTransaction();
      throw error;
    } finally {
      await qr.release();
    }
  } catch (error) {
    mapError(error);
  }
});

export const adminInsuranceUpdateItem = onCall(async (request) => {
  try {
    const payload = validatePayload(
      Joi.object({
        storeId: uuidSchema.required(),
        insuranceOrderId: uuidSchema.required(),
        itemId: uuidSchema.required(),
        qty: Joi.number().integer().min(1).optional(),
        unitPriceCustomer: Joi.number().positive().optional(),
      })
        .or('qty', 'unitPriceCustomer')
        .required(),
      request.data,
    );
    const uid = verifyFirebaseUser(request);
    await ensureAdmin(uid, payload.storeId);

    const ds = await getDataSource();
    const qr = ds.createQueryRunner();
    await qr.connect();
    await qr.startTransaction();
    try {
      const order = await qr.manager.getRepository(InsuranceOrderEntity).findOne({ where: { id: payload.insuranceOrderId, storeId: payload.storeId } });
      if (!order) notFound('Insurance order not found.');
      if (order.quoteLocked) failedPrecondition('Quote is locked.');

      const repo = qr.manager.getRepository(InsuranceOrderItemEntity);
      const item = await repo.findOne({ where: { id: payload.itemId, insuranceOrderId: payload.insuranceOrderId } });
      if (!item) notFound('Insurance item not found.');

      if (payload.qty !== undefined) item.qty = payload.qty;
      if (payload.unitPriceCustomer !== undefined) item.unitPriceCustomer = payload.unitPriceCustomer.toFixed(2);
      item.lineTotal = (item.qty * Number(item.unitPriceCustomer)).toFixed(2);
      const saved = await repo.save(item);
      await recalcTotals(qr.manager, order);
      await qr.manager.getRepository(InsuranceQuoteEventEntity).save(
        qr.manager.getRepository(InsuranceQuoteEventEntity).create({
          insuranceOrderId: order.id,
          actorType: 'admin',
          actorUid: uid,
          action: 'admin_insurance.update_item',
          payload: { itemId: item.id },
        }),
      );
      await writeAudit({ actorType: 'admin', actorUid: uid, action: 'admin_insurance.update_item', targetType: 'insurance_order', targetId: order.id, storeId: payload.storeId }, qr.manager);
      await qr.commitTransaction();
      return { item: saved };
    } catch (error) {
      await qr.rollbackTransaction();
      throw error;
    } finally {
      await qr.release();
    }
  } catch (error) {
    mapError(error);
  }
});

export const adminInsuranceRemoveItem = onCall(async (request) => {
  try {
    const payload = validatePayload(Joi.object({ storeId: uuidSchema.required(), insuranceOrderId: uuidSchema.required(), itemId: uuidSchema.required() }), request.data);
    const uid = verifyFirebaseUser(request);
    await ensureAdmin(uid, payload.storeId);

    const ds = await getDataSource();
    const qr = ds.createQueryRunner();
    await qr.connect();
    await qr.startTransaction();
    try {
      const order = await qr.manager.getRepository(InsuranceOrderEntity).findOne({ where: { id: payload.insuranceOrderId, storeId: payload.storeId } });
      if (!order) notFound('Insurance order not found.');
      if (order.quoteLocked) failedPrecondition('Quote is locked.');

      await qr.manager.getRepository(InsuranceOrderItemEntity).delete({ id: payload.itemId, insuranceOrderId: payload.insuranceOrderId });
      await recalcTotals(qr.manager, order);
      await qr.manager.getRepository(InsuranceQuoteEventEntity).save(
        qr.manager.getRepository(InsuranceQuoteEventEntity).create({
          insuranceOrderId: order.id,
          actorType: 'admin',
          actorUid: uid,
          action: 'admin_insurance.remove_item',
          payload: { itemId: payload.itemId },
        }),
      );
      await writeAudit({ actorType: 'admin', actorUid: uid, action: 'admin_insurance.remove_item', targetType: 'insurance_order', targetId: order.id, storeId: payload.storeId }, qr.manager);

      await qr.commitTransaction();
      return { success: true };
    } catch (error) {
      await qr.rollbackTransaction();
      throw error;
    } finally {
      await qr.release();
    }
  } catch (error) {
    mapError(error);
  }
});

export const adminInsuranceLockQuote = onCall(async (request) => {
  try {
    const payload = validatePayload(Joi.object({ storeId: uuidSchema.required(), insuranceOrderId: uuidSchema.required() }), request.data);
    const uid = verifyFirebaseUser(request);
    await ensureAdmin(uid, payload.storeId);

    const ds = await getDataSource();
    const repo = ds.getRepository(InsuranceOrderEntity);
    const row = await repo.findOne({ where: { id: payload.insuranceOrderId, storeId: payload.storeId } });
    if (!row) notFound('Insurance order not found.');
    row.quoteLocked = true;
    row.status = 'insurance_quote_ready';
    await repo.save(row);

    await ds.getRepository(InsuranceQuoteEventEntity).save(
      ds.getRepository(InsuranceQuoteEventEntity).create({
        insuranceOrderId: row.id,
        actorType: 'admin',
        actorUid: uid,
        action: 'admin_insurance.lock_quote',
        payload: null,
      }),
    );
    await writeAudit({ actorType: 'admin', actorUid: uid, action: 'admin_insurance.lock_quote', targetType: 'insurance_order', targetId: row.id, storeId: payload.storeId });
    return { success: true, status: row.status };
  } catch (error) {
    mapError(error);
  }
});

export const adminInsuranceSendQuote = onCall(async (request) => {
  try {
    const payload = validatePayload(Joi.object({ storeId: uuidSchema.required(), insuranceOrderId: uuidSchema.required() }), request.data);
    const uid = verifyFirebaseUser(request);
    await ensureAdmin(uid, payload.storeId);

    const ds = await getDataSource();
    const row = await ds.getRepository(InsuranceOrderEntity).findOne({ where: { id: payload.insuranceOrderId, storeId: payload.storeId } });
    if (!row) notFound('Insurance order not found.');

    await pushAndPersistNotifications({
      storeId: payload.storeId,
      uids: [row.uid],
      type: 'offer',
      title: 'Insurance quote ready',
      body: `Your insurance quote for request ${row.id} is ready.`,
      deepLinkType: 'insurance',
      deepLinkValue: `/insurance/${row.id}`,
    });
    await writeAudit({ actorType: 'admin', actorUid: uid, action: 'admin_insurance.send_quote', targetType: 'insurance_order', targetId: row.id, storeId: payload.storeId });
    return { success: true };
  } catch (error) {
    mapError(error);
  }
});

export const adminInsuranceSetShipmentTracking = onCall(async (request) => {
  try {
    const payload = validatePayload(
      Joi.object({
        storeId: uuidSchema.required(),
        insuranceOrderId: uuidSchema.required(),
        orderId: uuidSchema.allow(null),
        carrier: Joi.string().allow('', null),
        trackingNumber: Joi.string().allow('', null),
        trackingUrl: Joi.string().uri().allow('', null),
        estimatedDelivery: Joi.date().allow(null),
      }),
      request.data,
    );
    const uid = verifyFirebaseUser(request);
    await ensureAdmin(uid, payload.storeId);

    const ds = await getDataSource();
    const row = await ds.getRepository(InsuranceOrderEntity).findOne({ where: { id: payload.insuranceOrderId, storeId: payload.storeId } });
    if (!row) notFound('Insurance order not found.');

    let shipment: ShipmentEntity | null = null;
    if (payload.orderId) {
      const repo = ds.getRepository(ShipmentEntity);
      shipment = await repo.findOne({ where: { orderId: payload.orderId, storeId: payload.storeId } });
      if (!shipment) shipment = repo.create({ orderId: payload.orderId, storeId: payload.storeId });
      shipment.carrier = payload.carrier || null;
      shipment.trackingNumber = payload.trackingNumber || null;
      shipment.trackingUrl = payload.trackingUrl || null;
      shipment.estimatedDelivery = payload.estimatedDelivery ? new Date(payload.estimatedDelivery) : null;
      shipment = await repo.save(shipment);
    }

    await ds.getRepository(InsuranceQuoteEventEntity).save(
      ds.getRepository(InsuranceQuoteEventEntity).create({
        insuranceOrderId: row.id,
        actorType: 'admin',
        actorUid: uid,
        action: 'admin_insurance.set_shipment_tracking',
        payload: {
          orderId: payload.orderId ?? null,
          carrier: payload.carrier || null,
          trackingNumber: payload.trackingNumber || null,
          trackingUrl: payload.trackingUrl || null,
          estimatedDelivery: payload.estimatedDelivery ?? null,
        },
      }),
    );

    await writeAudit({ actorType: 'admin', actorUid: uid, action: 'admin_insurance.set_shipment_tracking', targetType: 'insurance_order', targetId: row.id, storeId: payload.storeId });
    return { shipment, recordedOnInsurance: true };
  } catch (error) {
    mapError(error);
  }
});
