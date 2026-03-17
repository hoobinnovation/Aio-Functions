import { AppError } from '../errors';
import { RiderAuthScope } from '../protocol';
import { DeliveryPresenceStatus, normalizeDeliveryPresenceStatus } from './status';

const adminSdk = require('firebase-admin') as any;

export const RIDER_LOCATION_RTDB_ROOT = 'riderLocations';
export const RIDER_PRESENCE_RTDB_ROOT = 'riderPresence';
export const ORDER_TRACKING_RTDB_ROOT = 'orderTracking';
export const DELIVERY_HEARTBEAT_TIMEOUT_MS = 5 * 60 * 1000;
export const MAX_ACCEPTED_LOCATION_ACCURACY_METERS = 250;

export interface RiderRealtimeLocationPayload {
  riderId: string;
  storeId: string;
  branchId: string | null;
  orderId: string | null;
  tripId: string | null;
  lat: number;
  lng: number;
  accuracy: number;
  heading: number | null;
  speed: number | null;
  updatedAt: string;
  presenceStatus: DeliveryPresenceStatus;
  appState: string | null;
}

function ensureRealtimeAvailable() {
  const db = adminSdk.database?.();
  if (!db) {
    throw new AppError('DELIVERY_TRACKING_UNAVAILABLE', 'Realtime database is not configured');
  }
  return db;
}

function buildLocationPath(storeId: string, riderId: string) {
  return `${RIDER_LOCATION_RTDB_ROOT}/${storeId}/${riderId}`;
}

function buildPresencePath(storeId: string, riderId: string) {
  return `${RIDER_PRESENCE_RTDB_ROOT}/${storeId}/${riderId}`;
}

function buildOrderTrackingPath(storeId: string, orderId: string) {
  return `${ORDER_TRACKING_RTDB_ROOT}/${storeId}/${orderId}`;
}

function toFiniteNumber(value: unknown): number | null {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function validateLocationInput(payload: Record<string, unknown>) {
  const lat = toFiniteNumber(payload.lat);
  const lng = toFiniteNumber(payload.lng);
  const accuracy = toFiniteNumber(payload.accuracy);
  const heading = payload.heading == null ? null : toFiniteNumber(payload.heading);
  const speed = payload.speed == null ? null : toFiniteNumber(payload.speed);

  if (lat == null || lat < -90 || lat > 90) {
    throw new AppError('DELIVERY_LOCATION_INVALID', 'Latitude is invalid');
  }
  if (lng == null || lng < -180 || lng > 180) {
    throw new AppError('DELIVERY_LOCATION_INVALID', 'Longitude is invalid');
  }
  if (accuracy == null || accuracy < 0 || accuracy > MAX_ACCEPTED_LOCATION_ACCURACY_METERS) {
    throw new AppError('DELIVERY_LOCATION_INVALID', 'GPS accuracy is too low to publish');
  }

  return { lat, lng, accuracy, heading, speed };
}

export async function publishRiderPresenceSnapshot(input: {
  rider: RiderAuthScope;
  presenceStatus: DeliveryPresenceStatus;
  activeOrderId?: string | null;
  activeTripId?: string | null;
  appState?: string | null;
  lastSeenAt?: string;
}) {
  const db = ensureRealtimeAvailable();
  const updatedAt = input.lastSeenAt ?? new Date().toISOString();
  await db.ref(buildPresencePath(input.rider.storeId, input.rider.riderId)).update({
    riderId: input.rider.riderId,
    uid: input.rider.uid,
    storeId: input.rider.storeId,
    branchId: input.rider.branchId ?? null,
    presenceStatus: normalizeDeliveryPresenceStatus(input.presenceStatus),
    orderId: input.activeOrderId ?? input.rider.activeOrderId ?? null,
    tripId: input.activeTripId ?? input.rider.activeTripId ?? null,
    appState: input.appState ?? null,
    updatedAt,
  });
}

export async function publishRiderLocationSnapshot(payload: RiderRealtimeLocationPayload) {
  const db = ensureRealtimeAvailable();
  await db.ref(buildLocationPath(payload.storeId, payload.riderId)).set(payload);
}

export async function readRiderPresenceSnapshot(storeId: string, riderId: string) {
  const db = ensureRealtimeAvailable();
  const snapshot = await db.ref(buildPresencePath(storeId, riderId)).get();
  return snapshot.val();
}

export async function readRiderLocationSnapshot(storeId: string, riderId: string) {
  const db = ensureRealtimeAvailable();
  const snapshot = await db.ref(buildLocationPath(storeId, riderId)).get();
  return snapshot.val();
}

export async function publishOrderTrackingSnapshot(
  storeId: string,
  orderId: string,
  payload: Record<string, unknown>
) {
  const db = ensureRealtimeAvailable();
  await db.ref(buildOrderTrackingPath(storeId, orderId)).set(payload);
}

export async function readOrderTrackingSnapshot(storeId: string, orderId: string) {
  const db = ensureRealtimeAvailable();
  const snapshot = await db.ref(buildOrderTrackingPath(storeId, orderId)).get();
  return snapshot.val();
}

export async function publishRiderOfflineSnapshot(rider: RiderAuthScope) {
  const db = ensureRealtimeAvailable();
  const updatedAt = new Date().toISOString();
  await Promise.all([
    db.ref(buildPresencePath(rider.storeId, rider.riderId)).update({
      riderId: rider.riderId,
      uid: rider.uid,
      storeId: rider.storeId,
      branchId: rider.branchId ?? null,
      presenceStatus: 'offline',
      orderId: null,
      tripId: null,
      updatedAt,
    }),
    db.ref(buildLocationPath(rider.storeId, rider.riderId)).update({
      riderId: rider.riderId,
      storeId: rider.storeId,
      branchId: rider.branchId ?? null,
      orderId: null,
      tripId: null,
      presenceStatus: 'offline',
      updatedAt,
    }),
  ]);
}
