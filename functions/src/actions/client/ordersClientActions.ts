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
import { tryPostBusinessEvent } from '../../core/accounting/postingIntegration';
import { buildCanonicalOrderStatusSql, buildOperationalOrderWhereSql, canonicalOrderStatus, toOrderReadModel } from '../../core/orderStatus';
import { syncCustomerOrderTrackingSnapshot } from '../../core/delivery/customerTracking';
import {
  attachCheckoutAttemptMeta,
  buildCheckoutAttemptKey,
  buildCheckoutCartFingerprint,
  finalizePaidOrder,
  readCheckoutAttemptMeta,
} from './orderPaymentSupport';

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
    lat: shippingAddress.lat == null || shippingAddress.lat === '' ? null : String(shippingAddress.lat),
    lng: shippingAddress.lng == null || shippingAddress.lng === '' ? null : String(shippingAddress.lng),
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

  const requiredAddressFields = ['governorate', 'city', 'street'];
  for (const field of requiredAddressFields) {
    if (shippingAddress[field] == null || shippingAddress[field] === '') {
      throw new AppError('CHECKOUT_CONTACT_REQUIRED', `shippingAddress.${field} is required for delivery checkout`);
    }
  }
}

function resolveRequiredStoreId(ctx: ActionContext, payload: any = {}) {
  const storeId = typeof ctx.storeId === 'string' && ctx.storeId.trim()
    ? ctx.storeId.trim()
    : typeof payload?.storeId === 'string' && payload.storeId.trim()
      ? payload.storeId.trim()
      : '';

  if (!storeId) {
    throw new AppError('STORE_CONTEXT_REQUIRED', 'Store context is required for this action');
  }

  return storeId;
}

async function getOwnedOrderByStore(ctx: ActionContext, uid: string, orderId: string, payload: any = {}) {
  const storeId = resolveRequiredStoreId(ctx, payload);
  const order = await ctx.db.getRepository(Order).findOneBy({ id: orderId, uid, storeId });
  if (!order) throw new AppError('ORDER_ACCESS_FORBIDDEN', 'Order does not belong to current identity');
  return order;
}

async function getOperationalOwnedOrderByStore(ctx: ActionContext, uid: string, orderId: string, payload: any = {}) {
  const order = await getOwnedOrderByStore(ctx, uid, orderId, payload);
  if (canonicalOrderStatus(order.status, order.paymentStatus) === 'pending_payment') {
    throw new AppError('ORDER_NOT_READY', 'Order is still waiting for payment confirmation');
  }
  return order;
}

function paymentSessionIsReusable(session: any) {
  const status = String(session?.status || '').toLowerCase();
  return ['initiated', 'processing', 'pending', 'paid', 'confirmed'].includes(status);
}

async function findExistingCheckoutAttempt(tx: EntityManager, storeId: string, uid: string, attemptKey: string) {
  const orders = await tx.getRepository(Order).find({
    where: { storeId, uid, status: 'pending_payment' },
    order: { createdAt: 'DESC' as any },
    take: 10,
  });

  for (const order of orders) {
    const sessions = await tx.getRepository(PaymentSession).find({
      where: { orderId: order.id },
      order: { createdAt: 'DESC' as any },
      take: 5,
    });
    const latest = sessions[0] ?? null;
    if (!latest) continue;

    const meta = readCheckoutAttemptMeta(latest.rawProviderPayload);
    if (meta?.attemptKey !== attemptKey) continue;

    return { order, latestSession: latest };
  }

  return null;
}

