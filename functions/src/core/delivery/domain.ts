import { v4 as uuidv4 } from 'uuid';
import { ActionContext } from '../protocol';
import { AppError } from '../errors';
import { canonicalOrderStatus } from '../orderStatus';
import { resolveStoreScopedId } from '../../utils/queryNormalization';
import { Order } from '../../entities/Order';
import { Store } from '../../entities/Store';
import { Branch } from '../../entities/Branch';
import { Shipment } from '../../entities/Shipment';
import { TrackingEvent } from '../../entities/TrackingEvent';
import { OrderStatusEvent } from '../../entities/OrderStatusEvent';
import { DeliveryAssignment } from '../../entities/DeliveryAssignment';
import { DeliveryOrderEvent } from '../../entities/DeliveryOrderEvent';
import { DeliveryRider } from '../../entities/DeliveryRider';
import { DeliveryTrip } from '../../entities/DeliveryTrip';
import {
  beginIdempotentRequest,
  completeIdempotentRequest,
  readIdempotentResponse,
  resolveIdempotencyKey,
  stableHash,
} from './idempotency';
import { requireDeliveryRider, resolveDeliveryRiderRecord } from './riders';
import {
  coercePresenceStatus,
  DELIVERY_ACTION_LABELS,
  DELIVERY_ACTIVE_ORDER_STATUSES,
  DELIVERY_HISTORY_ORDER_STATUSES,
  DeliveryActionId,
  DeliveryOrderStatus,
  DeliveryPresenceStatus,
  getAllowedDeliveryActions,
  isDeliveryFinalStatus,
  mapDeliveryStatusToOrderStatus,
  mapDeliveryStatusToShipmentStatus,
  normalizeDeliveryPresenceStatus,
  resolveCurrentDeliveryStatus,
  resolveNextDeliveryStatus,
} from './status';
import {
  DELIVERY_HEARTBEAT_TIMEOUT_MS,
  publishRiderLocationSnapshot,
  publishRiderOfflineSnapshot,
  publishRiderPresenceSnapshot,
  readRiderLocationSnapshot,
  readRiderPresenceSnapshot,
  RiderRealtimeLocationPayload,
  validateLocationInput,
} from './tracking';
import { syncCustomerOrderTrackingSnapshot } from './customerTracking';

type DeliveryTx = any;

