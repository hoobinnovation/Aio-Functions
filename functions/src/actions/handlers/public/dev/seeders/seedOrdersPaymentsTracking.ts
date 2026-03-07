import { Order } from '../../../../../entities/Order';
import { OrderItem } from '../../../../../entities/OrderItem';
import { OrderStatusEvent } from '../../../../../entities/OrderStatusEvent';
import { Shipment } from '../../../../../entities/Shipment';
import { TrackingEvent } from '../../../../../entities/TrackingEvent';
import { PaymentSession } from '../../../../../entities/PaymentSession';
import { Return } from '../../../../../entities/Return';
import { ReturnItem } from '../../../../../entities/ReturnItem';
import { Refund } from '../../../../../entities/Refund';
import { deterministicId, strNum, upsertById } from '../seederUtils';
import { SeedContext, SeedSummary } from '../types';

export async function seedOrdersPaymentsTracking(ctx: SeedContext, summary: SeedSummary) {
  const { manager, storeId, demoUids, sizes } = ctx;
  const orders = Math.max(1, sizes.orders);
  for (let i = 0; i < orders; i += 1) {
    const orderId = deterministicId('order', i + 1);
    await upsertById(manager, Order, 'Order', {
      id: orderId,
      storeId,
      uid: demoUids.clientUid,
      channel: 'app',
      status: 'placed',
      subtotalCents: strNum(1200),
      discountCents: strNum(0),
      shippingCents: strNum(500),
      taxCents: strNum(100),
      totalCents: strNum(1800),
      paymentStatus: 'paid',
      riskStatus: 'clear',
    }, summary);

    const orderItemId = deterministicId('orderitem', i + 1);
    await upsertById(manager, OrderItem, 'OrderItem', {
      id: orderItemId,
      orderId,
      productId: deterministicId('product', 1),
      variantId: deterministicId('variant1', 1),
      nameSnapshot: 'Demo Product 1',
      priceCents: strNum(1200),
      qty: 1,
    }, summary);

    await upsertById(manager, OrderStatusEvent, 'OrderStatusEvent', {
      id: deterministicId('orderev', i + 1),
      orderId,
      status: 'placed',
      note: 'Seeded order',
      createdByUid: demoUids.adminOwnerUid,
    }, summary);

    await upsertById(manager, Shipment, 'Shipment', {
      id: deterministicId('shipment', i + 1),
      orderId,
      carrier: 'Demo Carrier',
      trackingNumber: `TRK-${i + 1}`,
      status: 'in_transit',
    }, summary);

    await upsertById(manager, TrackingEvent, 'TrackingEvent', {
      id: deterministicId('trackev', i + 1),
      shipmentId: deterministicId('shipment', i + 1),
      message: 'Package picked up',
      location: 'Warehouse',
    }, summary);

    await upsertById(manager, PaymentSession, 'PaymentSession', {
      id: deterministicId('pay', i + 1),
      orderId,
      provider: 'demo-pay',
      providerSessionId: `sess_${i + 1}`,
      status: 'confirmed',
    }, summary);

    await upsertById(manager, Return, 'Return', {
      id: deterministicId('return', i + 1),
      storeId,
      orderId,
      uid: demoUids.clientUid,
      status: 'approved',
      approvedAt: new Date(),
      rejectedAt: null,
    }, summary);

    await upsertById(manager, ReturnItem, 'ReturnItem', {
      id: deterministicId('retitem', i + 1),
      returnId: deterministicId('return', i + 1),
      orderItemId,
      qty: 1,
    }, summary);

    await upsertById(manager, Refund, 'Refund', {
      id: deterministicId('refund', i + 1),
      returnId: deterministicId('return', i + 1),
      amountCents: strNum(1200),
      method: 'wallet',
      status: 'completed',
    }, summary);
  }
}
