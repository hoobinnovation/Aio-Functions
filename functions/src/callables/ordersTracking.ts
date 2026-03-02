import Joi from 'joi';
import { onCall } from 'firebase-functions/v2/https';
import { getDataSource } from '../db/data-source';
import { OrderEntity } from '../db/entities/OrderEntity';
import { OrderTrackingEventEntity } from '../db/entities/OrderTrackingEventEntity';
import { ShipmentEntity } from '../db/entities/ShipmentEntity';
import { verifyFirebaseUser } from '../lib/auth';
import { mapError, notFound } from '../lib/errors';
import { uuidSchema, validatePayload } from '../lib/validators';

export const ordersTracking = onCall(async (request) => {
  try {
    const uid = verifyFirebaseUser(request);
    const payload = validatePayload(Joi.object({ storeId: uuidSchema.required(), orderId: uuidSchema.required() }), request.data);
    const ds = await getDataSource();

    const order = await ds.getRepository(OrderEntity).findOne({ where: { id: payload.orderId, storeId: payload.storeId, uid } });
    if (!order) notFound('Order not found.');

    const events = await ds.getRepository(OrderTrackingEventEntity).find({ where: { orderId: order.id, storeId: payload.storeId, isDeleted: false }, order: { createdAt: 'ASC' } });
    const shipment = await ds.getRepository(ShipmentEntity).findOne({ where: { orderId: order.id, storeId: payload.storeId } });
    return { events, shipment };
  } catch (error) { mapError(error); }
});
