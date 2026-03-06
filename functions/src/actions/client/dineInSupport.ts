import { createHmac, timingSafeEqual } from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { ActionContext } from '../../core/protocol';
import { AppError } from '../../core/errors';
import { Branch } from '../../entities/Branch';
import { DineInSession } from '../../entities/DineInSession';
import { DineInTable } from '../../entities/DineInTable';
import { StoreSettings } from '../../entities/StoreSettings';

const QR_SECRET = process.env.DINE_IN_QR_SECRET || 'dine-in-default-secret';

export type DineInSettings = {
  enabled: boolean;
  secureTableModeEnabled: boolean;
  verificationMethod: 'qrOnly' | 'qrPlusGeo';
  sessionTtlMinutes: number;
  requireSessionForOrder: boolean;
  requireSessionForWaiterCall: boolean;
  requireSessionForRating: boolean;
  requireSessionForBillRequest: boolean;
  allowCustomerSessionClose: boolean;
};

export function getDefaultDineInSettings(): DineInSettings {
  return {
    enabled: false,
    secureTableModeEnabled: false,
    verificationMethod: 'qrOnly',
    sessionTtlMinutes: 180,
    requireSessionForOrder: true,
    requireSessionForWaiterCall: true,
    requireSessionForRating: true,
    requireSessionForBillRequest: true,
    allowCustomerSessionClose: true,
  };
}

export async function resolveEffectiveDineInSettings(ctx: ActionContext, branch: Branch): Promise<DineInSettings> {
  const settings = await ctx.db.getRepository(StoreSettings).findOneBy({ storeId: ctx.storeId! });
  let parsed = getDefaultDineInSettings();
  if (settings?.dineInConfigJson) {
    const raw = JSON.parse(settings.dineInConfigJson) as { dineIn?: Partial<DineInSettings> };
    parsed = { ...parsed, ...(raw.dineIn || {}) };
  }

  if (branch.dineInEnabled) parsed.enabled = true;
  if (branch.dineInSecureTableModeEnabled) parsed.secureTableModeEnabled = true;
  if (branch.dineInVerificationMethod) parsed.verificationMethod = branch.dineInVerificationMethod;
  if (branch.dineInGeoRadiusMeters) parsed.sessionTtlMinutes = Math.max(1, parsed.sessionTtlMinutes);
  return parsed;
}

export function buildTableQrCode(storeId: string, branchId: string, table: DineInTable, issuedAtMs: number = Date.now()): { qrCode: string; payload: string; signature: string } {
  const payloadObj = { v: table.qrVersion || 1, storeId, branchId, tableId: table.id, tableNumber: table.tableNumber, issuedAt: issuedAtMs };
  const payload = JSON.stringify(payloadObj);
  const payloadB64 = Buffer.from(payload).toString('base64url');
  const signature = createHmac('sha256', QR_SECRET).update(payloadB64).digest('hex');
  return { qrCode: `tpv1.${payloadB64}.${signature}`, payload, signature };
}

export function parseAndVerifyQrCode(qrCode: string): { storeId: string; branchId: string; tableId: string; tableNumber: string } {
  const parts = qrCode.split('.');
  if (parts.length !== 3 || parts[0] !== 'tpv1') {
    throw new AppError('DINE_IN_QR_INVALID', 'Invalid QR code format');
  }
  const payloadB64 = parts[1];
  const signature = parts[2];
  const expectedSig = createHmac('sha256', QR_SECRET).update(payloadB64).digest('hex');
  if (!timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSig))) {
    throw new AppError('DINE_IN_QR_SIGNATURE_INVALID', 'QR signature invalid');
  }
  const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8')) as { storeId: string; branchId: string; tableId: string; tableNumber: string };
  return payload;
}

function distanceMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRad = (d: number) => d * (Math.PI / 180);
  const R = 6371000;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

export function enforceGeoIfRequired(branch: Branch, settings: DineInSettings, geo?: { lat: number; lng: number }) {
  if (settings.verificationMethod !== 'qrPlusGeo') return;
  if (!geo) throw new AppError('DINE_IN_GEO_REQUIRED', 'Geo verification required');
  if (branch.locationLat === null || branch.locationLng === null) throw new AppError('DINE_IN_BRANCH_NOT_ELIGIBLE', 'Branch geo is not configured');
  const dist = distanceMeters(Number(branch.locationLat), Number(branch.locationLng), geo.lat, geo.lng);
  if (dist > branch.dineInGeoRadiusMeters) throw new AppError('DINE_IN_GEO_OUT_OF_RANGE', 'User is out of dine-in geo range');
}

export async function requireActiveSession(ctx: ActionContext, sessionToken: string): Promise<DineInSession> {
  const session = await ctx.db.getRepository(DineInSession).findOneBy({ sessionToken, storeId: ctx.storeId! });
  if (!session) throw new AppError('DINE_IN_SESSION_NOT_FOUND', 'Dine-in session not found');
  if (session.status === 'closed') throw new AppError('DINE_IN_SESSION_CLOSED', 'Dine-in session already closed');
  if (new Date(session.expiresAt).getTime() < Date.now()) throw new AppError('DINE_IN_SESSION_EXPIRED', 'Dine-in session expired');
  return session;
}

export function newSessionExpiry(minutes: number): Date {
  return new Date(Date.now() + minutes * 60 * 1000);
}

export function createSessionToken(): string {
  return `dins_${uuidv4().replace(/-/g, '')}`;
}
