import Joi from 'joi';
import { onCall } from 'firebase-functions/v2/https';
import { getDataSource } from '../../db/data-source';
import { OrderEntity } from '../../db/entities/OrderEntity';
import { OrderStatusHistoryEntity } from '../../db/entities/OrderStatusHistoryEntity';
import { ShipmentEntity } from '../../db/entities/ShipmentEntity';
import { OrderTrackingEventEntity } from '../../db/entities/OrderTrackingEventEntity';
import { writeAudit } from '../../lib/audit';
import { pushAndPersistNotifications } from '../../lib/notify';
import { verifyAdminRole, verifyFirebaseUser, verifyStoreAccess } from '../../lib/auth';
import { mapError, notFound } from '../../lib/errors';
import { uuidSchema, validatePayload } from '../../lib/validators';

const assertAdminStore = async (uid: string, storeId: string): Promise<void> => {
  await verifyAdminRole(uid, ['SUPER_ADMIN', 'STORE_ADMIN', 'SUPPORT']);
  await verifyStoreAccess(uid, storeId);
};

export const adminOrdersList = onCall(async (request) => {
  try {
    const payload = validatePayload(Joi.object({ storeId: uuidSchema.required(), status: Joi.string().optional(), page: Joi.number().integer().min(1).default(1), pageSize: Joi.number().integer().min(1).max(100).default(20) }), request.data);
    const uid = verifyFirebaseUser(request);
    await assertAdminStore(uid, payload.storeId);

    const repo = (await getDataSource()).getRepository(OrderEntity);
    const where = payload.status ? { storeId: payload.storeId, status: payload.status } : { storeId: payload.storeId };
    const [items, total] = await repo.findAndCount({ where, order: { createdAt: 'DESC' }, skip: (payload.page - 1) * payload.pageSize, take: payload.pageSize });
    return { items, total };
  } catch (error) { mapError(error); }
});

export const adminOrdersGet = onCall(async (request) => {
  try {
    const payload = validatePayload(Joi.object({ storeId: uuidSchema.required(), orderId: uuidSchema.required() }), request.data);
    const uid = verifyFirebaseUser(request);
    await assertAdminStore(uid, payload.storeId);
    const ds = await getDataSource();
    const order = await ds.getRepository(OrderEntity).findOne({ where: { id: payload.orderId, storeId: payload.storeId } });
    if (!order) notFound('Order not found.');
    const history = await ds.getRepository(OrderStatusHistoryEntity).find({ where: { orderId: order.id }, order: { createdAt: 'ASC' } });
    const shipment = await ds.getRepository(ShipmentEntity).findOne({ where: { orderId: order.id } });
    return { order, history, shipment };
  } catch (error) { mapError(error); }
});

export const adminOrdersUpdateStatus = onCall(async (request) => {
  try {
    const payload = validatePayload(Joi.object({ storeId: uuidSchema.required(), orderId: uuidSchema.required(), status: Joi.string().valid('pending','processing','shipped','delivered','cancelled').required(), note: Joi.string().allow('', null) }), request.data);
    const uid = verifyFirebaseUser(request);
    await assertAdminStore(uid, payload.storeId);
    const ds = await getDataSource();
    const orderRepo = ds.getRepository(OrderEntity);
    const historyRepo = ds.getRepository(OrderStatusHistoryEntity);
    const order = await orderRepo.findOne({ where: { id: payload.orderId, storeId: payload.storeId } });
    if (!order) notFound('Order not found.');

    const prev = order.status;
    order.status = payload.status;
    await orderRepo.save(order);
    await historyRepo.save(historyRepo.create({ orderId: order.id, fromStatus: prev, toStatus: order.status, note: payload.note || null, actorType: 'admin', actorUid: uid }));
    await ds.getRepository(OrderTrackingEventEntity).save({ storeId: payload.storeId, orderId: order.id, type: 'status', status: order.status, message: `Order status changed to ${order.status}` });
    await pushAndPersistNotifications({ storeId: payload.storeId, uids: [order.uid], type: 'shipping', title: 'Order update', body: `Order ${order.orderNumber} status is now ${order.status}`, deepLinkType: 'order', deepLinkValue: order.id });
    await writeAudit({ actorType: 'admin', actorUid: uid, action: 'admin.order.update_status', targetType: 'order', targetId: order.id, storeId: order.storeId, metadata: { from: prev, to: order.status } });
    return { order };
  } catch (error) { mapError(error); }
});

export const adminOrdersSetTracking = onCall(async (request) => {
  try {
    const payload = validatePayload(Joi.object({ storeId: uuidSchema.required(), orderId: uuidSchema.required(), carrier: Joi.string().allow('', null), trackingNumber: Joi.string().allow('', null), status: Joi.string().valid('created','in_transit','delivered').allow(null) }), request.data);
    const uid = verifyFirebaseUser(request);
    await assertAdminStore(uid, payload.storeId);
    const ds = await getDataSource();
    const order = await ds.getRepository(OrderEntity).findOne({ where: { id: payload.orderId, storeId: payload.storeId } });
    if (!order) notFound('Order not found.');

    const repo = ds.getRepository(ShipmentEntity);
    let shipment = await repo.findOne({ where: { orderId: order.id } });
    if (!shipment) shipment = repo.create({ orderId: order.id, storeId: payload.storeId });
    shipment.carrier = payload.carrier || null;
    shipment.trackingNumber = payload.trackingNumber || null;
    shipment.status = payload.status || shipment.status || 'created';
    shipment = await repo.save(shipment);

    await writeAudit({ actorType: 'admin', actorUid: uid, action: 'admin.order.set_tracking', targetType: 'shipment', targetId: shipment.id, storeId: payload.storeId });
    return { shipment };
  } catch (error) { mapError(error); }
});

export const adminOrdersAddInternalNote = onCall(async (request) => {
  try {
    const payload = validatePayload(Joi.object({ storeId: uuidSchema.required(), orderId: uuidSchema.required(), note: Joi.string().min(1).max(255).required() }), request.data);
    const uid = verifyFirebaseUser(request);
    await assertAdminStore(uid, payload.storeId);

    const order = await (await getDataSource()).getRepository(OrderEntity).findOne({ where: { id: payload.orderId, storeId: payload.storeId } });
    if (!order) notFound('Order not found.');
    await (await getDataSource()).getRepository(OrderStatusHistoryEntity).save({ orderId: order.id, fromStatus: order.status, toStatus: order.status, note: payload.note, actorType: 'admin', actorUid: uid });
    await writeAudit({ actorType: 'admin', actorUid: uid, action: 'admin.order.add_note', targetType: 'order', targetId: order.id, storeId: payload.storeId, metadata: { note: payload.note } });
    return { success: true };
  } catch (error) { mapError(error); }
});

export const adminOrdersPrintInvoiceUrl = onCall(async (request) => {
  try {
    const payload = validatePayload(Joi.object({ storeId: uuidSchema.required(), orderId: uuidSchema.required() }), request.data);
    const uid = verifyFirebaseUser(request);
    await assertAdminStore(uid, payload.storeId);
    return { invoiceUrl: `/invoice/${payload.orderId}?storeId=${payload.storeId}` };
  } catch (error) { mapError(error); }
});