export async function checkoutCreatePaymentSession(ctx: ActionContext, payload: any = {}) {
  const uid = requireSessionIdentity(ctx);
  const setting = await ctx.db.getRepository(StorePaymentSetting).findOneBy({ storeId: ctx.storeId! });
  if (!setting) throw new AppError('CONFIG_MISSING', 'Payment provider config missing');

  const cart = await getCart(ctx);
  const items = await ctx.db.getRepository(CartItem).find({ where: { cartId: cart.id } });
  if (!items.length) throw new AppError('VALIDATION_ERROR', 'Cart is empty');

  const subtotal = items.reduce((a: number, i: CartItem) => a + Number(i.unitPriceCents) * i.qty, 0);

  const { orderId } = await ctx.db.transaction(async (tx: EntityManager) => {
    await tx.getRepository(Cart).query('SELECT id FROM carts WHERE id = ? FOR UPDATE', [cart.id]);

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
    const attemptKey = buildCheckoutAttemptKey({
      storeId: ctx.storeId!,
      uid,
      serviceType,
      shippingMethodId: quote.shippingMethodId,
      zoneId: quote.zoneId || shippingAddress?.zoneId || null,
      branchId,
      tableId,
      dineInSessionId,
      displayName: payload.displayName ?? null,
      phone: payload.phone ?? null,
      shippingAddress,
      subtotalCents: subtotal,
      shippingCents,
      taxCents,
      discountCents,
      totalCents,
      items,
    });
    const attemptMeta = {
      version: 2 as const,
      attemptKey,
      cartFingerprint: buildCheckoutCartFingerprint(items),
      serviceType,
      subtotalCents: subtotal,
      totalCents,
    };
    const existingAttempt = await findExistingCheckoutAttempt(tx, ctx.storeId!, uid, attemptKey);

    if (existingAttempt?.latestSession && paymentSessionIsReusable(existingAttempt.latestSession)) {
      return { orderId: existingAttempt.order.id };
    }

    const orderId = existingAttempt?.order?.id || uuidv4();
    if (!existingAttempt?.order) {
      for (const i of items) {
        if (!i.variantId) continue;
        const variant = await tx.getRepository(ProductVariant).findOneBy({ id: i.variantId });
        if (!variant || Number(variant.stockQty) < Number(i.qty)) throw new AppError('OUT_OF_STOCK', 'Variant stock insufficient');
      }

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
          shippingLat: serviceType === 'delivery' && shippingAddress?.lat != null ? String(shippingAddress.lat) : null,
          shippingLng: serviceType === 'delivery' && shippingAddress?.lng != null ? String(shippingAddress.lng) : null,
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

      await tx.getRepository(OrderStatusEvent).save(tx.getRepository(OrderStatusEvent).create({
        id: uuidv4(),
        orderId,
        status: 'pending_payment',
        note: 'awaiting payment confirmation',
        createdByUid: uid,
      }));
    } else {
      await tx.getRepository(Order).update({ id: orderId }, { paymentStatus: 'pending', status: 'pending_payment' });
      await tx.getRepository(OrderStatusEvent).save(tx.getRepository(OrderStatusEvent).create({
        id: uuidv4(),
        orderId,
        status: 'pending_payment',
        note: 'payment retry initiated',
        createdByUid: uid,
      }));
    }

    let providerSessionPayload = {
      id: uuidv4(),
      orderId,
      provider: setting.provider,
      providerSessionId: `sess_${orderId}`,
      status: 'initiated',
      paymentUrl: null as string | null,
      invoiceKey: null as string | null,
      externalReference: null as string | null,
      rawProviderPayload: attachCheckoutAttemptMeta(null, attemptMeta),
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
        rawProviderPayload: attachCheckoutAttemptMeta(createdInvoice.raw, attemptMeta),
      };
    }

    await tx.getRepository(PaymentSession).save(tx.getRepository(PaymentSession).create(providerSessionPayload));
    return { orderId };
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
  const order = await getOwnedOrderByStore(ctx, uid, String(payload.orderId), payload);
  const rows = await ctx.db.query('SELECT ps.* FROM payment_sessions ps WHERE ps.orderId=? ORDER BY ps.createdAt DESC', [order.id]);
  const latest = rows[0] ?? null;
  return {
    orderId: order.id,
    orderStatus: canonicalOrderStatus(order.status, order.paymentStatus),
    paymentStatus: order.paymentStatus,
    status: latest?.status ?? order.paymentStatus,
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
  const storeId = resolveRequiredStoreId(ctx, payload);
  if (!payload?.paymentSessionId && !payload?.providerSessionId && !payload?.invoiceKey) {
    throw new AppError('PAYMENT_TRANSACTION_NOT_FOUND', 'paymentSessionId, providerSessionId or invoiceKey is required');
  }
  const session = payload.paymentSessionId
    ? await ctx.db.getRepository(PaymentSession).findOneBy({ id: payload.paymentSessionId })
    : payload.providerSessionId
      ? await ctx.db.getRepository(PaymentSession).findOneBy({ providerSessionId: payload.providerSessionId })
      : payload.invoiceKey
        ? await ctx.db.getRepository(PaymentSession).findOneBy({ invoiceKey: payload.invoiceKey })
        : null;
  if (!session) throw new AppError('PAYMENT_TRANSACTION_NOT_FOUND', 'Payment session not found');
  const order = await ctx.db.getRepository(Order).findOneBy({ id: session.orderId, uid, storeId });
  if (!order) throw new AppError('ORDER_ACCESS_FORBIDDEN', 'Order does not belong to current identity');
  if (session.status !== 'paid' && session.status !== 'confirmed') {
    throw new AppError('PAYMENT_CONFIRMATION_FAILED', 'Payment session is not paid yet');
  }

  const finalized = await ctx.db.transaction(async (tx: EntityManager) => finalizePaidOrder(tx, {
    orderId: order.id,
    paymentSessionId: session.id,
    actorUid: uid,
  }));

  if (finalized.finalizedNow) {
    await tryPostBusinessEvent(ctx.db, {
      storeId: order.storeId,
      sourceDocumentType: 'order',
      sourceDocumentId: order.id,
      sourceEventType: 'payment_confirmed',
      amountCents: Number(order.totalCents),
      createdByUid: uid,
      metadata: { paymentSessionId: session.id, provider: session.provider ?? null, cartCleared: finalized.cartCleared },
    });
  }

  return { order: toOrderReadModel(finalized.order), idempotent: !finalized.finalizedNow };
}

export async function ordersList(ctx: ActionContext, payload: any = {}) {
  const uid = requireSessionIdentity(ctx);
  const storeId = resolveRequiredStoreId(ctx, payload);
  const q = normalizeListQueryInput(payload, { defaultPageSize: 20, maxPageSize: 200 });
  const repo = ctx.db.getRepository(Order);
  const buildBaseQuery = () => repo
    .createQueryBuilder('o')
    .where('o.uid = :uid AND o.storeId = :storeId', { uid, storeId })
    .andWhere(buildOperationalOrderWhereSql('o'));

  const qb = buildBaseQuery();
  if (payload?.status) {
    qb.andWhere(`${buildCanonicalOrderStatusSql('o')} = :status`, {
      status: canonicalOrderStatus(payload.status),
    });
  }

  const countQb = buildBaseQuery();
  if (payload?.status) {
    countQb.andWhere(`${buildCanonicalOrderStatusSql('o')} = :status`, {
      status: canonicalOrderStatus(payload.status),
    });
  }

  qb.orderBy('o.createdAt', 'DESC').take(q.limit).skip(q.offset);
  const [orders, total] = await Promise.all([
    qb.getMany(),
    countQb.getCount(),
  ]);
  return {
    orders: orders.map((order: Order) => toOrderReadModel(order)),
    total,
    page: q.page,
    pageSize: q.pageSize,
    pagination: {
      page: q.page,
      pageSize: q.pageSize,
      total,
      hasMore: q.offset + orders.length < total,
    },
  };
}

export async function ordersGet(ctx: ActionContext, p: any) {
  const uid = requireSessionIdentity(ctx);
  const o = await getOwnedOrderByStore(ctx, uid, String(p.orderId), p);
  const items = await ctx.db.getRepository(OrderItem).find({ where: { orderId: o.id } });
  return { order: toOrderReadModel(o), items, riskStatus: o.riskStatus };
}

export async function ordersTracking(ctx: ActionContext, p: any) {
  const uid = requireSessionIdentity(ctx);
  const o = await getOwnedOrderByStore(ctx, uid, String(p.orderId), p);
  const sh = await ctx.db.getRepository(Shipment).findOneBy({ orderId: o.id });
  const ev = sh
    ? await ctx.db.getRepository(TrackingEvent).find({ where: { shipmentId: sh.id }, order: { createdAt: 'ASC' as any } })
    : [];
  const tracking = await syncCustomerOrderTrackingSnapshot(ctx.db, o);
  return { shipment: sh, events: ev, tracking };
}

export async function ordersInvoiceUrl(ctx: ActionContext, p: any) {
  const uid = requireSessionIdentity(ctx);
  const o = await getOperationalOwnedOrderByStore(ctx, uid, String(p.orderId), p);
  return { invoiceUrl: `gs://invoices/${o.storeId}/${o.id}.pdf` };
}

export async function ordersReorder(ctx: ActionContext, p: any) {
  const uid = requireSessionIdentity(ctx);
  const o = await getOperationalOwnedOrderByStore(ctx, uid, String(p.orderId), p);
  const items = await ctx.db.getRepository(OrderItem).find({ where: { orderId: o.id } });
  const cart = await getCart(ctx);

  await ctx.db.transaction(async (tx: EntityManager) => {
    for (const i of items) {
      await tx.getRepository(CartItem).save(tx.getRepository(CartItem).create({ id: uuidv4(), cartId: cart.id, productId: i.productId, variantId: i.variantId, qty: i.qty, unitPriceCents: i.priceCents }));
    }
  });

  return { reordered: items.length };
}

export async function insuranceCreateDraft(ctx: ActionContext, payload: any = {}) {
  const uid = requireSessionIdentity(ctx);
  const storeId = resolveRequiredStoreId(ctx, payload);
  const id = uuidv4();
  await ctx.db.transaction(async (tx: EntityManager) => {
    await tx.getRepository(InsuranceOrder).save(tx.getRepository(InsuranceOrder).create({ id, storeId, uid, status: 'draft', quoteLocked: false, deliveryCentsX2Applied: false }));
  });
  return { insuranceOrder: await ctx.db.getRepository(InsuranceOrder).findOneByOrFail({ id }) };
}

export async function insuranceAttachFiles(ctx: ActionContext, p: any) {
  const uid = requireSessionIdentity(ctx);
  const storeId = resolveRequiredStoreId(ctx, p);
  const o = await ctx.db.getRepository(InsuranceOrder).findOneBy({ id: p.insuranceOrderId, uid, storeId });
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
  const storeId = resolveRequiredStoreId(ctx, p);
  const o = await ctx.db.getRepository(InsuranceOrder).findOneBy({ id: p.insuranceOrderId, uid, storeId });
  if (!o || o.status !== 'draft') throw new AppError('VALIDATION_ERROR', 'Invalid state');
  await ctx.db.transaction(async (tx: EntityManager) => {
    await tx.getRepository(InsuranceOrder).update({ id: o.id }, { status: 'submitted' });
    await tx.getRepository(InsuranceStatusEvent).save(tx.getRepository(InsuranceStatusEvent).create({ id: uuidv4(), insuranceOrderId: o.id, status: 'submitted', note: null, createdByUid: uid }));
  });
  return insuranceGet(ctx, { insuranceOrderId: o.id });
}

export async function insuranceGet(ctx: ActionContext, p: any) {
  const uid = requireSessionIdentity(ctx);
  const storeId = resolveRequiredStoreId(ctx, p);
  const o = await ctx.db.getRepository(InsuranceOrder).findOneBy({ id: p.insuranceOrderId, uid, storeId });
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
  const storeId = resolveRequiredStoreId(ctx, payload);
  const q = normalizeListQueryInput(payload, { defaultPageSize: 20, maxPageSize: 200 });
  return { orders: await ctx.db.getRepository(InsuranceOrder).find({ where: { uid, storeId }, order: { createdAt: 'DESC' as any }, take: q.limit, skip: q.offset }) };
}
