import { v4 as uuidv4 } from 'uuid';
import { ActionContext } from '../../core/protocol';
import { AppError } from '../../core/errors';
import { StoreSettings } from '../../entities/StoreSettings';
import { DineInTable } from '../../entities/DineInTable';
import { Branch } from '../../entities/Branch';
import { buildTableQrCode, getDefaultDineInSettings } from '../client/dineInSupport';
import { DineInSession } from '../../entities/DineInSession';
import { DineInWaiterCall } from '../../entities/DineInWaiterCall';
import { Order } from '../../entities/Order';
import { OrderReview } from '../../entities/OrderReview';
import { normalizeDateInput, normalizeListQueryInput } from '../../utils/queryNormalization';

async function getSettingsRow(ctx: ActionContext) {
  let row = await ctx.db.getRepository(StoreSettings).findOneBy({ storeId: ctx.storeId! });
  if (!row) {
    row = ctx.db.getRepository(StoreSettings).create({ storeId: ctx.storeId!, currency: 'USD', taxMode: 'exclusive', supportWhatsApp: null, supportEmail: null, pickupEnabled: true, deliveryEnabled: true, dineInConfigJson: null, featureVisibilityJson: null });
    await ctx.db.getRepository(StoreSettings).save(row);
  }
  return row;
}

export async function adminDineInSettingsGet(ctx: ActionContext) {
  const row = await getSettingsRow(ctx);
  const defaults = getDefaultDineInSettings();
  const parsed = row.dineInConfigJson ? JSON.parse(row.dineInConfigJson) : { dineIn: defaults };
  return { settings: { ...defaults, ...(parsed.dineIn || {}) } };
}

export async function adminDineInSettingsUpdate(ctx: ActionContext, payload: any) {
  const row = await getSettingsRow(ctx);
  const defaults = getDefaultDineInSettings();
  const next = { ...defaults, ...payload };
  await ctx.db.getRepository(StoreSettings).update({ storeId: ctx.storeId! }, { dineInConfigJson: JSON.stringify({ dineIn: next }) });
  return adminDineInSettingsGet(ctx);
}

export async function adminDineInTablesList(ctx: ActionContext, payload: any = {}) {
  const q = normalizeListQueryInput(payload, { defaultPageSize: 50, maxPageSize: 200 });
  const where: any = { storeId: ctx.storeId! };
  if (payload.branchId) where.branchId = payload.branchId;
  return { tables: await ctx.db.getRepository(DineInTable).find({ where, order: { createdAt: 'DESC' as any }, take: q.limit, skip: q.offset }) };
}

export async function adminDineInTablesGet(ctx: ActionContext, payload: any) {
  const table = await ctx.db.getRepository(DineInTable).findOneBy({ id: payload.tableId, storeId: ctx.storeId! });
  if (!table) throw new AppError('NOT_FOUND', 'Dine-in table not found');
  return { table };
}

export async function adminDineInTablesCreate(ctx: ActionContext, payload: any) {
  const branch = await ctx.db.getRepository(Branch).findOneBy({ id: payload.branchId, storeId: ctx.storeId! });
  if (!branch) throw new AppError('DINE_IN_BRANCH_NOT_FOUND', 'Branch not found');
  const id = uuidv4();
  await ctx.db.getRepository(DineInTable).insert({ id, storeId: ctx.storeId!, branchId: payload.branchId, code: payload.code, tableNumber: payload.tableNumber, name: payload.name || null, seatsCount: payload.seatsCount, status: 'active', qrVersion: 1, qrPayload: '', qrSignature: '', lastQrIssuedAt: null });
  return adminDineInTablesGet(ctx, { tableId: id });
}

export async function adminDineInTablesUpdate(ctx: ActionContext, payload: any) {
  await ctx.db.getRepository(DineInTable).update({ id: payload.tableId, storeId: ctx.storeId! }, { tableNumber: payload.tableNumber, name: payload.name || null, seatsCount: payload.seatsCount, status: payload.status });
  return adminDineInTablesGet(ctx, { tableId: payload.tableId });
}

export async function adminDineInTablesDisable(ctx: ActionContext, payload: any) {
  await ctx.db.getRepository(DineInTable).update({ id: payload.tableId, storeId: ctx.storeId! }, { status: 'disabled' });
  return adminDineInTablesGet(ctx, { tableId: payload.tableId });
}

