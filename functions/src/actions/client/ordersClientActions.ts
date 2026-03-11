import { EntityManager } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { ActionContext } from '../../core/protocol';
import { AppError } from '../../core/errors';
import { Cart } from '../../entities/Cart';
import { CartItem } from '../../entities/CartItem';
import { Order } from '../../entities/Order';
import { OrderItem } from '../../entities/OrderItem';
import { OrderStatusEvent } from '../../entities/OrderStatusEvent';
import { ProductVariant } from '../../entities/ProductVariant';
import { PaymentSession } from '../../entities/PaymentSession';
import { StorePaymentSetting } from '../../entities/StorePaymentSetting';
import { Shipment } from '../../entities/Shipment';
import { TrackingEvent } from '../../entities/TrackingEvent';
import { InsuranceOrder } from '../../entities/InsuranceOrder';
import { InsuranceFile } from '../../entities/InsuranceFile';
import { InsuranceStatusEvent } from '../../entities/InsuranceStatusEvent';
import { DineInSession } from '../../entities/DineInSession';
import { Branch } from '../../entities/Branch';
import { resolveEffectiveDineInSettings } from './dineInSupport';
import { normalizeListQueryInput } from '../../utils/queryNormalization';
import { ensureUserProfileForUid, requireSessionIdentity } from '../../core/identity';
import { UserAddress } from '../../entities/UserAddress';
import { resolveDeliveryQuote } from '../../utils/deliveryQuote';
import { createFawaterkInvoice } from '../../utils/fawaterk';
import { UserProfile } from '../../entities/UserProfile';
import { StockMovement } from '../../entities/StockMovement';
import { recomputeProductMetrics } from '../productMetrics';
import { tryPostBusinessEvent } from '../../core/accounting/postingIntegration';

async function getCart(ctx: ActionContext) {
  const uid = requireSessionIdentity(ctx);
  let c = await ctx.db.getRepository(Cart).findOneBy({ uid, storeId: ctx.storeId! });
  if (!c) {
    c = ctx.db.getRepository(Cart).create({ id: uuidv4(), uid, storeId: ctx.storeId!, couponCode: null });
    await ctx.db.getRepository(Cart).save(c);
  }
  return c;
}

async function resolveCheckoutAddress(tx: EntityManager, ctx: ActionContext, uid: string, payload: any): Promise<any> {
  if (payload?.addressId) {
    const address = await tx.getRepository(UserAddress).findOneBy({ id: payload.addressId, uid });
    if (!address) {
      throw new AppError('ADDRESS_NOT_FOUND', 'Saved address was not found for current identity');
    }
    if (!address.zoneId) {
      throw new AppError('ADDRESS_ZONE_REQUIRED', 'Saved address requires zone selection before delivery checkout');
    }
    return {
      zoneId: address.zoneId,
      recipientName: address.recipientName,
      phone: address.phone,
      governorate: address.governorate,
      city: address.city,
      area: address.area,
      street: address.street,
      building: address.building,
      floor: address.floor,
      apartment: address.apartment,
      landmark: address.landmark,
      lat: Number(address.lat),
      lng: Number(address.lng),
      notes: address.notes,
      label: address.label,
    };
  }

  if (payload?.shippingAddress && typeof payload.shippingAddress === 'object') {
    return payload.shippingAddress;
  }

  throw new AppError('CHECKOUT_CONTACT_REQUIRED', 'shippingAddress or addressId is required');
}

