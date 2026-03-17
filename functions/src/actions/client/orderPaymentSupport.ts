import { createHash } from 'crypto';
import { EntityManager } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { AppError } from '../../core/errors';
import { canonicalOrderStatus, canonicalPaymentStatus } from '../../core/orderStatus';
import { Cart } from '../../entities/Cart';
import { CartItem } from '../../entities/CartItem';
import { Order } from '../../entities/Order';
import { OrderItem } from '../../entities/OrderItem';
import { OrderStatusEvent } from '../../entities/OrderStatusEvent';
import { PaymentSession } from '../../entities/PaymentSession';
import { ProductVariant } from '../../entities/ProductVariant';
import { Shipment } from '../../entities/Shipment';
import { StockMovement } from '../../entities/StockMovement';
import { recomputeProductMetrics } from '../productMetrics';

const CHECKOUT_META_KEY = '__checkout';
const FINALIZATION_NAMESPACE = 'c6d4c555-401c-4f61-97ce-86b6f0d9f945';

type RawCheckoutLine = {
  productId?: string | null;
  variantId?: string | null;
  qty?: number | string | null;
  unitPriceCents?: number | string | null;
  priceCents?: number | string | null;
};

export type CheckoutAttemptMeta = {
  version: 2;
  attemptKey: string;
  cartFingerprint: string;
  serviceType: string;
  subtotalCents: number;
  totalCents: number;
};

function normalizeLineItems(lines: RawCheckoutLine[] = []) {
  return lines
    .map((line) => ({
      productId: String(line?.productId || ''),
      variantId: line?.variantId ? String(line.variantId) : null,
      qty: Number(line?.qty || 0),
      unitPriceCents: Number(line?.unitPriceCents ?? line?.priceCents ?? 0),
    }))
    .filter((line) => line.productId && Number.isFinite(line.qty) && line.qty > 0)
    .sort((left, right) => {
      const leftKey = `${left.productId}:${left.variantId || ''}:${left.unitPriceCents}:${left.qty}`;
      const rightKey = `${right.productId}:${right.variantId || ''}:${right.unitPriceCents}:${right.qty}`;
      return leftKey.localeCompare(rightKey);
    });
}

function normalizeAddressValue(value: any): string {
  return String(value ?? '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

function normalizeObject(value: any): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }
  return { ...value };
}

function duplicateInsertError(error: any): boolean {
  const message = String(error?.message ?? '');
  return error?.code === 'ER_DUP_ENTRY' || message.includes('Duplicate entry');
}

