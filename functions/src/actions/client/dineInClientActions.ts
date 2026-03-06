import { EntityManager } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { ActionContext } from '../../core/protocol';
import { AppError } from '../../core/errors';
import { Branch } from '../../entities/Branch';
import { DineInSession } from '../../entities/DineInSession';
import { DineInTable } from '../../entities/DineInTable';
import { DineInWaiterCall } from '../../entities/DineInWaiterCall';
import { Order } from '../../entities/Order';
import { enforceGeoIfRequired, newSessionExpiry, parseAndVerifyQrCode, requireActiveSession, resolveEffectiveDineInSettings, createSessionToken } from './dineInSupport';

export async function dineInScanTableCode(ctx: ActionContext, payload: any) {
  const parsed = parseAndVerifyQrCode(payload.qrCode);
  if (parsed.storeId !== ctx.storeId) throw new AppError('DINE_IN_QR_INVALID', 'QR is for another store');

  const branch = await ctx.db.getRepository(Branch).findOneBy({ id: parsed.branchId, storeId: ctx.storeId! });
  if (!branch) throw new AppError('DINE_IN_BRANCH_NOT_FOUND', 'Branch not found');
  if (branch.status !== 'active') throw new AppError('DINE_IN_BRANCH_NOT_ELIGIBLE', 'Branch is not active');

  const settings = await resolveEffectiveDineInSettings(ctx, branch);
  if (!settings.enabled) throw new AppError('DINE_IN_DISABLED', 'Dine-in is disabled');
  if (!settings.secureTableModeEnabled) throw new AppError('DINE_IN_SECURE_TABLE_MODE_DISABLED', 'Secure table mode is disabled');

  const table = await ctx.db.getRepository(DineInTable).findOneBy({ id: parsed.tableId, branchId: branch.id, storeId: ctx.storeId! });
  if (!table) throw new AppError('DINE_IN_TABLE_NOT_FOUND', 'Table not found');
  if (table.status !== 'active') throw new AppError('DINE_IN_TABLE_NOT_ACTIVE', 'Table is not active');

  enforceGeoIfRequired(branch, settings, payload.geo);

  const expiresAt = newSessionExpiry(settings.sessionTtlMinutes);
  const verifiedAt = new Date();
  const sessionToken = createSessionToken();
  const sessionId = uuidv4();

  await ctx.db.transaction(async (tx: EntityManager) => {
    await tx.getRepository(DineInSession).insert({
      id: sessionId,
      storeId: ctx.storeId!,
      branchId: branch.id,
      tableId: table.id,
      tableNumberSnapshot: table.tableNumber,
      customerUid: ctx.uid!,
      sessionToken,
      sourceMode: payload.sourceMode,
      verifiedBy: 'cloud',
      verificationMethod: settings.verificationMethod,
      verifiedAt,
      expiresAt,
      lastSeenAt: verifiedAt,
      status: 'active',
    });
  });

  return {
    sessionId,
    sessionToken,
    branchId: branch.id,
    tableId: table.id,
    tableNumber: table.tableNumber,
    expiresAt,
    verificationMethod: settings.verificationMethod,
  };
}

export async function dineInGetSession(ctx: ActionContext, payload: any) {
  const session = await requireActiveSession(ctx, payload.sessionToken);
  if (session.customerUid && session.customerUid !== ctx.uid) throw new AppError('FORBIDDEN', 'Session belongs to another customer');
  await ctx.db.getRepository(DineInSession).update({ id: session.id }, { lastSeenAt: new Date() });
  return { session: await ctx.db.getRepository(DineInSession).findOneByOrFail({ id: session.id }) };
}

export async function dineInCloseSession(ctx: ActionContext, payload: any) {
  const session = await requireActiveSession(ctx, payload.sessionToken);
  if (session.customerUid && session.customerUid !== ctx.uid) throw new AppError('FORBIDDEN', 'Session belongs to another customer');

  const branch = await ctx.db.getRepository(Branch).findOneByOrFail({ id: session.branchId, storeId: ctx.storeId! });
  const settings = await resolveEffectiveDineInSettings(ctx, branch);
  if (!settings.allowCustomerSessionClose) throw new AppError('DINE_IN_SESSION_CLOSE_NOT_ALLOWED', 'Session close is not allowed');

  await ctx.db.getRepository(DineInSession).update({ id: session.id }, { status: 'closed', lastSeenAt: new Date() });
  return { closed: true, sessionId: session.id };
}

async function createWaiterCall(ctx: ActionContext, payload: any, callType: 'callWaiter'|'requestBill'|'needHelp'|'cleanup') {
  const session = await requireActiveSession(ctx, payload.sessionToken);
  if (session.customerUid && session.customerUid !== ctx.uid) throw new AppError('FORBIDDEN', 'Session belongs to another customer');

  const branch = await ctx.db.getRepository(Branch).findOneByOrFail({ id: session.branchId, storeId: ctx.storeId! });
  const settings = await resolveEffectiveDineInSettings(ctx, branch);
  if (settings.requireSessionForWaiterCall && !session) throw new AppError('DINE_IN_SESSION_REQUIRED', 'Active session is required');

  let orderId: string | null = null;
  if (payload.orderId) {
    const order = await ctx.db.getRepository(Order).findOneBy({ id: payload.orderId, uid: ctx.uid!, storeId: ctx.storeId!, branchId: session.branchId });
    if (!order) throw new AppError('NOT_FOUND', 'Order not found for waiter call');
    orderId = order.id;
  }

  const id = uuidv4();
  await ctx.db.getRepository(DineInWaiterCall).insert({
    id,
    storeId: ctx.storeId!,
    branchId: session.branchId,
    tableId: session.tableId,
    sessionId: session.id,
    orderId,
    customerUid: ctx.uid!,
    callType,
    note: payload.note ?? null,
    status: 'open',
    resolvedAt: null,
    resolvedByAdminUid: null,
  });
  return { waiterCall: await ctx.db.getRepository(DineInWaiterCall).findOneByOrFail({ id }) };
}

export async function dineInCallWaiter(ctx: ActionContext, payload: any) {
  return createWaiterCall(ctx, payload, payload.callType);
}

export async function dineInRequestBill(ctx: ActionContext, payload: any) {
  return createWaiterCall(ctx, payload, 'requestBill');
}