async function upsertCheckoutProfileAndAddress(tx: EntityManager, uid: string, payload: any, shippingAddress: any): Promise<void> {
  const profile = await ensureUserProfileForUid(tx, uid);
  const displayName = typeof payload?.displayName === 'string' ? payload.displayName.trim() : '';
  const phone = typeof payload?.phone === 'string' ? payload.phone.trim() : '';

  if (!displayName || !phone) {
    throw new AppError('CHECKOUT_CONTACT_REQUIRED', 'displayName and phone are required');
  }

  await tx.getRepository(UserProfile).update(
    { uid },
    {
      displayName,
      phone,
      status: profile.status === 'deleted_pending' ? 'active' : profile.status,
    }
  );

  if ((payload?.serviceType ?? 'standard') !== 'delivery') {
    return;
  }

  const existingDefault = await tx.getRepository(UserAddress).findOneBy({ uid, isDefault: true });
  const nextAddress = {
    uid,
    zoneId: shippingAddress.zoneId,
    label: shippingAddress.label ?? 'Checkout',
    recipientName: displayName,
    phone,
    governorate: shippingAddress.governorate,
    city: shippingAddress.city,
    area: shippingAddress.area ?? null,
    street: shippingAddress.street,
    building: shippingAddress.building ?? null,
    floor: shippingAddress.floor ?? null,
    apartment: shippingAddress.apartment ?? null,
    landmark: shippingAddress.landmark ?? null,
    lat: String(shippingAddress.lat),
    lng: String(shippingAddress.lng),
    notes: shippingAddress.notes ?? null,
    isDefault: true,
  };

  if (existingDefault) {
    await tx.getRepository(UserAddress).update({ id: existingDefault.id, uid }, nextAddress);
  } else {
    await tx.getRepository(UserAddress).insert({ id: uuidv4(), ...nextAddress });
  }
}

function validateDeliveryPayload(payload: any, shippingAddress: any) {
  const serviceType = payload?.serviceType ?? 'standard';
  if (serviceType !== 'delivery') {
    return;
  }

  if (!shippingAddress?.zoneId) {
    throw new AppError('DELIVERY_ZONE_REQUIRED', 'zoneId is required for delivery checkout');
  }

  const requiredAddressFields = ['governorate', 'city', 'street', 'lat', 'lng'];
  for (const field of requiredAddressFields) {
    if (shippingAddress[field] == null || shippingAddress[field] === '') {
      throw new AppError('CHECKOUT_CONTACT_REQUIRED', `shippingAddress.${field} is required for delivery checkout`);
    }
  }
}

