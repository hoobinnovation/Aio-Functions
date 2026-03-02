import Joi from 'joi';
import { onCall } from 'firebase-functions/v2/https';
import { getDataSource } from '../../db/data-source';
import { OrderEntity } from '../../db/entities/OrderEntity';
import { OrderTrackingEventEntity } from '../../db/entities/OrderTrackingEventEntity';
import { ShipmentEntity } from '../../db/entities/ShipmentEntity';
import { writeAudit } from '../../lib/audit';
import { verifyAdminRole, verifyFirebaseUser, verifyStoreAccess } from '../../lib/auth';
import { mapError, notFound } from '../../lib/errors';
import { uuidSchema, validatePayload } from '../../lib/validators';

const ensureAdmin = async (uid: string, storeId: string) => {
  await verifyAdminRole(uid, ['SUPER_ADMIN', 'STORE_ADMIN', 'SUPPORT']);
  await verifyStoreAccess(uid, storeId);
};

export const adminOrdersTrackingGet = onCall(async (request) => {
  try {
    const payload = validatePayload(Joi.object({ storeId: uuidSchema.required(), orderId: uuidSchema.required() }), request.data);
    const uid = verifyFirebaseUser(request);
    await ensureAdmin(uid, payload.storeId);
    const ds = await getDataSource();
    const events = await ds.getRepository(OrderTrackingEventEntity).find({ where: { storeId: payload.storeId, orderId: payload.orderId, isDeleted: false }, order: { createdAt: 'ASC' } });
    const shipment = await ds.getRepository(ShipmentEntity).findOne({ where: { storeId: payload.storeId, orderId: payload.orderId } });
    return { events, shipment };
  } catch (error) { mapError(error); }
});

export const adminOrdersTrackingAddEvent = onCall(async (request) => {
  try {
    const payload = validatePayload(Joi.object({ storeId: uuidSchema.required(), orderId: uuidSchema.required(), status: Joi.string().allow(null, ''), message: Joi.string().min(1).max(500).required(), timestamp: Joi.date().optional() }), request.data);
    const uid = verifyFirebaseUser(request);
    await ensureAdmin(uid, payload.storeId);
    const ds = await getDataSource();
    const order = await ds.getRepository(OrderEntity).findOne({ where: { id: payload.orderId, storeId: payload.storeId } });
    if (!order) notFound('Order not found.');
    const repo = ds.getRepository(OrderTrackingEventEntity);
    const event = await repo.save(repo.create({ storeId: payload.storeId, orderId: payload.orderId, type: payload.status ? 'status' : 'note', status: payload.status || null, message: payload.message, createdAt: payload.timestamp ?? new Date() }));
    await writeAudit({ actorType: 'admin', actorUid: uid, action: 'admin.order_tracking.add_event', targetType: 'order_tracking_event', targetId: event.id, storeId: payload.storeId });
    return { event };
  } catch (error) { mapError(error); }
});

export const adminOrdersTrackingDeleteEvent = onCall(async (request) => {
  try {
    const payload = validatePayload(Joi.object({ storeId: uuidSchema.required(), eventId: uuidSchema.required() }), request.data);
    const uid = verifyFirebaseUser(request);
    await ensureAdmin(uid, payload.storeId);
    const repo = (await getDataSource()).getRepository(OrderTrackingEventEntity);
    const event = await repo.findOne({ where: { id: payload.eventId, storeId: payload.storeId } });
    if (!event) notFound('Event not found.');
    event.isDeleted = true;
    await repo.save(event);
    await writeAudit({ actorType: 'admin', actorUid: uid, action: 'admin.order_tracking.delete_event', targetType: 'order_tracking_event', targetId: event.id, storeId: payload.storeId });
    return { success: true };
  } catch (error) { mapError(error); }
});

export const adminOrdersTrackingUpdateShipment = onCall(async (request) => {
  try {
    const payload = validatePayload(Joi.object({ storeId: uuidSchema.required(), orderId: uuidSchema.required(), carrier: Joi.string().allow('', null), trackingNumber: Joi.string().allow('', null), trackingUrl: Joi.string().uri().allow('', null), estimatedDelivery: Joi.date().allow(null) }), request.data);
    const uid = verifyFirebaseUser(request);
    await ensureAdmin(uid, payload.storeId);

    const ds = await getDataSource();
    const order = await ds.getRepository(OrderEntity).findOne({ where: { id: payload.orderId, storeId: payload.storeId } });
    if (!order) notFound('Order not found.');
    const repo = ds.getRepository(ShipmentEntity);
    let shipment = await repo.findOne({ where: { orderId: payload.orderId, storeId: payload.storeId } });
    if (!shipment) shipment = repo.create({ orderId: payload.orderId, storeId: payload.storeId });
    shipment.carrier = payload.carrier || null;
    shipment.trackingNumber = payload.trackingNumber || null;
    shipment.trackingUrl = payload.trackingUrl || null;
    shipment.estimatedDelivery = payload.estimatedDelivery ? new Date(payload.estimatedDelivery) : null;
    shipment = await repo.save(shipment);
    await writeAudit({ actorType: 'admin', actorUid: uid, action: 'admin.order_tracking.update_shipment', targetType: 'shipment', targetId: shipment.id, storeId: payload.storeId });
    return { shipment };
  } catch (error) { mapError(error); }
});
