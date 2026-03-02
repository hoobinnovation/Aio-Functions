import Joi from 'joi';
import { onCall } from 'firebase-functions/v2/https';
import { getDataSource } from '../db/data-source';
import { CartEntity } from '../db/entities/CartEntity';
import { CartItemEntity } from '../db/entities/CartItemEntity';
import { OrderEntity } from '../db/entities/OrderEntity';
import { OrderItemEntity } from '../db/entities/OrderItemEntity';
import { OrderStatusHistoryEntity } from '../db/entities/OrderStatusHistoryEntity';
import { ProductVariantEntity } from '../db/entities/ProductVariantEntity';
import { ShipmentEntity } from '../db/entities/ShipmentEntity';
import { verifyFirebaseUser } from '../lib/auth';
import { failedPrecondition, mapError, notFound } from '../lib/errors';
import { uuidSchema, validatePayload } from '../lib/validators';

const ensureCart = async (uid: string, storeId: string): Promise<CartEntity> => {
  const repo = (await getDataSource()).getRepository(CartEntity);
  let cart = await repo.findOne({ where: { uid, storeId, isActive: true } });
  if (!cart) cart = await repo.save(repo.create({ uid, storeId, isActive: true }));
  return cart;
};

export const ordersList = onCall(async (request) => {
  try {
    const uid = verifyFirebaseUser(request);
    const payload = validatePayload(
      Joi.object({
        storeId: uuidSchema.required(),
        status: Joi.string().valid('pending', 'processing', 'shipped', 'delivered', 'cancelled').optional(),
        page: Joi.number().integer().min(1).default(1),
        pageSize: Joi.number().integer().min(1).max(100).default(20),
      }),
      request.data,
    );

    const repo = (await getDataSource()).getRepository(OrderEntity);
    const where = payload.status ? { storeId: payload.storeId, uid, status: payload.status } : { storeId: payload.storeId, uid };
    const [rows, total] = await repo.findAndCount({ where, order: { createdAt: 'DESC' }, skip: (payload.page - 1) * payload.pageSize, take: payload.pageSize });

    return {
      items: rows.map((r) => ({ orderId: r.id, orderNumber: r.orderNumber, status: r.status, paymentStatus: r.paymentStatus, total: r.total, createdAt: r.createdAt })),
      total,
    };
  } catch (error) {
    mapError(error);
  }
});

export const ordersGet = onCall(async (request) => {
  try {
    const uid = verifyFirebaseUser(request);
    const payload = validatePayload(Joi.object({ storeId: uuidSchema.required(), orderId: uuidSchema.required() }), request.data);
    const ds = await getDataSource();

    const order = await ds.getRepository(OrderEntity).findOne({ where: { id: payload.orderId, storeId: payload.storeId, uid } });
    if (!order) notFound('Order not found.');
    const items = await ds.getRepository(OrderItemEntity).find({ where: { orderId: order.id } });
    const shipment = await ds.getRepository(ShipmentEntity).findOne({ where: { orderId: order.id } });
    const history = await ds.getRepository(OrderStatusHistoryEntity).find({ where: { orderId: order.id }, order: { createdAt: 'ASC' } });

    return { order, items, shipment, statusHistory: history, invoiceUrl: `/invoice/${order.id}?storeId=${order.storeId}` };
  } catch (error) {
    mapError(error);
  }
});

export const ordersInvoiceUrl = onCall(async (request) => {
  try {
    const uid = verifyFirebaseUser(request);
    const payload = validatePayload(Joi.object({ storeId: uuidSchema.required(), orderId: uuidSchema.required() }), request.data);
    const order = await (await getDataSource()).getRepository(OrderEntity).findOne({ where: { id: payload.orderId, storeId: payload.storeId, uid } });
    if (!order) notFound('Order not found.');
    return { invoiceUrl: `/invoice/${order.id}?storeId=${order.storeId}` };
  } catch (error) {
    mapError(error);
  }
});

export const ordersReorder = onCall(async (request) => {
  try {
    const uid = verifyFirebaseUser(request);
    const payload = validatePayload(Joi.object({ storeId: uuidSchema.required(), orderId: uuidSchema.required() }), request.data);

    const ds = await getDataSource();
    const order = await ds.getRepository(OrderEntity).findOne({ where: { id: payload.orderId, storeId: payload.storeId, uid } });
    if (!order) notFound('Order not found.');

    const items = await ds.getRepository(OrderItemEntity).find({ where: { orderId: order.id, storeId: payload.storeId } });
    const cart = await ensureCart(uid, payload.storeId);
    const cartItemRepo = ds.getRepository(CartItemEntity);
    const variantRepo = ds.getRepository(ProductVariantEntity);

    for (const item of items) {
      const variant = await variantRepo.findOne({ where: { id: item.variantId, storeId: payload.storeId, isActive: true } });
      if (!variant || variant.stockQty < item.qty) {
        failedPrecondition(`Variant ${item.variantSummarySnapshot} is out of stock now.`);
      }

      const existing = await cartItemRepo.findOne({ where: { cartId: cart.id, variantId: item.variantId } });
      if (existing) {
        existing.qty = Math.min(variant.stockQty, existing.qty + item.qty);
        await cartItemRepo.save(existing);
      } else {
        await cartItemRepo.save(cartItemRepo.create({ cartId: cart.id, storeId: payload.storeId, productId: item.productId, variantId: item.variantId, qty: item.qty }));
      }
    }

    const cartItems = await cartItemRepo.find({ where: { cartId: cart.id } });
    return { cart, items: cartItems };
  } catch (error) {
    mapError(error);
  }
});