export async function checkoutCreatePaymentSession(ctx: ActionContext, payload: any = {}) {
  const uid = requireSessionIdentity(ctx);
  const setting = await ctx.db.getRepository(StorePaymentSetting).findOneBy({ storeId: ctx.storeId! });
  if (!setting) throw new AppError('CONFIG_MISSING', 'Payment provider config missing');

  const cart = await getCart(ctx);
  const items = await ctx.db.getRepository(CartItem).find({ where: { cartId: cart.id } });
  if (!items.length) throw new AppError('VALIDATION_ERROR', 'Cart is empty');

  const subtotal = items.reduce((a: number, i: CartItem) => a + Number(i.unitPriceCents) * i.qty, 0);
  const orderId = uuidv4();

  await ctx.db.transaction(async (tx: EntityManager) => {
    const serviceType = payload.serviceType ?? 'standard';
    const shippingAddress = await resolveCheckoutAddress(tx, ctx, uid, payload);
    validateDeliveryPayload(payload, shippingAddress);

    const quote = await resolveDeliveryQuote(tx, {
      storeId: ctx.storeId!,
      zoneId: shippingAddress?.zoneId,
      shippingMethodId: payload.shippingMethodId,
      serviceType,
    });

    if (payload.deliveryQuote?.deliveryFeeCents != null && Number(payload.deliveryQuote.deliveryFeeCents) !== quote.deliveryFeeCents) {
      throw new AppError('DELIVERY_QUOTE_MISMATCH', 'Delivery quote mismatch, please refresh checkout preview');
    }

    await upsertCheckoutProfileAndAddress(tx, uid, payload, shippingAddress);

    for (const i of items) {
      if (i.variantId) {
        const v = await tx.getRepository(ProductVariant).findOneBy({ id: i.variantId });
        if (!v || v.stockQty < i.qty) throw new AppError('OUT_OF_STOCK', 'Variant stock insufficient');
        const beforeQty = Number(v.stockQty);
        const afterQty = beforeQty - i.qty;
        await tx.getRepository(ProductVariant).update({ id: i.variantId }, { stockQty: Math.round(afterQty) });
        await tx.getRepository(StockMovement).save(tx.getRepository(StockMovement).create({
          id: uuidv4(),
          storeId: ctx.storeId!,
          variantId: i.variantId,
          warehouseId: null,
          warehouseLocationId: null,
          lotId: null,
          movementType: 'sale_issue',
          qtyDelta: (-i.qty).toFixed(3),
          beforeQty: beforeQty.toFixed(3),
          afterQty: afterQty.toFixed(3),
          unitCostCents: null,
          sourceDocumentType: 'order',
          sourceDocumentId: orderId,
          sourceEventType: 'checkout_create_payment_session',
          metadata: { productId: i.productId },
          createdByUid: uid,
        }));
      }
    }

    let branchId: string | null = payload.branchId ?? null;
    let tableId: string | null = null;
    let dineInSessionId: string | null = null;

    if (serviceType === 'dineIn') {
      const token = payload.dineInSessionToken;
      if (!token) throw new AppError('DINE_IN_SESSION_REQUIRED', 'Dine-in session is required');
      const session = await tx.getRepository(DineInSession).findOneBy({ sessionToken: token, storeId: ctx.storeId!, customerUid: uid, status: 'active' });
      if (!session) throw new AppError('DINE_IN_SESSION_NOT_FOUND', 'Dine-in session not found');
      if (new Date(session.expiresAt).getTime() < Date.now()) throw new AppError('DINE_IN_SESSION_EXPIRED', 'Dine-in session expired');
      const branch = await tx.getRepository(Branch).findOneBy({ id: session.branchId, storeId: ctx.storeId! });
      if (!branch) throw new AppError('DINE_IN_BRANCH_NOT_FOUND', 'Dine-in branch not found');
      const settings = await resolveEffectiveDineInSettings(ctx, branch);
      if (settings.requireSessionForOrder && !session) throw new AppError('DINE_IN_SESSION_REQUIRED', 'Dine-in session is required');
      branchId = session.branchId;
      tableId = session.tableId;
      dineInSessionId = session.id;
      await tx.getRepository(DineInSession).update({ id: session.id }, { lastSeenAt: new Date() });
    }

    const discountCents = 0;
    const taxCents = 0;
    const shippingCents = quote.deliveryFeeCents;
    const totalCents = subtotal - discountCents + taxCents + shippingCents;

    await tx.getRepository(Order).save(
      tx.getRepository(Order).create({
        id: orderId,
        storeId: ctx.storeId!,
        uid,
        channel: 'app',
        status: 'pending_payment',
        serviceType,
        branchId,
        tableId,
        dineInSessionId,
        deliveryZoneId: quote.zoneId || null,
        deliveryZoneName: quote.zoneName || null,
        shippingMethodId: quote.shippingMethodId,
        shippingAddressLabel: shippingAddress?.label ?? null,
        shippingAddressLine: serviceType === 'delivery' ? `${shippingAddress.governorate} ${shippingAddress.city} ${shippingAddress.street}` : null,
        shippingRecipientName: payload.displayName ?? null,
        shippingPhone: payload.phone ?? null,
        subtotalCents: String(subtotal),
        discountCents: String(discountCents),
        shippingCents: String(shippingCents),
        taxCents: String(taxCents),
        totalCents: String(totalCents),
        paymentStatus: 'pending',
        riskStatus: 'clear',
      })
    );

    for (const i of items) {
      await tx.getRepository(OrderItem).save(
        tx.getRepository(OrderItem).create({
          id: uuidv4(),
          orderId,
          productId: i.productId,
          variantId: i.variantId,
          nameSnapshot: 'item',
          priceCents: i.unitPriceCents,
          qty: i.qty,
        })
      );
    }

    await tx.getRepository(OrderStatusEvent).save(tx.getRepository(OrderStatusEvent).create({ id: uuidv4(), orderId, status: 'pending_payment', note: null, createdByUid: uid }));
    await tx.getRepository(Shipment).save(tx.getRepository(Shipment).create({ id: uuidv4(), orderId, carrier: null, trackingNumber: null, status: 'pending' }));
    let providerSessionPayload = {
      id: uuidv4(),
      orderId,
      provider: setting.provider,
      providerSessionId: `sess_${orderId}`,
      status: 'initiated',
      paymentUrl: null as string | null,
      invoiceKey: null as string | null,
      externalReference: null as string | null,
      rawProviderPayload: null as any,
    };

    if (setting.provider === 'fawaterk') {
      const createdInvoice = await createFawaterkInvoice({
        apiKey: String(setting.config?.apiKey ?? ''),
        baseUrl: String(setting.config?.baseUrl ?? 'https://staging.fawaterk.com'),
        paymentMethodId: String(setting.config?.paymentMethodId ?? ''),
        currency: String(setting.config?.currency ?? 'EGP'),
        returnUrl: typeof setting.config?.returnUrl === 'string' ? setting.config.returnUrl : undefined,
      }, {
        orderId,
        amountCents: totalCents,
        customerName: String(payload.displayName ?? 'Guest'),
        customerPhone: String(payload.phone ?? ''),
      });

      providerSessionPayload = {
        ...providerSessionPayload,
        providerSessionId: createdInvoice.invoiceKey,
        status: 'processing',
        paymentUrl: createdInvoice.paymentUrl,
        invoiceKey: createdInvoice.invoiceKey,
        externalReference: createdInvoice.externalReference,
        rawProviderPayload: createdInvoice.raw,
      };
    }

    await tx.getRepository(PaymentSession).save(tx.getRepository(PaymentSession).create(providerSessionPayload));
    await tx.getRepository(CartItem).delete({ cartId: cart.id });
  });

  const status = await paymentsStatus(ctx, { orderId });
  const latest = Array.isArray((status as any).sessions) && (status as any).sessions.length ? (status as any).sessions[0] : null;
  return {
    ...(status as any),
    payment: latest ? {
      provider: latest.provider,
      paymentUrl: latest.paymentUrl ?? null,
      invoiceKey: latest.invoiceKey ?? null,
      externalReference: latest.externalReference ?? latest.providerSessionId,
      paymentSessionId: latest.id,
      status: latest.status,
    } : null,
  }; 
}