async function generateQr(ctx: ActionContext, tableId: string, bump = false) {
  const table = await ctx.db.getRepository(DineInTable).findOneBy({ id: tableId, storeId: ctx.storeId! });
  if (!table) throw new AppError('DINE_IN_TABLE_NOT_FOUND', 'Table not found');
  const qr = buildTableQrCode(ctx.storeId!, table.branchId, { ...table, qrVersion: bump ? table.qrVersion + 1 : table.qrVersion });
  await ctx.db.getRepository(DineInTable).update({ id: table.id }, { qrVersion: bump ? table.qrVersion + 1 : table.qrVersion, qrPayload: qr.payload, qrSignature: qr.signature, lastQrIssuedAt: new Date() });
  return { qrCode: qr.qrCode, tableNumber: table.tableNumber, tableName: table.name, branchId: table.branchId, tableId: table.id, issuedAt: new Date().toISOString() };
}

export async function adminDineInTablesGenerateQr(ctx: ActionContext, payload: any) { return generateQr(ctx, payload.tableId, false); }
export async function adminDineInTablesRegenerateQr(ctx: ActionContext, payload: any) { return generateQr(ctx, payload.tableId, true); }

export async function adminDineInTablesBulkGeneratePdfData(ctx: ActionContext, payload: any) {
  const branch = await ctx.db.getRepository(Branch).findOneBy({ id: payload.branchId, storeId: ctx.storeId! });
  if (!branch) throw new AppError('DINE_IN_BRANCH_NOT_FOUND', 'Branch not found');

  const where: any = { storeId: ctx.storeId!, branchId: payload.branchId };
  const tables = await ctx.db.getRepository(DineInTable).find({ where, order: { tableNumber: 'ASC' as any } });
  const selected = payload.tableIds?.length ? tables.filter((t: DineInTable) => payload.tableIds.includes(t.id)) : tables.filter((t: DineInTable) => t.status === 'active' || t.status === 'maintenance');
  const cards = selected.map((table: DineInTable) => ({ tableId: table.id, tableNumber: table.tableNumber, name: table.name, seatsCount: table.seatsCount, branchId: table.branchId, qrCode: buildTableQrCode(ctx.storeId!, table.branchId, table).qrCode, printableCaption: `Table ${table.tableNumber}${table.name ? ` - ${table.name}` : ''}` }));
  return { store: { storeId: ctx.storeId! }, branch, generatedAt: new Date().toISOString(), cards };
}

export async function adminDineInSessionsList(ctx: ActionContext, payload: any = {}) {
  const q = normalizeListQueryInput(payload, { defaultPageSize: 50, maxPageSize: 200 });
  const where: any = { storeId: ctx.storeId! };
  if (payload.branchId) where.branchId = payload.branchId;
  if (payload.status) where.status = payload.status;
  return { sessions: await ctx.db.getRepository(DineInSession).find({ where, order: { createdAt: 'DESC' as any }, take: q.limit, skip: q.offset }) };
}

export async function adminDineInSessionsGet(ctx: ActionContext, payload: any) {
  const session = await ctx.db.getRepository(DineInSession).findOneBy({ id: payload.sessionId, storeId: ctx.storeId! });
  if (!session) throw new AppError('DINE_IN_SESSION_NOT_FOUND', 'Session not found');
  return { session };
}

export async function adminDineInSessionsClose(ctx: ActionContext, payload: any) {
  await ctx.db.getRepository(DineInSession).update({ id: payload.sessionId, storeId: ctx.storeId! }, { status: 'closed', lastSeenAt: new Date() });
  return adminDineInSessionsGet(ctx, payload);
}

export async function adminDineInWaiterCallsList(ctx: ActionContext, payload: any = {}) {
  const q = normalizeListQueryInput(payload, { defaultPageSize: 50, maxPageSize: 200 });
  const where: any = { storeId: ctx.storeId! };
  if (payload.branchId) where.branchId = payload.branchId;
  if (payload.status) where.status = payload.status;
  return { waiterCalls: await ctx.db.getRepository(DineInWaiterCall).find({ where, order: { createdAt: 'DESC' as any }, take: q.limit, skip: q.offset }) };
}

export async function adminDineInWaiterCallsGet(ctx: ActionContext, payload: any) {
  const waiterCall = await ctx.db.getRepository(DineInWaiterCall).findOneBy({ id: payload.waiterCallId, storeId: ctx.storeId! });
  if (!waiterCall) throw new AppError('NOT_FOUND', 'Waiter call not found');
  return { waiterCall };
}

export async function adminDineInWaiterCallsAcknowledge(ctx: ActionContext, payload: any) {
  await ctx.db.getRepository(DineInWaiterCall).update({ id: payload.waiterCallId, storeId: ctx.storeId! }, { status: 'acknowledged' });
  return adminDineInWaiterCallsGet(ctx, payload);
}

