type NullableStatus = string | null | undefined;

export type CanonicalPaymentStatus =
  | 'pending'
  | 'processing'
  | 'paid'
  | 'failed'
  | 'cancelled'
  | 'expired'
  | 'refunded';

export type CanonicalOrderStatus =
  | 'pending_payment'
  | 'pending'
  | 'confirmed'
  | 'preparing'
  | 'ready'
  | 'out_for_delivery'
  | 'delivered'
  | 'cancelled'
  | 'rejected';

function normalizeToken(value: NullableStatus): string {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/-+/g, '_');
}

export function canonicalPaymentStatus(status: NullableStatus): CanonicalPaymentStatus {
  const normalized = normalizeToken(status);

  if (['paid', 'captured', 'completed', 'success', 'confirmed'].includes(normalized)) return 'paid';
  if (['processing', 'authorized', 'authorised', 'requires_action'].includes(normalized)) return 'processing';
  if (['failed', 'declined', 'error'].includes(normalized)) return 'failed';
  if (['cancelled', 'canceled'].includes(normalized)) return 'cancelled';
  if (normalized === 'expired') return 'expired';
  if (normalized === 'refunded') return 'refunded';
  return 'pending';
}

export function canonicalOrderStatus(status: NullableStatus, paymentStatus?: NullableStatus): CanonicalOrderStatus {
  const normalized = normalizeToken(status);

  if (normalized === 'pending_payment' || normalized === 'payment_failed' || normalized === 'failed') return 'pending_payment';
  if (normalized === 'pending') return 'pending';
  if (['placed', 'paid', 'accepted', 'approved', 'confirmed'].includes(normalized)) return 'confirmed';
  if (['processing', 'preparing'].includes(normalized)) return 'preparing';
  if (normalized === 'ready') return 'ready';
  if (['assigned', 'accepted', 'arrived_pickup', 'picked_up', 'picked-up', 'shipped', 'active', 'in_transit', 'on_the_way', 'on-the-way', 'arrived_dropoff', 'out_for_delivery'].includes(normalized)) {
    return 'out_for_delivery';
  }
  if (['fulfilled', 'completed', 'delivered'].includes(normalized)) return 'delivered';
  if (normalized === 'failed_delivery') return 'cancelled';
  if (['cancelled', 'canceled', 'refunded'].includes(normalized)) return 'cancelled';
  if (normalized === 'rejected') return 'rejected';

  return canonicalPaymentStatus(paymentStatus) === 'paid' ? 'confirmed' : 'pending_payment';
}

export function isOperationalOrderStatus(status: NullableStatus, paymentStatus?: NullableStatus): boolean {
  return canonicalOrderStatus(status, paymentStatus) !== 'pending_payment';
}

export function toOrderReadModel<T extends { status?: NullableStatus; paymentStatus?: NullableStatus }>(order: T): T & {
  rawStatus: NullableStatus;
  rawPaymentStatus: NullableStatus;
  canonicalStatus: CanonicalOrderStatus;
  canonicalPaymentStatus: CanonicalPaymentStatus;
} {
  const normalizedStatus = canonicalOrderStatus(order?.status, order?.paymentStatus);
  const normalizedPaymentStatus = canonicalPaymentStatus(order?.paymentStatus);

  return {
    ...order,
    rawStatus: order?.status ?? null,
    rawPaymentStatus: order?.paymentStatus ?? null,
    status: normalizedStatus,
    paymentStatus: normalizedPaymentStatus,
    canonicalStatus: normalizedStatus,
    canonicalPaymentStatus: normalizedPaymentStatus,
  };
}

export function buildCanonicalOrderStatusSql(alias = 'o'): string {
  const field = `LOWER(REPLACE(REPLACE(COALESCE(${alias}.status, ''), '-', '_'), ' ', '_'))`;
  return `CASE
    WHEN ${field} IN ('pending_payment', 'payment_failed', 'failed') THEN 'pending_payment'
    WHEN ${field} = 'pending' THEN 'pending'
    WHEN ${field} IN ('placed', 'paid', 'accepted', 'approved', 'confirmed') THEN 'confirmed'
    WHEN ${field} IN ('processing', 'preparing') THEN 'preparing'
    WHEN ${field} = 'ready' THEN 'ready'
    WHEN ${field} IN ('assigned', 'accepted', 'arrived_pickup', 'picked_up', 'shipped', 'active', 'in_transit', 'on_the_way', 'arrived_dropoff', 'out_for_delivery') THEN 'out_for_delivery'
    WHEN ${field} IN ('fulfilled', 'completed', 'delivered') THEN 'delivered'
    WHEN ${field} = 'failed_delivery' THEN 'cancelled'
    WHEN ${field} IN ('cancelled', 'canceled', 'refunded') THEN 'cancelled'
    WHEN ${field} = 'rejected' THEN 'rejected'
    WHEN LOWER(REPLACE(REPLACE(COALESCE(${alias}.paymentStatus, ''), '-', '_'), ' ', '_')) IN ('paid', 'captured', 'completed', 'success', 'confirmed') THEN 'confirmed'
    ELSE 'pending_payment'
  END`;
}

export function buildOperationalOrderWhereSql(alias = 'o'): string {
  return `${buildCanonicalOrderStatusSql(alias)} <> 'pending_payment'`;
}