export async function paymentsStatus(ctx: ActionContext, payload: any) {
  const uid = requireSessionIdentity(ctx);
  const rows = await ctx.db.query('SELECT ps.* FROM payment_sessions ps JOIN orders o ON o.id=ps.orderId WHERE o.uid=? AND ps.orderId=? ORDER BY ps.createdAt DESC', [uid, payload.orderId]);
  const latest = rows[0] ?? null;
  return {
    sessions: rows,
    latest: latest ? {
      provider: latest.provider,
      status: latest.status,
      paymentSessionId: latest.id,
      providerSessionId: latest.providerSessionId,
      invoiceKey: latest.invoiceKey ?? null,
      paymentUrl: latest.paymentUrl ?? null,
      externalReference: latest.externalReference ?? null,
    } : null,
  };
}

export async function paymentsConfirm(ctx: ActionContext, payload: any) {
  const uid = requireSessionIdentity(ctx);
  if (!payload?.providerSessionId && !payload?.invoiceKey) {
    throw new AppError('PAYMENT_TRANSACTION_NOT_FOUND', 'providerSessionId or invoiceKey is required');
  }
  const session = payload.providerSessionId
    ? await ctx.db.getRepository(PaymentSession).findOneBy({ providerSessionId: payload.providerSessionId })
    : payload.invoiceKey
      ? await ctx.db.getRepository(PaymentSession).findOneBy({ invoiceKey: payload.invoiceKey })
      : null;
  if (!session) throw new AppError('PAYMENT_TRANSACTION_NOT_FOUND', 'Payment session not found');
  const order = await ctx.db.getRepository(Order).findOneBy({ id: session.orderId, uid });
  if (!order) throw new AppError('ORDER_ACCESS_FORBIDDEN', 'Order does not belong to current identity');
  if (order.paymentStatus === 'paid') return { order, idempotent: true };

  if (session.status !== 'paid' && session.status !== 'confirmed') {
    throw new AppError('PAYMENT_CONFIRMATION_FAILED', 'Payment session is not paid yet');
  }

  await ctx.db.transaction(async (tx: EntityManager) => {
    await tx.getRepository(PaymentSession).update({ id: session.id }, { status: 'paid' });
    await tx.getRepository(Order).update({ id: order.id }, { paymentStatus: 'paid', status: 'placed' });
    await tx.getRepository(OrderStatusEvent).save(tx.getRepository(OrderStatusEvent).create({ id: uuidv4(), orderId: order.id, status: 'placed', note: 'payment confirmed', createdByUid: uid }));
    const rows = await tx.getRepository(Order).query('SELECT DISTINCT productId FROM order_items WHERE orderId=?', [order.id]);
    for (const row of rows) {
      if (typeof row?.productId === 'string' && row.productId) await recomputeProductMetrics(tx, row.productId, ctx.storeId!);
    }
  });

  await tryPostBusinessEvent(ctx.db, {
    storeId: order.storeId,
    sourceDocumentType: 'order',
    sourceDocumentId: order.id,
    sourceEventType: 'payment_confirmed',
    amountCents: Number(order.totalCents),
    createdByUid: uid,
    metadata: { paymentSessionId: session.id, provider: session.provider ?? null },
  });

  return { order: await ctx.db.getRepository(Order).findOneByOrFail({ id: order.id }), idempotent: false };
}

