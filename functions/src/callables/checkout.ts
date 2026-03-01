import Joi from 'joi';
import { onCall } from 'firebase-functions/v2/https';
import { getDataSource } from '../db/data-source';
import { CartEntity } from '../db/entities/CartEntity';
import { CartItemEntity } from '../db/entities/CartItemEntity';
import { OrderEntity } from '../db/entities/OrderEntity';
import { OrderItemEntity } from '../db/entities/OrderItemEntity';
import { OrderStatusHistoryEntity } from '../db/entities/OrderStatusHistoryEntity';
import { PaymentSessionEntity } from '../db/entities/PaymentSessionEntity';
import { ProductVariantEntity } from '../db/entities/ProductVariantEntity';
import { writeAudit } from '../lib/audit';
import { verifyFirebaseUser } from '../lib/auth';
import { resolveCheckoutPreview } from '../lib/checkout';
import { failedPrecondition, mapError } from '../lib/errors';
import { uuidSchema, validatePayload } from '../lib/validators';
import { attachOrderAttribution } from '../lib/marketing';
import { computeCashback } from '../lib/cashback';

const buildOrderNumber = (): string => `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

export const checkoutPreview = onCall(async (request) => {
  try {
    const uid = verifyFirebaseUser(request);
    const payload = validatePayload(
      Joi.object({
        storeId: uuidSchema.required(),
        addressId: uuidSchema.required(),
        shippingMethodId: uuidSchema.required(),
        paymentCode: Joi.string().trim().required(),
        sessionId: Joi.string().trim().max(128).allow('', null),
      }),
      request.data,
    );

    const ds = await getDataSource();
    const preview = await resolveCheckoutPreview(ds, uid, payload.storeId, payload.addressId, payload.shippingMethodId);
    const categoryIds = Array.from(new Set((await ds.getRepository('products').createQueryBuilder('p').select('p.categoryId','categoryId').where('p.id IN (:...ids)', { ids: preview.items.map((i)=>i.productId) }).getRawMany()).map((r:any)=>String(r.categoryId)).filter(Boolean)));
    const cashback = await computeCashback(ds, { storeId: payload.storeId, uid, subtotal: preview.subtotal, productIds: preview.items.map((i)=>i.productId), categoryIds });
    return {
      ...preview,
      paymentCode: payload.paymentCode,
      cashbackPreview: { campaignId: cashback.campaign?.id ?? null, amount: cashback.amount },
    };
  } catch (error) {
    mapError(error);
  }
});

export const checkoutCreatePaymentSession = onCall(async (request) => {
  try {
    const uid = verifyFirebaseUser(request);
    const payload = validatePayload(
      Joi.object({
        storeId: uuidSchema.required(),
        addressId: uuidSchema.required(),
        shippingMethodId: uuidSchema.required(),
        paymentCode: Joi.string().trim().required(),
        sessionId: Joi.string().trim().max(128).allow('', null),
      }),
      request.data,
    );

    const ds = await getDataSource();
    const preview = await resolveCheckoutPreview(ds, uid, payload.storeId, payload.addressId, payload.shippingMethodId);

    const qr = ds.createQueryRunner();
    await qr.connect();
    await qr.startTransaction();

    try {
      const orderRepo = qr.manager.getRepository(OrderEntity);
      const orderItemRepo = qr.manager.getRepository(OrderItemEntity);
      const variantRepo = qr.manager.getRepository(ProductVariantEntity);
      const statusRepo = qr.manager.getRepository(OrderStatusHistoryEntity);
      const paymentSessionRepo = qr.manager.getRepository(PaymentSessionEntity);
      const cartItemRepo = qr.manager.getRepository(CartItemEntity);
      const cartRepo = qr.manager.getRepository(CartEntity);

      for (const item of preview.items) {
        const variant = await variantRepo.findOne({ where: { id: item.variantId, storeId: payload.storeId } });
        if (!variant || variant.stockQty < item.qty) {
          failedPrecondition(`Insufficient stock for ${item.name}`);
        }
        variant.stockQty -= item.qty;
        await variantRepo.save(variant);
      }

      const isCod = payload.paymentCode.toUpperCase() === 'COD';

      const order = await orderRepo.save(
        orderRepo.create({
          storeId: payload.storeId,
          uid,
          orderNumber: buildOrderNumber(),
          status: 'pending',
          paymentStatus: isCod ? 'unpaid' : 'pending',
          subtotal: preview.subtotal.toFixed(2),
          discountTotal: (preview.discountTotal + preview.targetedDiscountTotal).toFixed(2),
          shippingTotal: preview.shippingTotal.toFixed(2),
          taxTotal: preview.taxTotal.toFixed(2),
          total: preview.total.toFixed(2),
          currency: preview.currency,
          addressSnapshot: preview.address,
          shippingSnapshot: {
            id: preview.shippingMethod.id,
            name: preview.shippingMethod.name,
            type: preview.shippingMethod.type,
            cost: preview.shippingTotal,
            estimatedDays: preview.shippingMethod.estimatedDays,
          },
          couponSnapshot: preview.coupon
            ? { id: preview.coupon.id, code: preview.coupon.code, discountType: preview.coupon.discountType, discountValue: preview.coupon.discountValue }
            : null,
          paymentMethodCode: payload.paymentCode,
          paymentProvider: isCod ? null : 'generic',
        }),
      );

      for (const item of preview.items) {
        await orderItemRepo.save(
          orderItemRepo.create({
            orderId: order.id,
            storeId: payload.storeId,
            productId: item.productId,
            variantId: item.variantId,
            nameSnapshot: item.name,
            thumbnailUrlSnapshot: item.thumbnailUrl,
            variantSummarySnapshot: item.variantName,
            unitPrice: item.unitPrice.toFixed(2),
            qty: item.qty,
            lineTotal: item.lineTotal.toFixed(2),
          }),
        );
      }

      await statusRepo.save(
        statusRepo.create({
          orderId: order.id,
          fromStatus: null,
          toStatus: order.status,
          note: 'Order created',
          actorType: 'user',
          actorUid: uid,
        }),
      );

      let paymentSession: PaymentSessionEntity | null = null;
      if (!isCod) {
        const session = paymentSessionRepo.create({
          storeId: payload.storeId,
          uid,
          orderId: order.id,
          provider: 'generic',
          status: 'pending',
          amount: order.total,
          currency: order.currency,
          paymentUrl: `https://payments.example.com/pay?sessionId={{SESSION_ID}}`,
          expiresAt: new Date(Date.now() + 1000 * 60 * 30),
        });
        paymentSession = await paymentSessionRepo.save(session);
        paymentSession.paymentUrl = `https://payments.example.com/pay?sessionId=${paymentSession.id}`;
        paymentSession = await paymentSessionRepo.save(paymentSession);
      }

      await cartItemRepo.delete({ cartId: preview.cartId });
      await cartRepo.update({ id: preview.cartId }, { couponCode: null });

      await attachOrderAttribution({ manager: qr.manager, storeId: payload.storeId, orderId: order.id, sessionId: payload.sessionId || undefined });

      await writeAudit(
        {
          actorType: 'user',
          actorUid: uid,
          action: 'checkout.create_payment_session',
          targetType: 'order',
          targetId: order.id,
          storeId: payload.storeId,
        },
        qr.manager,
      );

      await qr.commitTransaction();
      return {
        orderId: order.id,
        orderNumber: order.orderNumber,
        paymentUrl: paymentSession?.paymentUrl ?? null,
        paymentSessionId: paymentSession?.id ?? null,
      };
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
