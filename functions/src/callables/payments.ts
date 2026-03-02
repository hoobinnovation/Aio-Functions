import Joi from 'joi';
import { onCall } from 'firebase-functions/v2/https';
import { getDataSource } from '../db/data-source';
import { CouponEntity } from '../db/entities/CouponEntity';
import { CouponRedemptionEntity } from '../db/entities/CouponRedemptionEntity';
import { OrderEntity } from '../db/entities/OrderEntity';
import { OrderStatusHistoryEntity } from '../db/entities/OrderStatusHistoryEntity';
import { PaymentEventEntity } from '../db/entities/PaymentEventEntity';
import { PaymentSessionEntity } from '../db/entities/PaymentSessionEntity';
import { ProductVariantEntity } from '../db/entities/ProductVariantEntity';
import { OrderItemEntity } from '../db/entities/OrderItemEntity';
import { AccountingEntryEntity } from '../db/entities/AccountingEntryEntity';
import { verifyFirebaseUser } from '../lib/auth';
import { issueLoyaltyPointsForPaidOrder } from '../lib/loyalty-hooks';
import { pushAndPersistNotifications } from '../lib/notify';
import { applyCashbackEarn, computeCashback } from '../lib/cashback';
import { mapError, notFound } from '../lib/errors';
import { uuidSchema, validatePayload } from '../lib/validators';

export const paymentsStatus = onCall(async (request) => {
  try {
    const uid = verifyFirebaseUser(request);
    const payload = validatePayload(Joi.object({ storeId: uuidSchema.required(), paymentSessionId: uuidSchema.required() }), request.data);

    const session = await (await getDataSource()).getRepository(PaymentSessionEntity).findOne({
      where: { id: payload.paymentSessionId, storeId: payload.storeId, uid },
    });
    if (!session) notFound('Payment session not found.');

    return { status: session.status, session };
  } catch (error) {
    mapError(error);
  }
});

export const paymentsConfirm = onCall(async (request) => {
  try {
    const uid = verifyFirebaseUser(request);
    const payload = validatePayload(
      Joi.object({
        storeId: uuidSchema.required(),
        paymentSessionId: uuidSchema.required(),
        status: Joi.string().valid('success', 'failed', 'cancelled').required(),
        providerPayload: Joi.object().unknown(true).default({}),
      }),
      request.data,
    );

    const ds = await getDataSource();
    const qr = ds.createQueryRunner();
    await qr.connect();
    await qr.startTransaction();

    try {
      const sessionRepo = qr.manager.getRepository(PaymentSessionEntity);
      const orderRepo = qr.manager.getRepository(OrderEntity);
      const eventRepo = qr.manager.getRepository(PaymentEventEntity);
      const historyRepo = qr.manager.getRepository(OrderStatusHistoryEntity);

      const session = await sessionRepo.findOne({ where: { id: payload.paymentSessionId, storeId: payload.storeId, uid } });
      if (!session) notFound('Payment session not found.');
      if (!session.orderId) notFound('Session has no order attached.');

      const order = await orderRepo.findOne({ where: { id: session.orderId, storeId: payload.storeId, uid } });
      if (!order) notFound('Order not found.');

      session.status = payload.status;
      session.providerPayload = payload.providerPayload;
      await sessionRepo.save(session);

      await eventRepo.save(
        eventRepo.create({ sessionId: session.id, type: `payment.${payload.status}`, payload: payload.providerPayload }),
      );

      if (payload.status === 'success') {
        order.paymentStatus = 'paid';
        const prev = order.status;
        order.status = 'processing';
        await orderRepo.save(order);
        await historyRepo.save(
          historyRepo.create({
            orderId: order.id,
            fromStatus: prev,
            toStatus: order.status,
            note: 'Payment confirmed',
            actorType: 'user',
            actorUid: uid,
          }),
        );


        await issueLoyaltyPointsForPaidOrder({
          manager: qr.manager,
          storeId: payload.storeId,
          uid,
          orderId: order.id,
          amount: Number(order.total),
        });

        await pushAndPersistNotifications({
          storeId: payload.storeId,
          uids: [uid],
          type: 'payment',
          title: 'Payment success',
          body: `Your payment for order ${order.orderNumber} was successful.`,
          deepLinkType: 'order',
          deepLinkValue: order.id,
        });


        await qr.manager.getRepository(AccountingEntryEntity).save(
          qr.manager.getRepository(AccountingEntryEntity).create({
            storeId: payload.storeId,
            type: 'revenue',
            amount: order.total,
            currency: order.currency,
            sourceChannel: 'app',
            paymentMethod: order.paymentMethodCode.toUpperCase() === 'COD' ? 'cash' : 'online',
            refType: 'order',
            refId: order.id,
            note: 'App order payment success',
          }),
        );

        await pushAndPersistNotifications({
          storeId: payload.storeId,
          uids: [uid],
          type: 'order',
          title: 'New order created',
          body: `Order ${order.orderNumber} is now processing.`,
          deepLinkType: 'order',
          deepLinkValue: order.id,
        });


        const orderItems = await qr.manager.getRepository(OrderItemEntity).find({ where: { orderId: order.id } });
        const categoryRows = await qr.manager.getRepository('products').createQueryBuilder('p').select('p.categoryId','categoryId').where('p.id IN (:...ids)', { ids: orderItems.map((i) => i.productId) }).getRawMany();
        const categoryIds = Array.from(new Set(categoryRows.map((r: any) => String(r.categoryId)).filter(Boolean)));
        const cashback = await computeCashback(ds, {
          storeId: payload.storeId,
          uid,
          subtotal: Number(order.subtotal),
          productIds: orderItems.map((i) => i.productId),
          categoryIds,
        });
        if (cashback.campaign && cashback.amount > 0) {
          await applyCashbackEarn({ ds, storeId: payload.storeId, uid, orderId: order.id, amount: cashback.amount, campaign: cashback.campaign });
          await pushAndPersistNotifications({
            storeId: payload.storeId,
            uids: [uid],
            type: 'offer',
            title: 'Cashback earned',
            body: `You earned ${cashback.amount.toFixed(2)} cashback from order ${order.orderNumber}.`,
            deepLinkType: 'wallet',
            deepLinkValue: payload.storeId,
          });
        }

        if (order.couponSnapshot?.id) {
          const couponRepo = qr.manager.getRepository(CouponEntity);
          const redRepo = qr.manager.getRepository(CouponRedemptionEntity);
          const coupon = await couponRepo.findOne({ where: { id: String(order.couponSnapshot.id) } });
          if (coupon) {
            coupon.usageCount += 1;
            await couponRepo.save(coupon);
            await redRepo.save(redRepo.create({ couponId: coupon.id, orderId: order.id, uid, storeId: payload.storeId }));
          }
        }
      } else {
        order.paymentStatus = 'failed';
        await orderRepo.save(order);

        const items = await qr.manager.getRepository(OrderItemEntity).find({ where: { orderId: order.id } });
        const variantRepo = qr.manager.getRepository(ProductVariantEntity);
        for (const item of items) {
          const variant = await variantRepo.findOne({ where: { id: item.variantId, storeId: payload.storeId } });
          if (variant) {
            variant.stockQty += item.qty;
            await variantRepo.save(variant);
          }
        }
      }

      await qr.commitTransaction();
      return { orderId: order.id, paymentStatus: order.paymentStatus, orderStatus: order.status };
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