export async function ordersList(ctx: ActionContext, payload: any = {}) {
  const uid = requireSessionIdentity(ctx);
  const q = normalizeListQueryInput(payload, { defaultPageSize: 20, maxPageSize: 200 });
  return { orders: await ctx.db.getRepository(Order).find({ where: { uid }, order: { createdAt: 'DESC' as any }, take: q.limit, skip: q.offset }) };
}

export async function ordersGet(ctx: ActionContext, p: any) {
  const uid = requireSessionIdentity(ctx);
  const o = await ctx.db.getRepository(Order).findOneBy({ id: p.orderId, uid });
  if (!o) throw new AppError('ORDER_ACCESS_FORBIDDEN', 'Order does not belong to current identity');
  const items = await ctx.db.getRepository(OrderItem).find({ where: { orderId: o.id } });
  return { order: o, items, riskStatus: o.riskStatus };
}

export async function ordersTracking(ctx: ActionContext, p: any) {
  const uid = requireSessionIdentity(ctx);
  const o = await ctx.db.getRepository(Order).findOneBy({ id: p.orderId, uid });
  if (!o) throw new AppError('ORDER_ACCESS_FORBIDDEN', 'Order does not belong to current identity');
  const sh = await ctx.db.getRepository(Shipment).findOneBy({ orderId: o.id });
  if (!sh) return { shipment: null, events: [] };
  const ev = await ctx.db.getRepository(TrackingEvent).find({ where: { shipmentId: sh.id }, order: { createdAt: 'ASC' as any } });
  return { shipment: sh, events: ev };
}

export async function ordersInvoiceUrl(ctx: ActionContext, p: any) {
  const uid = requireSessionIdentity(ctx);
  const o = await ctx.db.getRepository(Order).findOneBy({ id: p.orderId, uid });
  if (!o) throw new AppError('ORDER_ACCESS_FORBIDDEN', 'Order does not belong to current identity');
  return { invoiceUrl: `gs://invoices/${o.storeId}/${o.id}.pdf` };
}

export async function ordersReorder(ctx: ActionContext, p: any) {
  const uid = requireSessionIdentity(ctx);
  const o = await ctx.db.getRepository(Order).findOneBy({ id: p.orderId, uid });
  if (!o) throw new AppError('ORDER_ACCESS_FORBIDDEN', 'Order does not belong to current identity');
  const items = await ctx.db.getRepository(OrderItem).find({ where: { orderId: o.id } });
  const cart = await getCart(ctx);

  await ctx.db.transaction(async (tx: EntityManager) => {
    for (const i of items) {
      await tx.getRepository(CartItem).save(tx.getRepository(CartItem).create({ id: uuidv4(), cartId: cart.id, productId: i.productId, variantId: i.variantId, qty: i.qty, unitPriceCents: i.priceCents }));
    }
  });

  return { reordered: items.length };
}