export async function adminDineInWaiterCallsResolve(ctx: ActionContext, payload: any) {
  await ctx.db.getRepository(DineInWaiterCall).update({ id: payload.waiterCallId, storeId: ctx.storeId! }, { status: 'resolved', resolvedAt: new Date(), resolvedByAdminUid: ctx.uid! });
  return adminDineInWaiterCallsGet(ctx, payload);
}

export async function adminDineInDashboardStats(ctx: ActionContext, payload: any) {
  const normalizedDate = normalizeDateInput(payload, { defaultDaysBack: 7, requireCompleteRange: true });
  const dateFrom = normalizedDate.from!;
  const dateTo = normalizedDate.to!;
  const branchFilterSql = payload.branchId ? ' AND branchId = ? ' : '';
  const params = payload.branchId ? [ctx.storeId!, payload.branchId] : [ctx.storeId!];
  const [tableRow] = await ctx.db.query(`SELECT COUNT(*) totalTables, SUM(CASE WHEN status='active' THEN 1 ELSE 0 END) activeTables, SUM(CASE WHEN status='disabled' THEN 1 ELSE 0 END) disabledTables, SUM(CASE WHEN status='maintenance' THEN 1 ELSE 0 END) maintenanceTables FROM dine_in_tables WHERE storeId=?${branchFilterSql}`, params);
  const [sessionsActiveRow] = await ctx.db.query(`SELECT COUNT(*) sessionsActiveNow FROM dine_in_sessions WHERE storeId=?${branchFilterSql} AND status='active' AND expiresAt>NOW()`, params);
  const [sessionsStartedRow] = await ctx.db.query(`SELECT COUNT(*) sessionsStartedInRange FROM dine_in_sessions WHERE storeId=?${branchFilterSql} AND createdAt BETWEEN ? AND ?`, [...params, dateFrom, dateTo]);
  const [waiterOpenRow] = await ctx.db.query(`SELECT COUNT(*) waiterCallsOpenNow FROM dine_in_waiter_calls WHERE storeId=?${branchFilterSql} AND status IN ('open','acknowledged')`, params);
  const [waiterResolvedRow] = await ctx.db.query(`SELECT COUNT(*) waiterCallsResolvedInRange, SUM(CASE WHEN callType='requestBill' THEN 1 ELSE 0 END) billRequestsInRange FROM dine_in_waiter_calls WHERE storeId=?${branchFilterSql} AND status='resolved' AND updatedAt BETWEEN ? AND ?`, [...params, dateFrom, dateTo]);
  const [ordersRow] = await ctx.db.query(`SELECT COUNT(*) dineInOrdersInRange, COALESCE(SUM(totalCents),0) dineInRevenueInRange FROM orders WHERE storeId=?${branchFilterSql} AND serviceType='dineIn' AND createdAt BETWEEN ? AND ?`, [...params, dateFrom, dateTo]);
  const [reviewsRow] = await ctx.db.query(`SELECT COUNT(*) dineInReviewsInRange, COALESCE(AVG(rating),0) dineInAverageRatingInRange FROM order_reviews WHERE storeId=?${branchFilterSql} AND createdAt BETWEEN ? AND ?`, [...params, dateFrom, dateTo]);

  const topBranchesBySessions = await ctx.db.query(`SELECT branchId, COUNT(*) value FROM dine_in_sessions WHERE storeId=? AND createdAt BETWEEN ? AND ? GROUP BY branchId ORDER BY value DESC LIMIT 5`, [ctx.storeId!, dateFrom, dateTo]);
  const topBranchesByWaiterCalls = await ctx.db.query(`SELECT branchId, COUNT(*) value FROM dine_in_waiter_calls WHERE storeId=? AND createdAt BETWEEN ? AND ? GROUP BY branchId ORDER BY value DESC LIMIT 5`, [ctx.storeId!, dateFrom, dateTo]);
  const topBranchesByDineInOrders = await ctx.db.query(`SELECT branchId, COUNT(*) value FROM orders WHERE storeId=? AND serviceType='dineIn' AND createdAt BETWEEN ? AND ? GROUP BY branchId ORDER BY value DESC LIMIT 5`, [ctx.storeId!, dateFrom, dateTo]);

  return { ...tableRow, ...sessionsActiveRow, ...sessionsStartedRow, ...waiterOpenRow, ...waiterResolvedRow, ...ordersRow, ...reviewsRow, topBranchesBySessions, topBranchesByWaiterCalls, topBranchesByDineInOrders };
}
