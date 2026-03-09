import * as httpsV2 from 'firebase-functions/v2/https';
import { buildCloudContext } from '../context/cloudContext';
import { AppError } from '../core/errors';
import { Order } from '../entities/Order';
import { OrderStatusEvent } from '../entities/OrderStatusEvent';
import { PaymentSession } from '../entities/PaymentSession';
import { StorePaymentSetting } from '../entities/StorePaymentSetting';
import { assertFawaterkWebhookSignature, parseFawaterkWebhookPayload } from '../utils/fawaterk';
import { v4 as uuidv4 } from 'uuid';

function mapWebhookStatusToOrderStatus(paymentStatus: string): string {
  if (paymentStatus === 'paid') return 'placed';
  if (paymentStatus === 'failed' || paymentStatus === 'cancelled' || paymentStatus === 'expired') return 'payment_failed';
  return 'pending_payment';
}

export const webhookGateway = (httpsV2 as any).onRequest(async (req: any, res: any) => {
  const ctx = await buildCloudContext('webhook', { auth: undefined, rawRequest: req }, undefined, undefined);

  try {
    const path = req.path.replace(/^\/+/, '');
    if (path !== 'fawaterk/activate' && path !== 'fawaterk/redirect') {
      throw new AppError('NOT_FOUND', 'Webhook route not found');
    }

    const payload = req.body ?? {};
    const parsed = parseFawaterkWebhookPayload(payload);

    const paymentSession = await ctx.db.getRepository(PaymentSession).findOneBy({ invoiceKey: parsed.invoiceKey });
    if (!paymentSession) {
      throw new AppError('PAYMENT_TRANSACTION_NOT_FOUND', 'Payment session not found for invoice key');
    }

    const order = await ctx.db.getRepository(Order).findOneBy({ id: paymentSession.orderId });
    if (!order) {
      throw new AppError('PAYMENT_ORDER_LINK_INVALID', 'Payment session is not linked to a valid order');
    }

    const paymentSetting = await ctx.db.getRepository(StorePaymentSetting).findOneBy({ storeId: order.storeId });
    if (!paymentSetting || paymentSetting.provider !== 'fawaterk') {
      throw new AppError('PAYMENT_WEBHOOK_INVALID', 'Store is not configured for Fawaterk webhook');
    }

    const rawBody = typeof req.rawBody === 'string' ? req.rawBody : req.rawBody?.toString('utf8') ?? JSON.stringify(payload);
    const signature = req.get('x-fawaterk-signature') ?? req.get('x-signature') ?? undefined;
    assertFawaterkWebhookSignature(rawBody, signature, paymentSetting.config?.webhookSecret);

    await ctx.db.transaction(async (tx) => {
      if (paymentSession.status === 'paid' && parsed.status === 'paid') {
        return;
      }

      await tx.getRepository(PaymentSession).update(
        { id: paymentSession.id },
        {
          status: parsed.status,
          externalReference: parsed.externalReference,
          rawProviderPayload: parsed.raw,
        }
      );

      await tx.getRepository(Order).update(
        { id: order.id },
        {
          paymentStatus: parsed.status === 'paid' ? 'paid' : parsed.status,
          status: mapWebhookStatusToOrderStatus(parsed.status),
        }
      );

      await tx.getRepository(OrderStatusEvent).save(
        tx.getRepository(OrderStatusEvent).create({
          id: uuidv4(),
          orderId: order.id,
          status: mapWebhookStatusToOrderStatus(parsed.status),
          note: `webhook:${path}:${parsed.status}`,
          createdByUid: 'webhook:fawaterk',
        })
      );
    });

    if (path === 'fawaterk/redirect') {
      res.status(200).send('OK');
      return;
    }

    res.status(200).json({ ok: true });
  } catch (err) {
    const code = err instanceof AppError ? err.code : 'PAYMENT_WEBHOOK_INVALID';
    const message = err instanceof AppError ? err.message : 'Webhook processing failed';
    ctx.logger.error('webhookGateway error', { code, message });
    res.status(code === 'NOT_FOUND' ? 404 : 400).json({ ok: false, error: { code, message } });
  }
});
