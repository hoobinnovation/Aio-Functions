import { DataSource } from 'typeorm';
import { Branch } from '../../entities/Branch';
import { DeliveryOrderEvent } from '../../entities/DeliveryOrderEvent';
import { DeliveryRider } from '../../entities/DeliveryRider';
import { Order } from '../../entities/Order';
import { OrderStatusEvent } from '../../entities/OrderStatusEvent';
import { Shipment } from '../../entities/Shipment';
import { Store } from '../../entities/Store';
import { TrackingEvent } from '../../entities/TrackingEvent';
import { canonicalOrderStatus } from '../orderStatus';
import {
  ORDER_TRACKING_RTDB_ROOT,
  publishOrderTrackingSnapshot,
  readOrderTrackingSnapshot,
} from './tracking';
import { resolveCurrentDeliveryStatus } from './status';

type TimelineEvent = {
  id: string;
  status: string | null;
  title: string;
  description: string | null;
  reason: string | null;
  location: string | null;
  timestamp: string | null;
  actorType: string | null;
  actorId: string | null;
  isCurrent: boolean;
  isCompleted: boolean;
};

const LOCATION_STALE_MS = 2 * 60 * 1000;
const ETA_MIN_MINUTES = 2;
const ETA_MAX_MINUTES = 120;
const ROAD_FACTOR = 1.18;

const STATUS_LABELS: Record<string, string> = {
  pending_payment: 'Awaiting payment',
  pending: 'Pending',
  confirmed: 'Confirmed',
  preparing: 'Preparing',
  ready: 'Ready for dispatch',
  assigned: 'Assigned to rider',
  accepted: 'Rider accepted',
  arrived_pickup: 'Rider arrived at pickup',
  picked_up: 'Picked up',
  on_the_way: 'On the way',
  arrived_dropoff: 'Arrived nearby',
  delivered: 'Delivered',
  rejected: 'Rejected',
  failed_delivery: 'Delivery failed',
  cancelled: 'Cancelled',
  out_for_delivery: 'Out for delivery',
};