function trimOrNull(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

function toIso(value: unknown): string | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function toNumber(value: unknown, fallback = 0): number {
  const parsed = typeof value === 'number' ? value : Number(value ?? fallback);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseJson<T>(value: unknown, fallback: T): T {
  if (value == null) return fallback;
  if (typeof value === 'object') return value as T;
  try {
    return JSON.parse(String(value)) as T;
  } catch {
    return fallback;
  }
}

function presentRiderAdminSummary(rider: DeliveryRider, extras?: {
  presence?: Record<string, unknown> | null;
  location?: Record<string, unknown> | null;
  workload?: number;
}) {
  return {
    id: rider.id,
    uid: rider.uid,
    displayName: rider.displayName,
    phone: rider.phone,
    storeId: rider.storeId,
    branchId: rider.branchId,
    vehicleType: rider.vehicleType,
    status: rider.status,
    presenceStatus: rider.presenceStatus,
    activeOrderId: rider.activeOrderId,
    activeTripId: rider.activeTripId,
    lastSeenAt: toIso(rider.lastSeenAt),
    updatedAt: toIso(rider.updatedAt),
    presence: extras?.presence ?? null,
    location: extras?.location ?? null,
    workload: extras?.workload ?? null,
  };
}

function statusOrThrow(order: Pick<Order, 'status' | 'deliveryStatus'>): DeliveryOrderStatus {
  const status = resolveCurrentDeliveryStatus(order);
  if (!status) {
    throw new AppError('DELIVERY_STATUS_INVALID', 'Order is not part of the delivery lifecycle yet');
  }
  return status;
}

function ensureDeliveryCapableOrder(order: Order) {
  const deliverable = order.serviceType === 'delivery'
    || !!order.shippingAddressLine
    || !!order.shippingMethodId
    || !!order.deliveryZoneId;
  if (!deliverable) {
    throw new AppError('DELIVERY_ORDER_INVALID', 'Order is not eligible for delivery workflow');
  }
}

function toAmount(cents: unknown): number {
  return Math.round(toNumber(cents) || 0) / 100;
}

function presentOrderSummary(order: Order) {
  const deliveryStatus = resolveCurrentDeliveryStatus(order);
  return {
    id: order.id,
    storeId: order.storeId,
    branchId: order.branchId ?? null,
    riderId: order.riderId ?? null,
    tripId: order.tripId ?? null,
    status: deliveryStatus ?? canonicalOrderStatus(order.status, order.paymentStatus),
    deliveryStatus,
    canonicalOrderStatus: canonicalOrderStatus(order.status, order.paymentStatus),
    rawStatus: order.status,
    serviceType: order.serviceType,
    paymentStatus: order.paymentStatus,
    statusReason: order.statusReason ?? null,
    assignedAt: toIso(order.assignedAt),
    acceptedAt: toIso(order.acceptedAt),
    pickedUpAt: toIso(order.pickedUpAt),
    deliveredAt: toIso(order.deliveredAt),
    failedAt: toIso(order.failedAt),
    createdAt: toIso(order.createdAt),
    updatedAt: toIso(order.updatedAt),
    totals: {
      subtotal: toAmount(order.subtotalCents),
      shipping: toAmount(order.shippingCents),
      tax: toAmount(order.taxCents),
      discount: toAmount(order.discountCents),
      total: toAmount(order.totalCents),
    },
    customer: {
      name: order.shippingRecipientName ?? null,
      phone: order.shippingPhone ?? null,
      addressLabel: order.shippingAddressLabel ?? null,
      addressLine: order.shippingAddressLine ?? null,
    },
    pickup: {
      label: order.branchId ? `Branch ${order.branchId}` : 'Store pickup',
      addressLine: order.branchId ? `Branch ${order.branchId}` : 'Store pickup location',
      lat: null,
      lng: null,
    },
    dropoff: {
      label: order.shippingAddressLabel ?? order.shippingRecipientName ?? 'Dropoff',
      addressLine: order.shippingAddressLine ?? 'Address unavailable',
      lat: order.shippingLat != null && Number.isFinite(Number(order.shippingLat)) ? Number(order.shippingLat) : null,
      lng: order.shippingLng != null && Number.isFinite(Number(order.shippingLng)) ? Number(order.shippingLng) : null,
    },
    storeContact: {
      name: null,
      phone: null,
    },
    latestRiderLocationSnapshot: parseJson<Record<string, unknown> | null>(order.latestRiderLocationSnapshotJson, null),
    legalActions: deliveryStatus ? getAllowedDeliveryActions(deliveryStatus) : [],
  };
}

async function getOrderForStore(ctx: ActionContext, storeId: string, orderId: string) {
  const order = await ctx.db.getRepository(Order).findOneBy({ id: orderId, storeId });
  if (!order) {
    throw new AppError('ORDER_NOT_FOUND', 'Order was not found in the current store scope');
  }
  ensureDeliveryCapableOrder(order);
  return order;
}

async function getDeliveryAccessibleOrder(ctx: ActionContext, riderId: string, storeId: string, orderId: string) {
  const order = await getOrderForStore(ctx, storeId, orderId);
  const assignment = await ctx.db.getRepository(DeliveryAssignment).findOneBy({ orderId, storeId, riderId });
  if (order.riderId !== riderId && !assignment) {
    throw new AppError('DELIVERY_ORDER_NOT_ASSIGNED', 'Order is not assigned to this rider');
  }
  return { order, assignment };
}

async function getLockedOrder(tx: DeliveryTx, storeId: string, orderId: string) {
  const rows = await tx.query(
    'SELECT * FROM orders WHERE id = ? AND storeId = ? LIMIT 1 FOR UPDATE',
    [orderId, storeId]
  );
  const raw = rows[0] ?? null;
  if (!raw) {
    throw new AppError('ORDER_NOT_FOUND', 'Order was not found in the current store scope');
  }
  return tx.getRepository(Order).create(raw as Partial<Order>);
}

async function getLockedAssignment(tx: DeliveryTx, orderId: string) {
  const rows = await tx.query(
    'SELECT * FROM delivery_assignments WHERE orderId = ? LIMIT 1 FOR UPDATE',
    [orderId]
  );
  const raw = rows[0] ?? null;
  return raw ? tx.getRepository(DeliveryAssignment).create(raw as Partial<DeliveryAssignment>) : null;
}

async function getLockedTrip(tx: DeliveryTx, tripId: string) {
  const rows = await tx.query(
    'SELECT * FROM delivery_trips WHERE id = ? LIMIT 1 FOR UPDATE',
    [tripId]
  );
  const raw = rows[0] ?? null;
  return raw ? tx.getRepository(DeliveryTrip).create(raw as Partial<DeliveryTrip>) : null;
}

async function getLockedRider(tx: DeliveryTx, riderId: string) {
  const rows = await tx.query(
    'SELECT * FROM delivery_riders WHERE id = ? LIMIT 1 FOR UPDATE',
    [riderId]
  );
  const raw = rows[0] ?? null;
  if (!raw) {
    throw new AppError('RIDER_NOT_FOUND', 'Delivery rider was not found');
  }
  return tx.getRepository(DeliveryRider).create(raw as Partial<DeliveryRider>);
}

async function findActiveTripForRider(tx: DeliveryTx, riderId: string) {
  const repo = tx.getRepository(DeliveryTrip);
  return repo.findOne({
    where: { riderId, status: 'active' },
    order: { updatedAt: 'DESC' as any },
  });
}

async function ensureShipment(tx: DeliveryTx, orderId: string, deliveryStatus: DeliveryOrderStatus) {
  const repo = tx.getRepository(Shipment);
  let shipment = await repo.findOneBy({ orderId });
  if (!shipment) {
    shipment = repo.create({
      id: uuidv4(),
      orderId,
      carrier: null,
      trackingNumber: null,
      status: mapDeliveryStatusToShipmentStatus(deliveryStatus),
    });
    await repo.save(shipment);
    return shipment;
  }
  await repo.update(
    { id: shipment.id },
    { status: mapDeliveryStatusToShipmentStatus(deliveryStatus) }
  );
  return repo.findOneByOrFail({ id: shipment.id });
}

async function appendTrackingEvent(
  tx: DeliveryTx,
  shipmentId: string,
  message: string,
  location: string | null = null
) {
  await tx.getRepository(TrackingEvent).save(
    tx.getRepository(TrackingEvent).create({
      id: uuidv4(),
      shipmentId,
      message,
      location,
    })
  );
}

async function appendDeliveryEvent(
  tx: DeliveryTx,
  input: {
    orderId: string;
    storeId: string;
    riderId?: string | null;
    tripId?: string | null;
    type: string;
    actorType: 'rider' | 'admin' | 'system';
    actorId?: string | null;
    statusBefore?: string | null;
    statusAfter?: string | null;
    reason?: string | null;
    metadata?: Record<string, unknown> | null;
    note?: string | null;
  }
) {
  await tx.getRepository(DeliveryOrderEvent).save(
    tx.getRepository(DeliveryOrderEvent).create({
      id: uuidv4(),
      orderId: input.orderId,
      storeId: input.storeId,
      riderId: input.riderId ?? null,
      tripId: input.tripId ?? null,
      type: input.type,
      actorType: input.actorType,
      actorId: input.actorId ?? null,
      statusBefore: input.statusBefore ?? null,
      statusAfter: input.statusAfter ?? null,
      reason: input.reason ?? null,
      metadataJson: input.metadata ?? null,
    })
  );

  if (input.statusAfter) {
    await tx.getRepository(OrderStatusEvent).save(
      tx.getRepository(OrderStatusEvent).create({
        id: uuidv4(),
        orderId: input.orderId,
        status: input.statusAfter,
        note: input.note ?? input.reason ?? null,
        createdByUid: input.actorId ?? 'system',
      })
    );
  }
}

function nextTripOrderIds(current: unknown, orderId: string) {
  const existing = parseJson<string[]>(current, []);
  if (existing.includes(orderId)) {
    return existing;
  }
  return [...existing, orderId];
}

function removeTripOrderId(current: unknown, orderId: string) {
  return parseJson<string[]>(current, []).filter((id) => id !== orderId);
}

async function ensureTripForAcceptedOrder(
  tx: DeliveryTx,
  rider: DeliveryRider,
  order: Order
) {
  const tripRepo = tx.getRepository(DeliveryTrip);
  let trip = order.tripId ? await getLockedTrip(tx, order.tripId) : null;
  if (!trip || trip.status !== 'active') {
    trip = await findActiveTripForRider(tx, rider.id);
  }

  if (!trip) {
    trip = tripRepo.create({
      id: uuidv4(),
      riderId: rider.id,
      storeId: rider.storeId,
      branchId: order.branchId ?? rider.branchId ?? null,
      orderIdsJson: [order.id],
      status: 'active',
      startedAt: new Date(),
      endedAt: null,
    });
    await tripRepo.save(trip);
    return trip;
  }

  await tripRepo.update(
    { id: trip.id },
    {
      orderIdsJson: nextTripOrderIds(trip.orderIdsJson, order.id),
      status: 'active',
      branchId: trip.branchId ?? order.branchId ?? rider.branchId ?? null,
      startedAt: trip.startedAt ?? new Date(),
    }
  );
  return tripRepo.findOneByOrFail({ id: trip.id });
}

async function updateRiderPresenceState(
  tx: DeliveryTx,
  riderId: string,
  input: {
    presenceStatus?: DeliveryPresenceStatus;
    activeOrderId?: string | null;
    activeTripId?: string | null;
    lastSeenAt?: Date;
  }
) {
  await tx.getRepository(DeliveryRider).update(
    { id: riderId },
    {
      presenceStatus: input.presenceStatus,
      activeOrderId: input.activeOrderId,
      activeTripId: input.activeTripId,
      lastSeenAt: input.lastSeenAt ?? new Date(),
    }
  );
}

async function finalizeTripIfNeeded(
  tx: DeliveryTx,
  riderId: string,
  tripId: string | null | undefined,
  completedOrderId: string
) {
  if (!tripId) {
    await updateRiderPresenceState(tx, riderId, {
      presenceStatus: 'online',
      activeOrderId: null,
      activeTripId: null,
      lastSeenAt: new Date(),
    });
    return null;
  }

  const trip = await getLockedTrip(tx, tripId);
  if (!trip) {
    await updateRiderPresenceState(tx, riderId, {
      presenceStatus: 'online',
      activeOrderId: null,
      activeTripId: null,
      lastSeenAt: new Date(),
    });
    return null;
  }

  const remainingOrderIds = removeTripOrderId(trip.orderIdsJson, completedOrderId);
  if (remainingOrderIds.length === 0) {
    await tx.getRepository(DeliveryTrip).update(
      { id: trip.id },
      {
        orderIdsJson: [],
        status: 'completed',
        endedAt: new Date(),
      }
    );
    await updateRiderPresenceState(tx, riderId, {
      presenceStatus: 'online',
      activeOrderId: null,
      activeTripId: null,
      lastSeenAt: new Date(),
    });
    return null;
  }

  await tx.getRepository(DeliveryTrip).update(
    { id: trip.id },
    { orderIdsJson: remainingOrderIds, status: 'active' }
  );
  await updateRiderPresenceState(tx, riderId, {
    presenceStatus: 'driving',
    activeOrderId: remainingOrderIds[0],
    activeTripId: trip.id,
    lastSeenAt: new Date(),
  });
  return trip.id;
}

async function buildOrderDetails(ctx: ActionContext, order: Order, assignment?: DeliveryAssignment | null) {
  const [events, rider, branch, store, trip] = await Promise.all([
    ctx.db.getRepository(DeliveryOrderEvent).find({
      where: { orderId: order.id },
      order: { createdAt: 'ASC' as any },
    }),
    order.riderId ? ctx.db.getRepository(DeliveryRider).findOneBy({ id: order.riderId }) : Promise.resolve(null),
    order.branchId ? ctx.db.getRepository(Branch).findOneBy({ id: order.branchId, storeId: order.storeId }) : Promise.resolve(null),
    ctx.db.getRepository(Store).findOneBy({ id: order.storeId }),
    order.tripId ? ctx.db.getRepository(DeliveryTrip).findOneBy({ id: order.tripId }) : Promise.resolve(null),
  ]);

  return {
    ...presentOrderSummary(order),
    assignment: assignment ?? await ctx.db.getRepository(DeliveryAssignment).findOneBy({ orderId: order.id }),
    rider: rider ? {
      riderId: rider.id,
      uid: rider.uid,
      displayName: rider.displayName,
      phone: rider.phone,
      vehicleType: rider.vehicleType,
      presenceStatus: rider.presenceStatus,
    } : null,
    pickup: {
      label: branch?.name ?? store?.name ?? order.branchId ?? 'Store pickup',
      addressLine: branch?.name ?? store?.name ?? order.branchId ?? 'Store pickup location',
      branchId: branch?.id ?? order.branchId ?? null,
      branchName: branch?.name ?? null,
      storeName: store?.name ?? null,
      lat: branch?.locationLat != null ? Number(branch.locationLat) : null,
      lng: branch?.locationLng != null ? Number(branch.locationLng) : null,
    },
    dropoff: {
      label: order.shippingAddressLabel ?? order.shippingRecipientName ?? 'Dropoff',
      addressLine: order.shippingAddressLine ?? 'Address unavailable',
      lat: order.shippingLat != null && Number.isFinite(Number(order.shippingLat)) ? Number(order.shippingLat) : null,
      lng: order.shippingLng != null && Number.isFinite(Number(order.shippingLng)) ? Number(order.shippingLng) : null,
      customerName: order.shippingRecipientName ?? null,
      customerPhone: order.shippingPhone ?? null,
    },
    storeContact: {
      name: store?.name ?? branch?.name ?? null,
      phone: null,
    },
    trip: trip ? {
      id: trip.id,
      status: trip.status,
      orderIds: parseJson<string[]>(trip.orderIdsJson, []),
      startedAt: toIso(trip.startedAt),
      endedAt: toIso(trip.endedAt),
      updatedAt: toIso(trip.updatedAt),
    } : null,
    timeline: events.map((event: DeliveryOrderEvent) => ({
      id: event.id,
      type: event.type,
      actorType: event.actorType,
      actorId: event.actorId,
      statusBefore: event.statusBefore,
      statusAfter: event.statusAfter,
      reason: event.reason,
      metadata: parseJson<Record<string, unknown> | null>(event.metadataJson, null),
      timestamp: toIso(event.createdAt),
    })),
  };
}

export async function deliveryWhoAmI(ctx: ActionContext) {
  const rider = requireDeliveryRider(ctx);
  return {
    gateway: 'delivery',
    rider,
  };
}

export async function deliveryGetProfile(ctx: ActionContext) {
  const rider = requireDeliveryRider(ctx);
  const store = await ctx.db.getRepository(Store).findOneBy({ id: rider.storeId });
  return {
    rider,
    store: store ? {
      id: store.id,
      name: store.name,
      status: store.status,
    } : null,
  };
}

export async function deliveryGetDashboard(ctx: ActionContext) {
  const rider = requireDeliveryRider(ctx);
  const [activeOrders, activeTrip, deliveredTodayRows, failedTodayRows, rejectedTodayRows] = await Promise.all([
    ctx.db.getRepository(Order)
      .createQueryBuilder('order')
      .where('order.storeId = :storeId', { storeId: rider.storeId })
      .andWhere('order.riderId = :riderId', { riderId: rider.riderId })
      .andWhere('order.deliveryStatus IN (:...statuses)', { statuses: [...DELIVERY_ACTIVE_ORDER_STATUSES] })
      .orderBy('order.updatedAt', 'DESC')
      .getMany(),
    rider.activeTripId
      ? ctx.db.getRepository(DeliveryTrip).findOneBy({ id: rider.activeTripId, riderId: rider.riderId })
      : ctx.db.getRepository(DeliveryTrip).findOne({ where: { riderId: rider.riderId, status: 'active' }, order: { updatedAt: 'DESC' as any } }),
    ctx.db.query(
      `SELECT COUNT(*) total
       FROM delivery_assignments
       WHERE riderId = ? AND storeId = ? AND status = 'delivered' AND DATE(COALESCE(completedAt, updatedAt, createdAt)) = CURRENT_DATE()`,
      [rider.riderId, rider.storeId]
    ),
    ctx.db.query(
      `SELECT COUNT(*) total
       FROM delivery_assignments
       WHERE riderId = ? AND storeId = ? AND status = 'failed_delivery' AND DATE(COALESCE(completedAt, updatedAt, createdAt)) = CURRENT_DATE()`,
      [rider.riderId, rider.storeId]
    ),
    ctx.db.query(
      `SELECT COUNT(*) total
       FROM delivery_assignments
       WHERE riderId = ? AND storeId = ? AND status = 'rejected' AND DATE(COALESCE(respondedAt, updatedAt, createdAt)) = CURRENT_DATE()`,
      [rider.riderId, rider.storeId]
    ),
  ]);

  return {
    rider,
    presenceStatus: normalizeDeliveryPresenceStatus(rider.presenceStatus, rider.activeTripId ? 'driving' : 'online'),
    stats: {
      assignedCount: activeOrders.length,
      deliveredToday: Number(deliveredTodayRows[0]?.total ?? 0),
      failedToday: Number(failedTodayRows[0]?.total ?? 0),
      rejectedToday: Number(rejectedTodayRows[0]?.total ?? 0),
    },
    activeOrders: activeOrders.map((order: Order) => presentOrderSummary(order)),
    activeTrip: activeTrip ? {
      id: activeTrip.id,
      status: activeTrip.status,
      orderIds: parseJson<string[]>(activeTrip.orderIdsJson, []),
      startedAt: toIso(activeTrip.startedAt),
      endedAt: toIso(activeTrip.endedAt),
      updatedAt: toIso(activeTrip.updatedAt),
    } : null,
  };
}

export async function deliveryListAssignedOrders(ctx: ActionContext, payload: any = {}) {
  const rider = requireDeliveryRider(ctx);
  const limit = Math.max(1, Math.min(100, Number(payload.pageSize ?? payload.limit ?? 50)));
  const orders = await ctx.db.getRepository(Order)
    .createQueryBuilder('order')
    .where('order.storeId = :storeId', { storeId: rider.storeId })
    .andWhere('order.riderId = :riderId', { riderId: rider.riderId })
    .andWhere('order.deliveryStatus IN (:...statuses)', { statuses: [...DELIVERY_ACTIVE_ORDER_STATUSES] })
    .orderBy('order.assignedAt', 'ASC')
    .addOrderBy('order.updatedAt', 'ASC')
    .limit(limit)
    .getMany();
  return {
    orders: orders.map((order: Order) => presentOrderSummary(order)),
  };
}

export async function deliveryGetActiveTrip(ctx: ActionContext) {
  const rider = requireDeliveryRider(ctx);
  const trip = rider.activeTripId
    ? await ctx.db.getRepository(DeliveryTrip).findOneBy({ id: rider.activeTripId, riderId: rider.riderId })
    : await ctx.db.getRepository(DeliveryTrip).findOne({
        where: { riderId: rider.riderId, status: 'active' },
        order: { updatedAt: 'DESC' as any },
      });

  if (!trip) {
    if (rider.activeTripId || rider.activeOrderId) {
      await ctx.db.getRepository(DeliveryRider).update(
        { id: rider.riderId },
        { activeTripId: null, activeOrderId: null, presenceStatus: 'online', lastSeenAt: new Date() }
      );
    }
    return { trip: null, orders: [] };
  }

  const orderIds = parseJson<string[]>(trip.orderIdsJson, []);
  const orders = orderIds.length
    ? await ctx.db.getRepository(Order)
        .createQueryBuilder('order')
        .where('order.storeId = :storeId', { storeId: rider.storeId })
        .andWhere('order.id IN (:...orderIds)', { orderIds })
        .getMany()
    : [];

  return {
    trip: {
      id: trip.id,
      status: trip.status,
      orderIds,
      startedAt: toIso(trip.startedAt),
      endedAt: toIso(trip.endedAt),
      updatedAt: toIso(trip.updatedAt),
    },
    orders: orders.map((order: Order) => presentOrderSummary(order)),
  };
}

export async function deliveryGetOrderDetails(ctx: ActionContext, payload: any) {
  const rider = requireDeliveryRider(ctx);
  const orderId = String(payload.orderId ?? '');
  if (!orderId) {
    throw new AppError('VALIDATION_FAILED', 'orderId is required');
  }
  const { order, assignment } = await getDeliveryAccessibleOrder(ctx, rider.riderId, rider.storeId, orderId);
  return {
    order: await buildOrderDetails(ctx, order, assignment),
  };
}

export async function deliveryListHistory(ctx: ActionContext, payload: any = {}) {
  const rider = requireDeliveryRider(ctx);
  const limit = Math.max(1, Math.min(100, Number(payload.pageSize ?? payload.limit ?? 50)));
  const rows = await ctx.db.query(
    `SELECT da.*, o.*
     FROM delivery_assignments da
     JOIN orders o ON o.id = da.orderId
     WHERE da.storeId = ? AND da.riderId = ? AND da.status IN (${DELIVERY_HISTORY_ORDER_STATUSES.map(() => '?').join(',')})
     ORDER BY COALESCE(da.completedAt, da.respondedAt, da.updatedAt, o.updatedAt, o.createdAt) DESC
     LIMIT ?`,
    [rider.storeId, rider.riderId, ...DELIVERY_HISTORY_ORDER_STATUSES, limit]
  );

  const orders = rows.map((row: any) => ctx.db.getRepository(Order).create(row as Partial<Order>));
  return {
    orders: orders.map((order: Order) => presentOrderSummary(order)),
  };
}

async function performRiderDeliveryAction(
  ctx: ActionContext,
  actionName: string,
  actionId: DeliveryActionId,
  payload: Record<string, unknown>
) {
  const rider = requireDeliveryRider(ctx);
  const orderId = String(payload.orderId ?? '');
  const reason = trimOrNull(payload.reason);

  if (!orderId) {
    throw new AppError('VALIDATION_FAILED', 'orderId is required');
  }

  const idempotencyKey = resolveIdempotencyKey(ctx.meta, payload);
  const requestFingerprint = stableHash({
    actionName,
    orderId,
    reason,
    storeId: rider.storeId,
    riderId: rider.riderId,
  });

  return ctx.db.transaction(async (tx: DeliveryTx) => {
    const idempotency = await beginIdempotentRequest(tx, {
      gateway: 'delivery',
      actorId: rider.uid,
      actionName,
      idempotencyKey,
      requestFingerprint,
      orderId,
    });
    const storedResponse = readIdempotentResponse(idempotency);
    if (storedResponse) {
      return { ...storedResponse, idempotent: true };
    }

    const order = await getLockedOrder(tx, rider.storeId, orderId);
    ensureDeliveryCapableOrder(order);

    if (order.riderId !== rider.riderId) {
      throw new AppError('DELIVERY_ORDER_NOT_ASSIGNED', 'This order is not assigned to the authenticated rider');
    }

    const assignment = await getLockedAssignment(tx, orderId);
    const riderRecord = await getLockedRider(tx, rider.riderId);
    const currentStatus = statusOrThrow(order);
    const nextStatus = resolveNextDeliveryStatus(currentStatus, actionId, reason);

    const alreadyApplied = currentStatus === nextStatus
      || (actionId === 'accept' && currentStatus === 'accepted')
      || (actionId === 'reject' && currentStatus === 'rejected')
      || (actionId === 'pickedUp' && currentStatus === 'picked_up')
      || (actionId === 'delivered' && currentStatus === 'delivered')
      || (actionId === 'failedDelivery' && currentStatus === 'failed_delivery');

    if (alreadyApplied) {
      const response = {
        order: await buildOrderDetails(
          { ...ctx, db: tx.connection } as ActionContext,
          order,
          assignment
        ),
      };
      await completeIdempotentRequest(tx, idempotency?.id, response);
      return { ...response, idempotent: true };
    }

    let tripId = order.tripId ?? null;
    const now = new Date();

    if (actionId === 'accept') {
      const trip = await ensureTripForAcceptedOrder(tx, riderRecord, order);
      tripId = trip.id;
      await updateRiderPresenceState(tx, riderRecord.id, {
        presenceStatus: 'driving',
        activeOrderId: order.id,
        activeTripId: tripId,
        lastSeenAt: now,
      });
    }

    if (actionId === 'reject') {
      tripId = null;
      await updateRiderPresenceState(tx, riderRecord.id, {
        presenceStatus: riderRecord.activeTripId && riderRecord.activeTripId !== order.tripId ? 'driving' : 'online',
        activeOrderId: riderRecord.activeOrderId === order.id ? null : riderRecord.activeOrderId,
        activeTripId: riderRecord.activeTripId === order.tripId ? null : riderRecord.activeTripId,
        lastSeenAt: now,
      });
    }

    if (actionId === 'delivered' || actionId === 'failedDelivery') {
      tripId = await finalizeTripIfNeeded(tx, riderRecord.id, order.tripId ?? riderRecord.activeTripId, order.id);
    }

    if (actionId !== 'accept' && actionId !== 'reject' && actionId !== 'delivered' && actionId !== 'failedDelivery') {
      await updateRiderPresenceState(tx, riderRecord.id, {
        presenceStatus: riderRecord.activeTripId || tripId ? 'driving' : 'online',
        activeOrderId: order.id,
        activeTripId: tripId ?? riderRecord.activeTripId,
        lastSeenAt: now,
      });
    }

    const orderPatch: Partial<Order> = {
      status: mapDeliveryStatusToOrderStatus(nextStatus),
      deliveryStatus: nextStatus,
      statusReason: reason,
      tripId,
      updatedAt: now,
    };

    if (nextStatus === 'accepted') {
      orderPatch.acceptedAt = now;
      orderPatch.assignedAt = order.assignedAt ?? now;
    }
    if (nextStatus === 'picked_up') {
      orderPatch.pickedUpAt = now;
    }
    if (nextStatus === 'delivered') {
      orderPatch.deliveredAt = now;
    }
    if (nextStatus === 'failed_delivery') {
      orderPatch.failedAt = now;
    }

    await tx.getRepository(Order).update({ id: order.id }, orderPatch as any);

    if (assignment) {
      await tx.getRepository(DeliveryAssignment).update(
        { id: assignment.id },
        {
          riderId: rider.riderId,
          tripId,
          status: nextStatus,
          reason,
          respondedAt: nextStatus === 'accepted' || nextStatus === 'rejected' ? now : assignment.respondedAt,
          completedAt: isDeliveryFinalStatus(nextStatus) ? now : assignment.completedAt,
        }
      );
    }

    const shipment = await ensureShipment(tx, order.id, nextStatus);
    await appendTrackingEvent(tx, shipment.id, DELIVERY_ACTION_LABELS[actionId], null);
    await appendDeliveryEvent(tx, {
      orderId: order.id,
      storeId: order.storeId,
      riderId: rider.riderId,
      tripId,
      type: actionName,
      actorType: 'rider',
      actorId: rider.uid,
      statusBefore: currentStatus,
      statusAfter: nextStatus,
      reason,
      metadata: {
        idempotencyKey,
      },
      note: reason ?? DELIVERY_ACTION_LABELS[actionId],
    });

    const freshOrder = await tx.getRepository(Order).findOneByOrFail({ id: order.id });
    const freshAssignment = await tx.getRepository(DeliveryAssignment).findOneBy({ orderId: order.id });
    const response = {
      order: await buildOrderDetails(
        { ...ctx, db: tx.connection } as ActionContext,
        freshOrder,
        freshAssignment
      ),
      idempotent: false,
    };
    await completeIdempotentRequest(tx, idempotency?.id, response);
    return response;
  }).then(async (result) => {
    const riderRecord = await ctx.db.getRepository(DeliveryRider).findOneBy({ id: rider.riderId, storeId: rider.storeId });
    if (riderRecord) {
      await publishRiderPresenceSnapshot({
        rider: {
          ...rider,
          activeOrderId: riderRecord.activeOrderId,
          activeTripId: riderRecord.activeTripId,
        },
        presenceStatus: normalizeDeliveryPresenceStatus(
          riderRecord.presenceStatus,
          riderRecord.activeTripId ? 'driving' : 'online'
        ),
        activeOrderId: riderRecord.activeOrderId,
        activeTripId: riderRecord.activeTripId,
        lastSeenAt: toIso(riderRecord.lastSeenAt) ?? undefined,
      });
    }
    await syncCustomerOrderTrackingSnapshot(ctx.db, orderId);
    return result;
  });
}

export async function deliveryAcceptOrder(ctx: ActionContext, payload: any) {
  return performRiderDeliveryAction(ctx, 'deliveryAcceptOrder', 'accept', payload ?? {});
}

export async function deliveryRejectOrder(ctx: ActionContext, payload: any) {
  return performRiderDeliveryAction(ctx, 'deliveryRejectOrder', 'reject', payload ?? {});
}

export async function deliveryArrivedPickup(ctx: ActionContext, payload: any) {
  return performRiderDeliveryAction(ctx, 'deliveryArrivedPickup', 'arrivedPickup', payload ?? {});
}

export async function deliveryPickedUp(ctx: ActionContext, payload: any) {
  return performRiderDeliveryAction(ctx, 'deliveryPickedUp', 'pickedUp', payload ?? {});
}

export async function deliverySetOnTheWay(ctx: ActionContext, payload: any) {
  return performRiderDeliveryAction(ctx, 'deliverySetOnTheWay', 'setOnTheWay', payload ?? {});
}

export async function deliveryArrivedDropoff(ctx: ActionContext, payload: any) {
  return performRiderDeliveryAction(ctx, 'deliveryArrivedDropoff', 'arrivedDropoff', payload ?? {});
}

export async function deliveryDelivered(ctx: ActionContext, payload: any) {
  return performRiderDeliveryAction(ctx, 'deliveryDelivered', 'delivered', payload ?? {});
}

export async function deliveryFailedDelivery(ctx: ActionContext, payload: any) {
  return performRiderDeliveryAction(ctx, 'deliveryFailedDelivery', 'failedDelivery', payload ?? {});
}

export async function deliverySetPresence(ctx: ActionContext, payload: any = {}) {
  const rider = requireDeliveryRider(ctx);
  const requested = normalizeDeliveryPresenceStatus(payload.presenceStatus ?? rider.presenceStatus, 'online');
  const effective = coercePresenceStatus(requested, !!(rider.activeTripId || payload.activeTripId));
  const lastSeenAt = new Date();

  await ctx.db.getRepository(DeliveryRider).update(
    { id: rider.riderId, storeId: rider.storeId },
    {
      presenceStatus: effective,
      activeOrderId: payload.activeOrderId ?? rider.activeOrderId ?? null,
      activeTripId: payload.activeTripId ?? rider.activeTripId ?? null,
      lastSeenAt,
    }
  );

  await publishRiderPresenceSnapshot({
    rider,
    presenceStatus: effective,
    activeOrderId: payload.activeOrderId ?? rider.activeOrderId ?? null,
    activeTripId: payload.activeTripId ?? rider.activeTripId ?? null,
    appState: trimOrNull(payload.appState),
    lastSeenAt: lastSeenAt.toISOString(),
  });

  const activeOrderId = trimOrNull(payload.activeOrderId) ?? rider.activeOrderId ?? null;
  if (activeOrderId) {
    await syncCustomerOrderTrackingSnapshot(ctx.db, activeOrderId);
  }

  return {
    riderId: rider.riderId,
    storeId: rider.storeId,
    presenceStatus: effective,
    lastSeenAt: lastSeenAt.toISOString(),
  };
}

export async function deliveryHeartbeat(ctx: ActionContext, payload: any = {}) {
  const rider = requireDeliveryRider(ctx);
  const requested = normalizeDeliveryPresenceStatus(payload.presenceStatus ?? rider.presenceStatus, rider.activeTripId ? 'driving' : 'online');
  const effective = coercePresenceStatus(requested, !!(payload.activeTripId ?? rider.activeTripId));
  const lastSeenAt = new Date();

  await ctx.db.getRepository(DeliveryRider).update(
    { id: rider.riderId, storeId: rider.storeId },
    {
      presenceStatus: effective,
      activeOrderId: payload.activeOrderId ?? rider.activeOrderId ?? null,
      activeTripId: payload.activeTripId ?? rider.activeTripId ?? null,
      lastSeenAt,
    }
  );

  await publishRiderPresenceSnapshot({
    rider,
    presenceStatus: effective,
    activeOrderId: payload.activeOrderId ?? rider.activeOrderId ?? null,
    activeTripId: payload.activeTripId ?? rider.activeTripId ?? null,
    appState: trimOrNull(payload.appState),
    lastSeenAt: lastSeenAt.toISOString(),
  });

  const activeOrderId = trimOrNull(payload.activeOrderId) ?? rider.activeOrderId ?? null;
  if (activeOrderId) {
    await syncCustomerOrderTrackingSnapshot(ctx.db, activeOrderId);
  }

  return {
    heartbeatAccepted: true,
    riderId: rider.riderId,
    presenceStatus: effective,
    timeoutMs: DELIVERY_HEARTBEAT_TIMEOUT_MS,
    lastSeenAt: lastSeenAt.toISOString(),
  };
}

export async function deliveryUpdateLocation(ctx: ActionContext, payload: any) {
  const rider = requireDeliveryRider(ctx);
  const requestedStoreId = trimOrNull(payload.storeId);
  if (requestedStoreId && requestedStoreId !== rider.storeId) {
    throw new AppError('DELIVERY_STORE_MISMATCH', 'Location update store scope does not match rider store scope', {
      requestedStoreId,
      riderStoreId: rider.storeId,
    });
  }

  const location = validateLocationInput(payload ?? {});
  const updatedAt = new Date().toISOString();
  const presenceStatus = coercePresenceStatus(
    normalizeDeliveryPresenceStatus(payload.presenceStatus ?? rider.presenceStatus, rider.activeTripId ? 'driving' : 'online'),
    !!(payload.tripId ?? rider.activeTripId)
  );

  const realtimePayload: RiderRealtimeLocationPayload = {
    riderId: rider.riderId,
    storeId: rider.storeId,
    branchId: trimOrNull(payload.branchId) ?? rider.branchId ?? null,
    orderId: trimOrNull(payload.orderId) ?? rider.activeOrderId ?? null,
    tripId: trimOrNull(payload.tripId) ?? rider.activeTripId ?? null,
    lat: location.lat,
    lng: location.lng,
    accuracy: location.accuracy,
    heading: location.heading,
    speed: location.speed,
    updatedAt,
    presenceStatus,
    appState: trimOrNull(payload.appState),
  };

  await ctx.db.transaction(async (tx: DeliveryTx) => {
    await tx.getRepository(DeliveryRider).update(
      { id: rider.riderId, storeId: rider.storeId },
      {
        branchId: realtimePayload.branchId,
        presenceStatus,
        activeOrderId: realtimePayload.orderId,
        activeTripId: realtimePayload.tripId,
        lastSeenAt: new Date(updatedAt),
      }
    );

    if (realtimePayload.orderId) {
      await tx.getRepository(Order).update(
        { id: realtimePayload.orderId, storeId: rider.storeId },
        ({
          latestRiderLocationSnapshotJson: realtimePayload as any,
        } as any)
      );
    }
  });

  await publishRiderLocationSnapshot(realtimePayload);
  await publishRiderPresenceSnapshot({
    rider,
    presenceStatus,
    activeOrderId: realtimePayload.orderId,
    activeTripId: realtimePayload.tripId,
    appState: realtimePayload.appState,
    lastSeenAt: updatedAt,
  });

  if (realtimePayload.orderId) {
    await syncCustomerOrderTrackingSnapshot(ctx.db, realtimePayload.orderId);
  }

  return {
    updated: true,
    location: realtimePayload,
  };
}

async function getRiderForStore(ctx: ActionContext, storeId: string, riderId: string) {
  const rider = await ctx.db.getRepository(DeliveryRider).findOneBy({ id: riderId, storeId });
  if (rider) {
    return rider;
  }
  const byUid = await resolveDeliveryRiderRecord(ctx.db.getRepository(DeliveryRider).manager, riderId);
  if (byUid && byUid.storeId === storeId) {
    return byUid;
  }
  throw new AppError('RIDER_NOT_FOUND', 'Delivery rider was not found in the requested store scope');
}

async function getStoreDeliveryDashboardStats(ctx: ActionContext, storeId: string) {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayIso = todayStart.toISOString().slice(0, 19).replace('T', ' ');

  const [riders, activeAssignmentsRows, finalRows] = await Promise.all([
    ctx.db
      .getRepository(DeliveryRider)
      .find({ where: { storeId }, order: { updatedAt: 'DESC' as any } }) as Promise<DeliveryRider[]>,
    ctx.db.query(
      `SELECT COUNT(*) total
       FROM delivery_assignments
       WHERE storeId = ? AND status IN ('assigned','accepted','arrived_pickup','picked_up','on_the_way','arrived_dropoff')`,
      [storeId]
    ),
    ctx.db.query(
      `SELECT
          SUM(CASE WHEN status = 'delivered' AND COALESCE(completedAt, updatedAt, createdAt) >= ? THEN 1 ELSE 0 END) deliveredToday,
          SUM(CASE WHEN status = 'failed_delivery' AND COALESCE(completedAt, updatedAt, createdAt) >= ? THEN 1 ELSE 0 END) failedToday,
          SUM(CASE WHEN status = 'rejected' AND COALESCE(respondedAt, updatedAt, createdAt) >= ? THEN 1 ELSE 0 END) rejectedToday
       FROM delivery_assignments
       WHERE storeId = ?`,
      [todayIso, todayIso, todayIso, storeId]
    ),
  ]);

  const online = riders.filter((rider: DeliveryRider) => rider.presenceStatus === 'online').length;
  const driving = riders.filter((rider: DeliveryRider) => rider.presenceStatus === 'driving').length;
  const offline = riders.filter((rider: DeliveryRider) => rider.presenceStatus === 'offline').length;
  const staleThreshold = new Date(Date.now() - DELIVERY_HEARTBEAT_TIMEOUT_MS);
  const stale = riders.filter((rider: DeliveryRider) => !!rider.lastSeenAt && rider.lastSeenAt < staleThreshold).length;

  return {
    riderCounts: {
      total: riders.length,
      online,
      driving,
      offline,
      inactive: riders.filter((rider: DeliveryRider) => rider.status !== 'active').length,
      stale,
    },
    assignmentCounts: {
      active: Number(activeAssignmentsRows[0]?.total ?? 0),
      deliveredToday: Number(finalRows[0]?.deliveredToday ?? 0),
      failedToday: Number(finalRows[0]?.failedToday ?? 0),
      rejectedToday: Number(finalRows[0]?.rejectedToday ?? 0),
    },
  };
}

async function persistAssignmentChange(
  tx: DeliveryTx,
  input: {
    order: Order;
    riderId: string | null;
    actorUid: string;
    status: DeliveryOrderStatus | 'unassigned';
    reason?: string | null;
    tripId?: string | null;
  }
) {
  const repo = tx.getRepository(DeliveryAssignment);
  const existing = await getLockedAssignment(tx, input.order.id);
  const now = new Date();

  if (!existing) {
    await repo.save(
      repo.create({
        id: uuidv4(),
        orderId: input.order.id,
        storeId: input.order.storeId,
        branchId: input.order.branchId ?? null,
        riderId: input.riderId,
        tripId: input.tripId ?? null,
        status: input.status,
        reason: input.reason ?? null,
        assignedByUid: input.actorUid,
        assignedAt: now,
        respondedAt: input.status === 'accepted' || input.status === 'rejected' ? now : null,
        completedAt: input.status === 'delivered' || input.status === 'failed_delivery' || input.status === 'cancelled' ? now : null,
      })
    );
    return;
  }

  await repo.update(
    { id: existing.id },
    {
      riderId: input.riderId,
      tripId: input.tripId ?? null,
      status: input.status,
      reason: input.reason ?? existing.reason,
      assignedByUid: input.actorUid,
      assignedAt: input.status === 'assigned' ? now : existing.assignedAt,
      respondedAt: input.status === 'accepted' || input.status === 'rejected' ? now : existing.respondedAt,
      completedAt: input.status === 'delivered' || input.status === 'failed_delivery' || input.status === 'cancelled' ? now : existing.completedAt,
    }
  );
}

function ensureAdminAssignable(order: Order) {
  ensureDeliveryCapableOrder(order);
  const currentStatus = resolveCurrentDeliveryStatus(order);
  if (currentStatus && ['picked_up', 'on_the_way', 'arrived_dropoff', 'delivered', 'failed_delivery'].includes(currentStatus)) {
    throw new AppError('DELIVERY_ILLEGAL_TRANSITION', 'Order cannot be reassigned after the active delivery leg has started', {
      currentStatus,
    });
  }
}

async function assignOrderToRiderInternal(
  ctx: ActionContext,
  payload: Record<string, unknown>,
  mode: 'assign' | 'reassign'
) {
  const storeId = resolveStoreScopedId(ctx.storeId, payload.storeId);
  const orderId = String(payload.orderId ?? '');
  const riderId = String(payload.riderId ?? '');
  const reason = trimOrNull(payload.reason) ?? trimOrNull(payload.note);

  if (!orderId || !riderId) {
    throw new AppError('VALIDATION_FAILED', 'orderId and riderId are required');
  }

  const rider = await getRiderForStore(ctx, storeId, riderId);
  const idempotencyKey = resolveIdempotencyKey(ctx.meta, payload);
  const requestFingerprint = stableHash({ mode, orderId, riderId, storeId, reason });

  return ctx.db.transaction(async (tx: DeliveryTx) => {
    const idempotency = await beginIdempotentRequest(tx, {
      gateway: 'admin',
      actorId: ctx.uid ?? 'admin',
      actionName: mode === 'assign' ? 'adminAssignOrderToRider' : 'adminReassignOrderToRider',
      idempotencyKey,
      requestFingerprint,
      orderId,
    });
    const storedResponse = readIdempotentResponse(idempotency);
    if (storedResponse) {
      return { ...storedResponse, idempotent: true };
    }

    const order = await getLockedOrder(tx, storeId, orderId);
    ensureAdminAssignable(order);
    const previousRiderId = order.riderId ?? null;
    if (mode === 'assign' && previousRiderId && previousRiderId !== rider.id) {
      throw new AppError('DELIVERY_ORDER_ALREADY_ASSIGNED', 'Order is already assigned to another rider');
    }

    if (order.riderId === rider.id && resolveCurrentDeliveryStatus(order) === 'assigned') {
      const current = await buildOrderDetails({ ...ctx, db: tx.connection } as ActionContext, order);
      const response = { order: current, idempotent: true };
      await completeIdempotentRequest(tx, idempotency?.id, response);
      return response;
    }

    const previousRider = previousRiderId ? await getLockedRider(tx, previousRiderId) : null;
    await tx.getRepository(Order).update(
      { id: order.id },
      {
        riderId: rider.id,
        tripId: null,
        status: 'assigned',
        deliveryStatus: 'assigned',
        statusReason: reason,
        assignedAt: new Date(),
        updatedAt: new Date(),
      }
    );
    await persistAssignmentChange(tx, {
      order,
      riderId: rider.id,
      actorUid: ctx.uid ?? 'admin',
      status: 'assigned',
      reason,
      tripId: null,
    });

    if (previousRider && previousRider.id !== rider.id && previousRider.activeOrderId === order.id) {
      await updateRiderPresenceState(tx, previousRider.id, {
        presenceStatus: previousRider.activeTripId ? 'driving' : 'online',
        activeOrderId: null,
        activeTripId: previousRider.activeTripId,
        lastSeenAt: new Date(),
      });
    }

    await updateRiderPresenceState(tx, rider.id, {
      presenceStatus: rider.activeTripId ? 'driving' : 'online',
      activeOrderId: rider.activeOrderId ?? order.id,
      activeTripId: rider.activeTripId,
      lastSeenAt: new Date(),
    });

    await appendDeliveryEvent(tx, {
      orderId: order.id,
      storeId,
      riderId: rider.id,
      tripId: null,
      type: mode === 'assign' ? 'adminAssignOrderToRider' : 'adminReassignOrderToRider',
      actorType: 'admin',
      actorId: ctx.uid ?? 'admin',
      statusBefore: resolveCurrentDeliveryStatus(order),
      statusAfter: 'assigned',
      reason,
      metadata: {
        previousRiderId,
        nextRiderId: rider.id,
      },
      note: reason ?? (mode === 'assign' ? 'Assigned to rider' : 'Reassigned to rider'),
    });

    const shipment = await ensureShipment(tx, order.id, 'assigned');
    await appendTrackingEvent(tx, shipment.id, mode === 'assign' ? 'Assigned to rider' : 'Reassigned to rider', null);

    const freshOrder = await tx.getRepository(Order).findOneByOrFail({ id: order.id });
    const response = {
      order: await buildOrderDetails({ ...ctx, db: tx.connection } as ActionContext, freshOrder),
      idempotent: false,
    };
    await completeIdempotentRequest(tx, idempotency?.id, response);
    return response;
  });
}

export async function adminAssignOrderToRider(ctx: ActionContext, payload: any) {
  const result = await assignOrderToRiderInternal(ctx, payload ?? {}, 'assign');
  const orderId = String(payload?.orderId ?? '');
  if (orderId) {
    await syncCustomerOrderTrackingSnapshot(ctx.db, orderId);
  }
  return result;
}

export async function adminReassignOrderToRider(ctx: ActionContext, payload: any) {
  const result = await assignOrderToRiderInternal(ctx, payload ?? {}, 'reassign');
  const orderId = String(payload?.orderId ?? '');
  if (orderId) {
    await syncCustomerOrderTrackingSnapshot(ctx.db, orderId);
  }
  return result;
}

export async function adminUnassignOrderFromRider(ctx: ActionContext, payload: any) {
  const storeId = resolveStoreScopedId(ctx.storeId, payload?.storeId);
  const orderId = String(payload?.orderId ?? '');
  const reason = trimOrNull(payload?.reason) ?? trimOrNull(payload?.note);

  if (!orderId) {
    throw new AppError('VALIDATION_FAILED', 'orderId is required');
  }

  const idempotencyKey = resolveIdempotencyKey(ctx.meta, payload ?? {});
  const requestFingerprint = stableHash({ orderId, storeId, reason, action: 'adminUnassignOrderFromRider' });

  const result = await ctx.db.transaction(async (tx: DeliveryTx) => {
    const idempotency = await beginIdempotentRequest(tx, {
      gateway: 'admin',
      actorId: ctx.uid ?? 'admin',
      actionName: 'adminUnassignOrderFromRider',
      idempotencyKey,
      requestFingerprint,
      orderId,
    });
    const storedResponse = readIdempotentResponse(idempotency);
    if (storedResponse) {
      return { ...storedResponse, idempotent: true };
    }

    const order = await getLockedOrder(tx, storeId, orderId);
    ensureAdminAssignable(order);
    const previousRiderId = order.riderId ?? null;
    const previousRider = previousRiderId ? await getLockedRider(tx, previousRiderId) : null;

    if (!previousRiderId) {
      const current = await buildOrderDetails({ ...ctx, db: tx.connection } as ActionContext, order);
      const response = { order: current, idempotent: true };
      await completeIdempotentRequest(tx, idempotency?.id, response);
      return response;
    }

    await tx.getRepository(Order).update(
      { id: order.id },
      {
        riderId: null,
        tripId: null,
        deliveryStatus: null,
        status: canonicalOrderStatus(order.status, order.paymentStatus) === 'out_for_delivery' ? 'ready' : order.status,
        statusReason: reason,
        updatedAt: new Date(),
      }
    );
    await persistAssignmentChange(tx, {
      order,
      riderId: null,
      actorUid: ctx.uid ?? 'admin',
      status: 'unassigned',
      reason,
      tripId: null,
    });
    await updateRiderPresenceState(tx, previousRiderId, {
      presenceStatus: previousRider?.activeTripId ? 'driving' : 'online',
      activeOrderId: previousRider?.activeOrderId === order.id ? null : previousRider?.activeOrderId ?? null,
      activeTripId: previousRider?.activeTripId ?? null,
      lastSeenAt: new Date(),
    });
    await appendDeliveryEvent(tx, {
      orderId: order.id,
      storeId,
      riderId: previousRiderId,
      tripId: order.tripId ?? null,
      type: 'adminUnassignOrderFromRider',
      actorType: 'admin',
      actorId: ctx.uid ?? 'admin',
      statusBefore: resolveCurrentDeliveryStatus(order),
      statusAfter: null,
      reason,
      note: reason ?? 'Unassigned from rider',
    });

    const freshOrder = await tx.getRepository(Order).findOneByOrFail({ id: order.id });
    const response = {
      order: await buildOrderDetails({ ...ctx, db: tx.connection } as ActionContext, freshOrder),
      idempotent: false,
    };
    await completeIdempotentRequest(tx, idempotency?.id, response);
    return response;
  });
  await syncCustomerOrderTrackingSnapshot(ctx.db, orderId);
  return result;
}

export async function adminGetRiderPresence(ctx: ActionContext, payload: any) {
  const storeId = resolveStoreScopedId(ctx.storeId, payload?.storeId);
  const riderId = String(payload?.riderId ?? '');
  if (!riderId) {
    throw new AppError('VALIDATION_FAILED', 'riderId is required');
  }
  const rider = await getRiderForStore(ctx, storeId, riderId);
  const realtime = await readRiderPresenceSnapshot(storeId, rider.id);
  return {
    rider: {
      id: rider.id,
      uid: rider.uid,
      displayName: rider.displayName,
      phone: rider.phone,
      storeId: rider.storeId,
      branchId: rider.branchId,
      vehicleType: rider.vehicleType,
      status: rider.status,
      presenceStatus: rider.presenceStatus,
      activeOrderId: rider.activeOrderId,
      activeTripId: rider.activeTripId,
      lastSeenAt: toIso(rider.lastSeenAt),
    },
    realtime,
  };
}

export async function adminGetRiderTracking(ctx: ActionContext, payload: any) {
  const storeId = resolveStoreScopedId(ctx.storeId, payload?.storeId);
  const riderId = String(payload?.riderId ?? '');
  if (!riderId) {
    throw new AppError('VALIDATION_FAILED', 'riderId is required');
  }
  const rider = await getRiderForStore(ctx, storeId, riderId);
  const [location, presence] = await Promise.all([
    readRiderLocationSnapshot(storeId, rider.id),
    readRiderPresenceSnapshot(storeId, rider.id),
  ]);
  return {
    riderId: rider.id,
    storeId,
    presence,
    location,
  };
}

export async function adminListRidersForStore(ctx: ActionContext, payload: any = {}) {
  const storeId = resolveStoreScopedId(ctx.storeId, payload.storeId);
  const status = trimOrNull(payload.status);
  const repo = ctx.db.getRepository(DeliveryRider);
  const riders: DeliveryRider[] = status
    ? await repo.find({ where: { storeId, status }, order: { updatedAt: 'DESC' as any } })
    : await repo.find({ where: { storeId }, order: { updatedAt: 'DESC' as any } });
  const assignmentCounts = (await ctx.db.query(
    `SELECT riderId, COUNT(*) workload
     FROM delivery_assignments
     WHERE storeId = ? AND status IN ('assigned','accepted','arrived_pickup','picked_up','on_the_way','arrived_dropoff')
     GROUP BY riderId`,
    [storeId]
  )) as Array<{ riderId?: string | null; workload?: number | string | null }>;
  const workloadByRiderId = assignmentCounts.reduce((acc: Record<string, number>, row) => {
    acc[String(row.riderId ?? '')] = Number(row.workload ?? 0);
    return acc;
  }, {} as Record<string, number>);
  return {
    riders: riders.map((rider: DeliveryRider) =>
      presentRiderAdminSummary(rider, { workload: workloadByRiderId[rider.id] ?? 0 })
    ),
  };
}

export async function adminListRiders(ctx: ActionContext, payload: any = {}) {
  return adminListRidersForStore(ctx, payload);
}

export async function adminGetRider(ctx: ActionContext, payload: any) {
  const storeId = resolveStoreScopedId(ctx.storeId, payload?.storeId);
  const riderId = String(payload?.riderId ?? '');
  if (!riderId) {
    throw new AppError('VALIDATION_FAILED', 'riderId is required');
  }

  const rider = await getRiderForStore(ctx, storeId, riderId);
  const [presence, location, assignments] = await Promise.all([
    readRiderPresenceSnapshot(storeId, rider.id),
    readRiderLocationSnapshot(storeId, rider.id),
    ctx.db.query(
      `SELECT da.*, o.deliveryStatus, o.status orderStatus, o.shippingRecipientName customerName, o.shippingPhone customerPhone, o.shippingAddressLine addressLine
       FROM delivery_assignments da
       LEFT JOIN orders o ON o.id = da.orderId
       WHERE da.storeId = ? AND da.riderId = ?
       ORDER BY da.updatedAt DESC
       LIMIT 20`,
      [storeId, rider.id]
    ),
  ]);

  return {
    rider: presentRiderAdminSummary(rider, { presence, location }),
    assignments,
  };
}

export async function adminCreateRider(ctx: ActionContext, payload: any) {
  const storeId = resolveStoreScopedId(ctx.storeId, payload?.storeId);
  const uid = trimOrNull(payload?.uid);
  const displayName = trimOrNull(payload?.displayName);
  if (!uid) {
    throw new AppError('VALIDATION_FAILED', 'uid is required');
  }
  if (!displayName) {
    throw new AppError('VALIDATION_FAILED', 'displayName is required');
  }

  const repo = ctx.db.getRepository(DeliveryRider);
  const existing = await repo.findOneBy({ uid });
  if (existing) {
    if (existing.storeId !== storeId) {
      throw new AppError('DELIVERY_STORE_MISMATCH', 'This rider UID already belongs to another store', {
        existingStoreId: existing.storeId,
        requestedStoreId: storeId,
      });
    }

    await repo.update(
      { id: existing.id },
      {
        displayName,
        phone: trimOrNull(payload?.phone),
        vehicleType: trimOrNull(payload?.vehicleType),
        branchId: trimOrNull(payload?.branchId),
        status: trimOrNull(payload?.status) ?? 'active',
      }
    );
    const refreshed = await repo.findOneByOrFail({ id: existing.id });
    return { rider: presentRiderAdminSummary(refreshed) };
  }

  const rider = repo.create({
    id: trimOrNull(payload?.riderId) ?? uuidv4(),
    uid,
    storeId,
    branchId: trimOrNull(payload?.branchId),
    displayName,
    phone: trimOrNull(payload?.phone),
    vehicleType: trimOrNull(payload?.vehicleType),
    status: trimOrNull(payload?.status) ?? 'active',
    presenceStatus: 'offline',
    activeOrderId: null,
    activeTripId: null,
    lastSeenAt: null,
  });
  await repo.save(rider);
  return { rider: presentRiderAdminSummary(rider) };
}

export async function adminUpdateRider(ctx: ActionContext, payload: any) {
  const storeId = resolveStoreScopedId(ctx.storeId, payload?.storeId);
  const riderId = String(payload?.riderId ?? '');
  if (!riderId) {
    throw new AppError('VALIDATION_FAILED', 'riderId is required');
  }

  const rider = await getRiderForStore(ctx, storeId, riderId);
  const patch: Partial<DeliveryRider> = {};
  if (payload.displayName !== undefined) patch.displayName = trimOrNull(payload.displayName);
  if (payload.phone !== undefined) patch.phone = trimOrNull(payload.phone);
  if (payload.vehicleType !== undefined) patch.vehicleType = trimOrNull(payload.vehicleType);
  if (payload.branchId !== undefined) patch.branchId = trimOrNull(payload.branchId);
  if (payload.status !== undefined) patch.status = trimOrNull(payload.status) ?? rider.status;

  await ctx.db.getRepository(DeliveryRider).update({ id: rider.id, storeId }, patch);
  const refreshed = await ctx.db.getRepository(DeliveryRider).findOneByOrFail({ id: rider.id, storeId });
  return { rider: presentRiderAdminSummary(refreshed) };
}

export async function adminDisableRider(ctx: ActionContext, payload: any) {
  const storeId = resolveStoreScopedId(ctx.storeId, payload?.storeId);
  const riderId = String(payload?.riderId ?? '');
  if (!riderId) {
    throw new AppError('VALIDATION_FAILED', 'riderId is required');
  }

  const rider = await getRiderForStore(ctx, storeId, riderId);
  if (rider.activeTripId || rider.activeOrderId) {
    throw new AppError('DELIVERY_ILLEGAL_TRANSITION', 'Rider cannot be disabled while an active delivery is attached', {
      activeTripId: rider.activeTripId,
      activeOrderId: rider.activeOrderId,
    });
  }

  await ctx.db.getRepository(DeliveryRider).update(
    { id: rider.id, storeId },
    { status: 'inactive', presenceStatus: 'offline', lastSeenAt: new Date() }
  );
      await publishRiderOfflineSnapshot({
        riderId: rider.id,
        uid: rider.uid,
        role: 'rider',
    storeId: rider.storeId,
    branchId: rider.branchId,
    displayName: rider.displayName,
    phone: rider.phone,
    vehicleType: rider.vehicleType,
    status: 'inactive',
    presenceStatus: 'offline',
    activeOrderId: null,
    activeTripId: null,
    lastSeenAt: new Date().toISOString(),
  });

  const refreshed = await ctx.db.getRepository(DeliveryRider).findOneByOrFail({ id: rider.id, storeId });
  return { rider: presentRiderAdminSummary(refreshed) };
}

export async function adminListDeliveryAssignments(ctx: ActionContext, payload: any = {}) {
  const storeId = resolveStoreScopedId(ctx.storeId, payload.storeId);
  const status = trimOrNull(payload.status);
  const riderId = trimOrNull(payload.riderId);
  const limit = Math.max(1, Math.min(100, Number(payload.pageSize ?? payload.limit ?? 100)));
  const params: unknown[] = [storeId];
  let where = 'WHERE da.storeId = ?';
  if (status) {
    where += ' AND da.status = ?';
    params.push(status);
  }
  if (riderId) {
    where += ' AND da.riderId = ?';
    params.push(riderId);
  }
  params.push(limit);

  const rows = await ctx.db.query(
    `SELECT da.*, o.status orderStatus, o.deliveryStatus, o.shippingRecipientName customerName, o.shippingPhone customerPhone, o.shippingAddressLine addressLine
     FROM delivery_assignments da
     JOIN orders o ON o.id = da.orderId
     ${where}
     ORDER BY da.updatedAt DESC
     LIMIT ?`,
    params
  );
  return {
    assignments: rows,
  };
}

export async function adminGetDeliveryOrderTimeline(ctx: ActionContext, payload: any) {
  const storeId = resolveStoreScopedId(ctx.storeId, payload?.storeId);
  const orderId = String(payload?.orderId ?? '');
  if (!orderId) {
    throw new AppError('VALIDATION_FAILED', 'orderId is required');
  }
  const order = await getOrderForStore(ctx, storeId, orderId);
  const assignment = await ctx.db.getRepository(DeliveryAssignment).findOneBy({ orderId, storeId });
  return {
    order: await buildOrderDetails(ctx, order, assignment),
  };
}

export async function adminGetDeliveryDashboardStats(ctx: ActionContext, payload: any = {}) {
  const storeId = resolveStoreScopedId(ctx.storeId, payload.storeId);
  return getStoreDeliveryDashboardStats(ctx, storeId);
}

export async function adminGetDeliveryLiveBoard(ctx: ActionContext, payload: any = {}) {
  const storeId = resolveStoreScopedId(ctx.storeId, payload.storeId);
  const limit = Math.max(1, Math.min(100, Number(payload.pageSize ?? payload.limit ?? 40)));
  const [stats, assignments, riders] = await Promise.all([
    getStoreDeliveryDashboardStats(ctx, storeId),
    ctx.db.query(
      `SELECT da.*, o.deliveryStatus, o.status orderStatus, o.shippingRecipientName customerName, o.shippingPhone customerPhone, o.shippingAddressLine addressLine
       FROM delivery_assignments da
       LEFT JOIN orders o ON o.id = da.orderId
       WHERE da.storeId = ? AND da.status IN ('assigned','accepted','arrived_pickup','picked_up','on_the_way','arrived_dropoff')
       ORDER BY da.updatedAt DESC
       LIMIT ?`,
      [storeId, limit]
    ),
    ctx.db
      .getRepository(DeliveryRider)
      .find({ where: { storeId }, order: { updatedAt: 'DESC' as any } }) as Promise<DeliveryRider[]>,
  ]);

  const enrichedRiders = await Promise.all(
    riders.map(async (rider: DeliveryRider) => {
      const [presence, location] = await Promise.all([
        readRiderPresenceSnapshot(storeId, rider.id),
        readRiderLocationSnapshot(storeId, rider.id),
      ]);
      return presentRiderAdminSummary(rider, { presence, location });
    })
  );

  return {
    ...stats,
    riders: enrichedRiders,
    assignments,
  };
}

export async function sweepStaleRiderPresence(ctx: ActionContext) {
  const threshold = new Date(Date.now() - DELIVERY_HEARTBEAT_TIMEOUT_MS);
  const staleRiders = await ctx.db.getRepository(DeliveryRider).find({
    where: [
      { presenceStatus: 'online' as any },
      { presenceStatus: 'driving' as any },
    ] as any,
  });

  const affected: Array<{ riderId: string; storeId: string }> = [];
  for (const rider of staleRiders) {
    if (!rider.lastSeenAt || rider.lastSeenAt > threshold) {
      continue;
    }
    await ctx.db.getRepository(DeliveryRider).update(
      { id: rider.id },
      { presenceStatus: 'offline', activeOrderId: rider.activeOrderId, activeTripId: rider.activeTripId }
    );
    await publishRiderOfflineSnapshot({
      riderId: rider.id,
      uid: rider.uid,
      role: 'rider',
      storeId: rider.storeId,
      branchId: rider.branchId,
      displayName: rider.displayName,
      phone: rider.phone,
      vehicleType: rider.vehicleType,
      status: rider.status,
      presenceStatus: 'offline',
      activeOrderId: rider.activeOrderId,
        activeTripId: rider.activeTripId,
        lastSeenAt: toIso(rider.lastSeenAt),
      });
      if (rider.activeOrderId) {
        await syncCustomerOrderTrackingSnapshot(ctx.db, rider.activeOrderId);
      }
      affected.push({ riderId: rider.id, storeId: rider.storeId });
    }

  return {
    threshold: threshold.toISOString(),
    affectedCount: affected.length,
    affected,
  };
}