export async function insuranceCreateDraft(ctx: ActionContext) {
  const uid = requireSessionIdentity(ctx);
  const id = uuidv4();
  await ctx.db.transaction(async (tx: EntityManager) => {
    await tx.getRepository(InsuranceOrder).save(tx.getRepository(InsuranceOrder).create({ id, storeId: ctx.storeId!, uid, status: 'draft', quoteLocked: false, deliveryCentsX2Applied: false }));
  });
  return { insuranceOrder: await ctx.db.getRepository(InsuranceOrder).findOneByOrFail({ id }) };
}

export async function insuranceAttachFiles(ctx: ActionContext, p: any) {
  const uid = requireSessionIdentity(ctx);
  const o = await ctx.db.getRepository(InsuranceOrder).findOneBy({ id: p.insuranceOrderId, uid });
  if (!o) throw new AppError('ORDER_ACCESS_FORBIDDEN', 'Insurance order does not belong to current identity');
  await ctx.db.transaction(async (tx: EntityManager) => {
    for (const f of p.files) {
      await tx.getRepository(InsuranceFile).save(tx.getRepository(InsuranceFile).create({ id: uuidv4(), insuranceOrderId: o.id, type: f.type, mediaAssetId: f.mediaAssetId }));
    }
  });
  return insuranceGet(ctx, { insuranceOrderId: o.id });
}

export async function insuranceSubmit(ctx: ActionContext, p: any) {
  const uid = requireSessionIdentity(ctx);
  const o = await ctx.db.getRepository(InsuranceOrder).findOneBy({ id: p.insuranceOrderId, uid });
  if (!o || o.status !== 'draft') throw new AppError('VALIDATION_ERROR', 'Invalid state');
  await ctx.db.transaction(async (tx: EntityManager) => {
    await tx.getRepository(InsuranceOrder).update({ id: o.id }, { status: 'submitted' });
    await tx.getRepository(InsuranceStatusEvent).save(tx.getRepository(InsuranceStatusEvent).create({ id: uuidv4(), insuranceOrderId: o.id, status: 'submitted', note: null, createdByUid: uid }));
  });
  return insuranceGet(ctx, { insuranceOrderId: o.id });
}

export async function insuranceGet(ctx: ActionContext, p: any) {
  const uid = requireSessionIdentity(ctx);
  const o = await ctx.db.getRepository(InsuranceOrder).findOneBy({ id: p.insuranceOrderId, uid });
  if (!o) throw new AppError('ORDER_ACCESS_FORBIDDEN', 'Insurance order does not belong to current identity');
  const files = await ctx.db.getRepository(InsuranceFile).find({ where: { insuranceOrderId: o.id } });
  return { insuranceOrder: o, files };
}

export async function insuranceApproveQuote(ctx: ActionContext, p: any) {
  const uid = requireSessionIdentity(ctx);
  const o = await ctx.db.getRepository(InsuranceOrder).findOneBy({ id: p.insuranceOrderId, uid });
  if (!o || o.status !== 'quoted') throw new AppError('VALIDATION_ERROR', 'Quote not available');
  await ctx.db.transaction(async (tx: EntityManager) => {
    await tx.getRepository(InsuranceOrder).update({ id: o.id }, { status: 'approved' });
  });
  return insuranceGet(ctx, { insuranceOrderId: o.id });
}

export async function insuranceRejectQuote(ctx: ActionContext, p: any) {
  const uid = requireSessionIdentity(ctx);
  const o = await ctx.db.getRepository(InsuranceOrder).findOneBy({ id: p.insuranceOrderId, uid });
  if (!o || o.status !== 'quoted') throw new AppError('VALIDATION_ERROR', 'Quote not available');
  await ctx.db.transaction(async (tx: EntityManager) => {
    await tx.getRepository(InsuranceOrder).update({ id: o.id }, { status: 'rejected' });
  });
  return insuranceGet(ctx, { insuranceOrderId: o.id });
}

export async function insuranceListMyOrders(ctx: ActionContext, payload: any = {}) {
  const uid = requireSessionIdentity(ctx);
  const q = normalizeListQueryInput(payload, { defaultPageSize: 20, maxPageSize: 200 });
  return { orders: await ctx.db.getRepository(InsuranceOrder).find({ where: { uid }, order: { createdAt: 'DESC' as any }, take: q.limit, skip: q.offset }) };
}