function toIso(value: unknown): string | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function toFiniteNumber(value: unknown): number | null {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
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

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function resolveStatusLabel(status: string | null) {
  if (!status) return 'Awaiting assignment';
  return STATUS_LABELS[status] ?? status;
}

function haversineMeters(
  origin: { lat: number; lng: number },
  destination: { lat: number; lng: number }
) {
  const earthRadiusMeters = 6371000;
  const dLat = ((destination.lat - origin.lat) * Math.PI) / 180;
  const dLng = ((destination.lng - origin.lng) * Math.PI) / 180;
  const originLat = (origin.lat * Math.PI) / 180;
  const destinationLat = (destination.lat * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLng / 2) * Math.sin(dLng / 2) * Math.cos(originLat) * Math.cos(destinationLat);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusMeters * c;
}

function buildSubscriptionPath(storeId: string, orderId: string) {
  return `${ORDER_TRACKING_RTDB_ROOT}/${storeId}/${orderId}`;
}

function normalizeLocationSnapshot(value: unknown) {
  if (!value || typeof value !== 'object') return null;
  const raw = value as Record<string, unknown>;
  const lat = toFiniteNumber(raw.lat);
  const lng = toFiniteNumber(raw.lng);
  if (lat == null || lng == null) {
    return null;
  }

  const updatedAt = toIso(raw.updatedAt);
  const ageMs = updatedAt ? Date.now() - new Date(updatedAt).getTime() : null;

  return {
    riderId: typeof raw.riderId === 'string' ? raw.riderId : null,
    storeId: typeof raw.storeId === 'string' ? raw.storeId : null,
    branchId: typeof raw.branchId === 'string' ? raw.branchId : null,
    orderId: typeof raw.orderId === 'string' ? raw.orderId : null,
    tripId: typeof raw.tripId === 'string' ? raw.tripId : null,
    lat,
    lng,
    accuracy: toFiniteNumber(raw.accuracy),
    heading: toFiniteNumber(raw.heading),
    speed: toFiniteNumber(raw.speed),
    updatedAt,
    presenceStatus: typeof raw.presenceStatus === 'string' ? raw.presenceStatus : null,
    appState: typeof raw.appState === 'string' ? raw.appState : null,
    ageMs,
    isStale: ageMs == null ? true : ageMs > LOCATION_STALE_MS,
  };
}

function resolveEtaConfig(status: string | null) {
  switch (status) {
    case 'assigned':
      return { pickupBufferMinutes: 12, fallbackSpeedKph: 20, basis: 'assigned_route' };
    case 'accepted':
      return { pickupBufferMinutes: 8, fallbackSpeedKph: 21, basis: 'accepted_route' };
    case 'arrived_pickup':
      return { pickupBufferMinutes: 5, fallbackSpeedKph: 21, basis: 'pickup_buffer' };
    case 'picked_up':
      return { pickupBufferMinutes: 2, fallbackSpeedKph: 24, basis: 'pickup_departure' };
    case 'on_the_way':
      return { pickupBufferMinutes: 0, fallbackSpeedKph: 26, basis: 'live_dropoff_route' };
    case 'arrived_dropoff':
      return { pickupBufferMinutes: 1, fallbackSpeedKph: 8, basis: 'last_meter' };
    default:
      return { pickupBufferMinutes: 0, fallbackSpeedKph: 22, basis: 'fallback' };
  }
}

function computeEta(input: {
  status: string | null;
  latestLocation: ReturnType<typeof normalizeLocationSnapshot>;
  pickup: { lat: number | null; lng: number | null };
  dropoff: { lat: number | null; lng: number | null };
  previousEtaMinutes?: number | null;
}) {
  if (input.status === 'delivered') {
    return {
      etaMinutes: 0,
      etaUpdatedAt: new Date().toISOString(),
      confidence: 'final',
      stale: false,
      distanceKm: 0,
      basis: 'delivered',
    };
  }

  if (input.status === 'rejected' || input.status === 'failed_delivery' || input.status === 'cancelled') {
    return {
      etaMinutes: null,
      etaUpdatedAt: new Date().toISOString(),
      confidence: 'final',
      stale: true,
      distanceKm: null,
      basis: 'final_without_eta',
    };
  }

  if (input.dropoff.lat == null || input.dropoff.lng == null) {
    return {
      etaMinutes: null,
      etaUpdatedAt: new Date().toISOString(),
      confidence: 'unavailable',
      stale: true,
      distanceKm: null,
      basis: 'missing_dropoff_coordinates',
    };
  }

  const config = resolveEtaConfig(input.status);
  const liveOrigin =
    input.latestLocation && !input.latestLocation.isStale
      ? { lat: input.latestLocation.lat, lng: input.latestLocation.lng }
      : null;
  const pickupOrigin =
    input.pickup.lat != null && input.pickup.lng != null
      ? { lat: input.pickup.lat, lng: input.pickup.lng }
      : null;
  const origin =
    liveOrigin ??
    ((input.status === 'assigned' || input.status === 'accepted' || input.status === 'arrived_pickup') ? pickupOrigin : null) ??
    pickupOrigin;

  if (!origin) {
    return {
      etaMinutes: null,
      etaUpdatedAt: new Date().toISOString(),
      confidence: 'unavailable',
      stale: true,
      distanceKm: null,
      basis: 'missing_origin_coordinates',
    };
  }

  const dropoff = {
    lat: input.dropoff.lat as number,
    lng: input.dropoff.lng as number,
  };
  const distanceKm = (haversineMeters(origin, dropoff) * ROAD_FACTOR) / 1000;
  const trustedSpeedKph =
    input.latestLocation &&
    !input.latestLocation.isStale &&
    input.latestLocation.speed != null &&
    input.latestLocation.speed >= 1.5 &&
    input.latestLocation.speed <= 25
      ? clamp(input.latestLocation.speed * 3.6, 10, 55)
      : null;

  const rawMinutes = Math.round(
    ((distanceKm / Math.max(trustedSpeedKph ?? config.fallbackSpeedKph, 1)) * 60) + config.pickupBufferMinutes
  );
  const boundedMinutes = clamp(rawMinutes, ETA_MIN_MINUTES, ETA_MAX_MINUTES);
  const previousEta = toFiniteNumber(input.previousEtaMinutes);
  const etaMinutes =
    previousEta == null
      ? boundedMinutes
      : Math.round(clamp((previousEta * 0.4) + (boundedMinutes * 0.6), ETA_MIN_MINUTES, ETA_MAX_MINUTES));

  return {
    etaMinutes,
    etaUpdatedAt: new Date().toISOString(),
    confidence: trustedSpeedKph != null ? 'high' : liveOrigin ? 'medium' : 'low',
    stale: input.latestLocation?.isStale ?? true,
    distanceKm: Number(distanceKm.toFixed(2)),
    basis: config.basis,
  };
}

function buildTimeline(
  deliveryEvents: DeliveryOrderEvent[],
  orderStatusEvents: OrderStatusEvent[],
  shipmentEvents: TrackingEvent[],
  currentStatus: string | null
): TimelineEvent[] {
  let events: TimelineEvent[] = [];

  if (deliveryEvents.length) {
    events = deliveryEvents.map((event) => {
      const status =
        typeof event.statusAfter === 'string'
          ? event.statusAfter
          : typeof event.statusBefore === 'string'
            ? event.statusBefore
            : null;
      const reason = typeof event.reason === 'string' ? event.reason : null;
      return {
        id: event.id,
        status,
        title: resolveStatusLabel(status ?? event.type),
        description: reason,
        reason,
        location: null,
        timestamp: toIso(event.createdAt),
        actorType: event.actorType ?? null,
        actorId: event.actorId ?? null,
        isCurrent: false,
        isCompleted: false,
      };
    });
  } else if (shipmentEvents.length) {
    events = shipmentEvents.map((event) => ({
      id: event.id,
      status: null,
      title: event.message ?? 'Tracking update',
      description: null,
      reason: null,
      location: event.location ?? null,
      timestamp: toIso(event.createdAt),
      actorType: 'system',
      actorId: null,
      isCurrent: false,
      isCompleted: false,
    }));
  } else {
    events = orderStatusEvents.map((event) => ({
      id: event.id,
      status: event.status ?? null,
      title: resolveStatusLabel(event.status ?? null),
      description: event.note ?? null,
      reason: null,
      location: null,
      timestamp: toIso(event.createdAt),
      actorType: 'system',
      actorId: event.createdByUid ?? null,
      isCurrent: false,
      isCompleted: false,
    }));
  }

  if (!events.length && currentStatus) {
    events = [{
      id: `status-${currentStatus}`,
      status: currentStatus,
      title: resolveStatusLabel(currentStatus),
      description: null,
      reason: null,
      location: null,
      timestamp: null,
      actorType: 'system',
      actorId: null,
      isCurrent: true,
      isCompleted: false,
    }];
  }

  const currentIndex = currentStatus
    ? events.findIndex((event) => event.status === currentStatus)
    : -1;
  const effectiveCurrentIndex = currentIndex >= 0 ? currentIndex : Math.max(events.length - 1, 0);

  return events.map((event, index) => ({
    ...event,
    isCurrent: index === effectiveCurrentIndex,
    isCompleted: index < effectiveCurrentIndex,
  }));
}

function resolveLastUpdatedAt(order: Order, locationUpdatedAt: string | null, timeline: TimelineEvent[]) {
  const candidates = [
    toIso(order.updatedAt),
    locationUpdatedAt,
    ...timeline.map((event) => event.timestamp).filter(Boolean) as string[],
  ].filter(Boolean) as string[];

  return candidates.sort().slice(-1)[0] ?? toIso(order.updatedAt);
}

export async function buildCustomerOrderTrackingView(
  db: DataSource,
  order: Order,
  previousSnapshot?: Record<string, any> | null
) {
  const shipment = await db.getRepository(Shipment).findOneBy({ orderId: order.id });
  const [rider, branch, store, deliveryEvents, orderStatusEvents, shipmentEvents] = await Promise.all([
    order.riderId
      ? db.getRepository(DeliveryRider).findOneBy({ id: order.riderId, storeId: order.storeId })
      : Promise.resolve(null),
    order.branchId
      ? db.getRepository(Branch).findOneBy({ id: order.branchId, storeId: order.storeId })
      : Promise.resolve(null),
    db.getRepository(Store).findOneBy({ id: order.storeId }),
    db.getRepository(DeliveryOrderEvent).find({
      where: { orderId: order.id },
      order: { createdAt: 'ASC' as any },
    }),
    db.getRepository(OrderStatusEvent).find({
      where: { orderId: order.id },
      order: { createdAt: 'ASC' as any },
    }),
    shipment
      ? db.getRepository(TrackingEvent).find({
          where: { shipmentId: shipment.id },
          order: { createdAt: 'ASC' as any },
        })
      : Promise.resolve([] as TrackingEvent[]),
  ]);

  const deliveryStatus = resolveCurrentDeliveryStatus(order);
  const canonicalStatus = canonicalOrderStatus(order.status, order.paymentStatus);
  const effectiveStatus = deliveryStatus ?? canonicalStatus;
  const latestLocation = normalizeLocationSnapshot(parseJson(order.latestRiderLocationSnapshotJson, null));
  const pickup = {
    label: branch?.name ?? store?.name ?? 'Store pickup',
    addressLine: branch?.name ?? store?.name ?? 'Store pickup location',
    lat: toFiniteNumber(branch?.locationLat),
    lng: toFiniteNumber(branch?.locationLng),
  };
  const dropoff = {
    label: order.shippingAddressLabel ?? order.shippingRecipientName ?? 'Dropoff',
    addressLine: order.shippingAddressLine ?? 'Address unavailable',
    lat: toFiniteNumber(order.shippingLat),
    lng: toFiniteNumber(order.shippingLng),
  };
  const eta = computeEta({
    status: deliveryStatus,
    latestLocation,
    pickup,
    dropoff,
    previousEtaMinutes: previousSnapshot?.eta?.etaMinutes ?? null,
  });
  const timeline = buildTimeline(deliveryEvents, orderStatusEvents, shipmentEvents, effectiveStatus);
  const lastUpdatedAt = resolveLastUpdatedAt(order, latestLocation?.updatedAt ?? null, timeline);

  return {
    orderId: order.id,
    storeId: order.storeId,
    customerUid: order.uid,
    tripId: order.tripId ?? null,
    status: effectiveStatus,
    deliveryStatus,
    canonicalOrderStatus: canonicalStatus,
    statusLabel: resolveStatusLabel(effectiveStatus),
    statusReason: order.statusReason ?? null,
    assigned: !!order.riderId,
    lastUpdatedAt,
    rider: rider ? {
      riderId: rider.id,
      displayName: rider.displayName ?? 'Rider',
      phone: rider.phone ?? null,
      vehicleType: rider.vehicleType ?? null,
      presenceStatus: rider.presenceStatus ?? null,
    } : null,
    pickup,
    dropoff,
    latestRiderLocationSnapshot: latestLocation,
    trackingFreshness: {
      locationUpdatedAt: latestLocation?.updatedAt ?? null,
      isLocationStale: latestLocation?.isStale ?? true,
      locationAgeMs: latestLocation?.ageMs ?? null,
    },
    eta,
    timeline,
    shipment: shipment ? {
      id: shipment.id,
      status: shipment.status,
      carrier: shipment.carrier ?? null,
      trackingNumber: shipment.trackingNumber ?? null,
    } : null,
    customer: {
      name: order.shippingRecipientName ?? null,
      phone: order.shippingPhone ?? null,
    },
    store: {
      id: store?.id ?? order.storeId,
      name: store?.name ?? null,
    },
    subscription: {
      provider: 'rtdb',
      path: buildSubscriptionPath(order.storeId, order.id),
      fallbackPollIntervalMs: 30000,
    },
  };
}

export async function syncCustomerOrderTrackingSnapshot(
  db: DataSource,
  orderInput: string | Order
) {
  const order = typeof orderInput === 'string'
    ? await db.getRepository(Order).findOneBy({ id: orderInput })
    : orderInput;
  if (!order) {
    return null;
  }

  const previousSnapshot = await readOrderTrackingSnapshot(order.storeId, order.id).catch(() => null);
  const snapshot = await buildCustomerOrderTrackingView(db, order, previousSnapshot);
  await publishOrderTrackingSnapshot(order.storeId, order.id, snapshot);
  return snapshot;
}