function deterministicMarkerId(seed: string): string {
  const hex = createHash('sha1').update(seed).digest('hex').slice(0, 32);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

export function buildCheckoutCartFingerprint(lines: RawCheckoutLine[] = []): string {
  return createHash('sha256')
    .update(JSON.stringify(normalizeLineItems(lines)))
    .digest('hex');
}

export function buildCheckoutAttemptKey(input: {
  storeId: string;
  uid: string;
  serviceType: string;
  shippingMethodId?: string | null;
  zoneId?: string | null;
  branchId?: string | null;
  tableId?: string | null;
  dineInSessionId?: string | null;
  displayName?: string | null;
  phone?: string | null;
  shippingAddress?: Record<string, any> | null;
  subtotalCents: number;
  shippingCents: number;
  taxCents: number;
  discountCents: number;
  totalCents: number;
  items: RawCheckoutLine[];
}): string {
  const normalizedAddress = normalizeObject(input.shippingAddress);
  const snapshot = {
    version: 2,
    storeId: String(input.storeId || ''),
    uid: String(input.uid || ''),
    serviceType: String(input.serviceType || 'standard'),
    shippingMethodId: input.shippingMethodId ? String(input.shippingMethodId) : null,
    zoneId: input.zoneId ? String(input.zoneId) : null,
    branchId: input.branchId ? String(input.branchId) : null,
    tableId: input.tableId ? String(input.tableId) : null,
    dineInSessionId: input.dineInSessionId ? String(input.dineInSessionId) : null,
    displayName: normalizeAddressValue(input.displayName),
    phone: normalizeAddressValue(input.phone),
    shippingAddress: {
      governorate: normalizeAddressValue(normalizedAddress.governorate),
      city: normalizeAddressValue(normalizedAddress.city),
      area: normalizeAddressValue(normalizedAddress.area),
      street: normalizeAddressValue(normalizedAddress.street),
      building: normalizeAddressValue(normalizedAddress.building),
      floor: normalizeAddressValue(normalizedAddress.floor),
      apartment: normalizeAddressValue(normalizedAddress.apartment),
      zoneId: normalizeAddressValue(normalizedAddress.zoneId),
    },
    subtotalCents: Number(input.subtotalCents || 0),
    shippingCents: Number(input.shippingCents || 0),
    taxCents: Number(input.taxCents || 0),
    discountCents: Number(input.discountCents || 0),
    totalCents: Number(input.totalCents || 0),
    items: normalizeLineItems(input.items),
  };

  return createHash('sha256')
    .update(JSON.stringify(snapshot))
    .digest('hex');
}

export function attachCheckoutAttemptMeta(rawProviderPayload: any, meta: CheckoutAttemptMeta): any {
  const payload = normalizeObject(rawProviderPayload);
  return {
    ...payload,
    [CHECKOUT_META_KEY]: meta,
  };
}

export function readCheckoutAttemptMeta(rawProviderPayload: any): CheckoutAttemptMeta | null {
  const payload = normalizeObject(rawProviderPayload);
  const meta = payload[CHECKOUT_META_KEY];
  if (!meta || typeof meta !== 'object' || Array.isArray(meta)) return null;

  const attemptKey = String((meta as any).attemptKey || '').trim();
  const cartFingerprint = String((meta as any).cartFingerprint || '').trim();
  if (!attemptKey || !cartFingerprint) return null;

  return {
    version: 2,
    attemptKey,
    cartFingerprint,
    serviceType: String((meta as any).serviceType || 'standard'),
    subtotalCents: Number((meta as any).subtotalCents || 0),
    totalCents: Number((meta as any).totalCents || 0),
  };
}

export function mergePaymentProviderPayload(existingRawProviderPayload: any, nextProviderPayload: any): any {
  const existing = normalizeObject(existingRawProviderPayload);
  const next = normalizeObject(nextProviderPayload);
  const existingMeta = readCheckoutAttemptMeta(existingRawProviderPayload);

  if (!existingMeta) {
    return { ...existing, ...next };
  }

  return {
    ...existing,
    ...next,
    [CHECKOUT_META_KEY]: existingMeta,
  };
}

export async function finalizePaidOrder(
  tx: EntityManager,
  input: {
    orderId: string;
    paymentSessionId: string;
    actorUid: string;
  }
) {
  const order = await tx.getRepository(Order).findOneBy({ id: input.orderId });
  if (!order) throw new AppError('PAYMENT_ORDER_LINK_INVALID', 'Payment session is not linked to a valid order');

  const paymentSession = await tx.getRepository(PaymentSession).findOneBy({ id: input.paymentSessionId, orderId: order.id });
  if (!paymentSession) throw new AppError('PAYMENT_TRANSACTION_NOT_FOUND', 'Payment session not found');

  const normalizedPaymentStatus = canonicalPaymentStatus(paymentSession.status);
  if (normalizedPaymentStatus !== 'paid') {
    throw new AppError('PAYMENT_CONFIRMATION_FAILED', 'Payment session is not paid yet');
  }

  const normalizedOrderStatus = canonicalOrderStatus(order.status, order.paymentStatus);
  const orderPaymentStatus = canonicalPaymentStatus(order.paymentStatus);
  if (orderPaymentStatus === 'paid' && normalizedOrderStatus !== 'pending_payment') {
    return {
      order,
      finalizedNow: false,
      cartCleared: false,
      paymentSession,
    };
  }

  const markerId = deterministicMarkerId(`${FINALIZATION_NAMESPACE}:${order.id}:payment-finalized`);
  try {
    await tx.getRepository(OrderStatusEvent).insert({
      id: markerId,
      orderId: order.id,
      status: 'confirmed',
      note: 'payment confirmed',
      createdByUid: input.actorUid,
    });
  } catch (error: any) {
    if (!duplicateInsertError(error)) throw error;

    const currentOrder = await tx.getRepository(Order).findOneByOrFail({ id: order.id });
    const currentSession = await tx.getRepository(PaymentSession).findOneByOrFail({ id: paymentSession.id });
    return {
      order: currentOrder,
      finalizedNow: false,
      cartCleared: false,
      paymentSession: currentSession,
    };
  }

  const items = await tx.getRepository(OrderItem).find({ where: { orderId: order.id } });
  for (const item of items) {
    if (!item.variantId) continue;

    const variant = await tx.getRepository(ProductVariant).findOneBy({ id: item.variantId });
    if (!variant || Number(variant.stockQty) < Number(item.qty)) {
      throw new AppError('OUT_OF_STOCK', 'Variant stock insufficient during payment finalization');
    }

    const beforeQty = Number(variant.stockQty);
    const afterQty = beforeQty - Number(item.qty);

    await tx.getRepository(ProductVariant).update({ id: item.variantId }, { stockQty: Math.round(afterQty) });
    await tx.getRepository(StockMovement).save(tx.getRepository(StockMovement).create({
      id: uuidv4(),
      storeId: order.storeId,
      variantId: item.variantId,
      warehouseId: null,
      warehouseLocationId: null,
      lotId: null,
      movementType: 'sale_issue',
      qtyDelta: (-Number(item.qty)).toFixed(3),
      beforeQty: beforeQty.toFixed(3),
      afterQty: afterQty.toFixed(3),
      unitCostCents: null,
      sourceDocumentType: 'order',
      sourceDocumentId: order.id,
      sourceEventType: 'payment_finalize',
      metadata: { productId: item.productId },
      createdByUid: input.actorUid,
    }));
  }

  const shipment = await tx.getRepository(Shipment).findOneBy({ orderId: order.id });
  if (!shipment) {
    await tx.getRepository(Shipment).save(tx.getRepository(Shipment).create({
      id: uuidv4(),
      orderId: order.id,
      carrier: null,
      trackingNumber: null,
      status: 'pending',
    }));
  }

  await tx.getRepository(PaymentSession).update({ id: paymentSession.id }, { status: 'paid' });
  await tx.getRepository(Order).update({ id: order.id }, { paymentStatus: 'paid', status: 'confirmed' });

  const rows = await tx.getRepository(Order).query('SELECT DISTINCT productId FROM order_items WHERE orderId=?', [order.id]);
  for (const row of rows) {
    if (typeof row?.productId === 'string' && row.productId) {
      await recomputeProductMetrics(tx, row.productId, order.storeId);
    }
  }

  let cartCleared = false;
  const attemptMeta = readCheckoutAttemptMeta(paymentSession.rawProviderPayload);
  if (attemptMeta?.cartFingerprint) {
    const cart = await tx.getRepository(Cart).findOneBy({ uid: order.uid, storeId: order.storeId });
    if (cart) {
      const cartItems = await tx.getRepository(CartItem).find({ where: { cartId: cart.id } });
      if (buildCheckoutCartFingerprint(cartItems) === attemptMeta.cartFingerprint) {
        await tx.getRepository(CartItem).delete({ cartId: cart.id });
        cartCleared = true;
      }
    }
  }

  const finalizedOrder = await tx.getRepository(Order).findOneByOrFail({ id: order.id });
  const finalizedSession = await tx.getRepository(PaymentSession).findOneByOrFail({ id: paymentSession.id });

  return {
    order: finalizedOrder,
    finalizedNow: true,
    cartCleared,
    paymentSession: finalizedSession,
  };
}
