import { AppError } from '../errors';

export const DELIVERY_PRESENCE_STATUSES = ['offline', 'online', 'driving'] as const;
export type DeliveryPresenceStatus = (typeof DELIVERY_PRESENCE_STATUSES)[number];

export const DELIVERY_ORDER_STATUSES = [
  'assigned',
  'accepted',
  'arrived_pickup',
  'picked_up',
  'on_the_way',
  'arrived_dropoff',
  'delivered',
  'rejected',
  'failed_delivery',
  'cancelled',
] as const;
export type DeliveryOrderStatus = (typeof DELIVERY_ORDER_STATUSES)[number];

export const DELIVERY_ACTIVE_ORDER_STATUSES: readonly DeliveryOrderStatus[] = [
  'assigned',
  'accepted',
  'arrived_pickup',
  'picked_up',
  'on_the_way',
  'arrived_dropoff',
];

export const DELIVERY_HISTORY_ORDER_STATUSES: readonly DeliveryOrderStatus[] = [
  'delivered',
  'rejected',
  'failed_delivery',
  'cancelled',
];

export type DeliveryActionId =
  | 'accept'
  | 'reject'
  | 'arrivedPickup'
  | 'pickedUp'
  | 'setOnTheWay'
  | 'arrivedDropoff'
  | 'delivered'
  | 'failedDelivery';

export const DELIVERY_ACTION_TO_STATUS: Record<DeliveryActionId, DeliveryOrderStatus> = {
  accept: 'accepted',
  reject: 'rejected',
  arrivedPickup: 'arrived_pickup',
  pickedUp: 'picked_up',
  setOnTheWay: 'on_the_way',
  arrivedDropoff: 'arrived_dropoff',
  delivered: 'delivered',
  failedDelivery: 'failed_delivery',
};

export const DELIVERY_ACTION_LABELS: Record<DeliveryActionId, string> = {
  accept: 'Accept order',
  reject: 'Reject order',
  arrivedPickup: 'Arrived at pickup',
  pickedUp: 'Picked up',
  setOnTheWay: 'On the way',
  arrivedDropoff: 'Arrived at dropoff',
  delivered: 'Delivered',
  failedDelivery: 'Failed delivery',
};

export const DELIVERY_LEGAL_ACTIONS: Record<DeliveryOrderStatus, readonly DeliveryActionId[]> = {
  assigned: ['accept', 'reject'],
  accepted: ['arrivedPickup', 'failedDelivery'],
  arrived_pickup: ['pickedUp', 'failedDelivery'],
  picked_up: ['setOnTheWay', 'failedDelivery'],
  on_the_way: ['arrivedDropoff', 'failedDelivery'],
  arrived_dropoff: ['delivered', 'failedDelivery'],
  delivered: [],
  rejected: [],
  failed_delivery: [],
  cancelled: [],
};

function normalizeToken(value: unknown): string {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/-+/g, '_');
}

export function normalizeDeliveryPresenceStatus(
  value: unknown,
  fallback: DeliveryPresenceStatus = 'offline'
): DeliveryPresenceStatus {
  const normalized = normalizeToken(value);
  if (normalized === 'online' || normalized === 'driving' || normalized === 'offline') {
    return normalized;
  }
  return fallback;
}

export function normalizeDeliveryOrderStatus(value: unknown): DeliveryOrderStatus | null {
  const normalized = normalizeToken(value);
  switch (normalized) {
    case 'assigned':
    case 'accepted':
    case 'arrived_pickup':
    case 'picked_up':
    case 'on_the_way':
    case 'arrived_dropoff':
    case 'delivered':
    case 'rejected':
    case 'failed_delivery':
    case 'cancelled':
      return normalized;
    case 'out_for_delivery':
    case 'active':
    case 'shipped':
    case 'in_transit':
      return 'on_the_way';
    case 'completed':
    case 'fulfilled':
      return 'delivered';
    case 'failed':
      return 'failed_delivery';
    case 'canceled':
      return 'cancelled';
    default:
      return null;
  }
}

export function resolveCurrentDeliveryStatus(input: {
  deliveryStatus?: unknown;
  status?: unknown;
}): DeliveryOrderStatus | null {
  return normalizeDeliveryOrderStatus(input.deliveryStatus) ?? normalizeDeliveryOrderStatus(input.status);
}

export function isDeliveryFinalStatus(status: DeliveryOrderStatus | null | undefined): boolean {
  return !!status && DELIVERY_HISTORY_ORDER_STATUSES.includes(status);
}

export function getAllowedDeliveryActions(status: DeliveryOrderStatus | null | undefined): readonly DeliveryActionId[] {
  if (!status) return [];
  return DELIVERY_LEGAL_ACTIONS[status] ?? [];
}

export function resolveNextDeliveryStatus(
  currentStatus: DeliveryOrderStatus | null | undefined,
  actionId: DeliveryActionId,
  reason?: string | null
): DeliveryOrderStatus {
  if (!currentStatus) {
    throw new AppError('DELIVERY_STATUS_INVALID', 'Order is missing a canonical delivery status');
  }

  const allowed = getAllowedDeliveryActions(currentStatus);
  if (!allowed.includes(actionId)) {
    throw new AppError('DELIVERY_ILLEGAL_TRANSITION', 'Requested rider action is not legal for current delivery status', {
      currentStatus,
      actionId,
      allowedActions: allowed,
    });
  }

  const trimmedReason = typeof reason === 'string' ? reason.trim() : '';
  if ((actionId === 'reject' || actionId === 'failedDelivery') && !trimmedReason) {
    throw new AppError('DELIVERY_REASON_REQUIRED', 'A reason is required for this delivery action');
  }

  return DELIVERY_ACTION_TO_STATUS[actionId];
}

export function coercePresenceStatus(
  requested: DeliveryPresenceStatus,
  hasActiveTrip: boolean
): DeliveryPresenceStatus {
  if (requested === 'offline') {
    return 'offline';
  }
  return hasActiveTrip ? 'driving' : requested;
}

export function mapDeliveryStatusToShipmentStatus(status: DeliveryOrderStatus | null | undefined): string {
  switch (status) {
    case 'assigned':
    case 'accepted':
    case 'arrived_pickup':
      return 'assigned';
    case 'picked_up':
    case 'on_the_way':
    case 'arrived_dropoff':
      return 'in_transit';
    case 'delivered':
      return 'delivered';
    case 'rejected':
      return 'rejected';
    case 'failed_delivery':
      return 'failed_delivery';
    case 'cancelled':
      return 'cancelled';
    default:
      return 'pending';
  }
}

export function mapDeliveryStatusToOrderStatus(status: DeliveryOrderStatus): string {
  return status;
}
