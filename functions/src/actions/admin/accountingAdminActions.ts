import { ActionContext } from '../../core/protocol';
import { AppError } from '../../core/errors';
import { normalizeTableQuery, pickColumns, applyPaginationOrFetchAll, sanitizeSort, sanitizeGroupBy } from './reporting/tableQuery';
import { buildBalanceSheet, buildCashFlowFoundation, buildGeneralLedger, buildProfitAndLoss, buildTrialBalance } from '../../core/accounting/financialStatements';
import { closeAccountingPeriod, reopenAccountingPeriod, validatePeriodClose } from '../../core/accounting/closeWorkflows';

type LedgerFilters = {
  channel?: string;
  branchId?: string;
  deviceId?: string;
  employeeId?: string;
  type?: string;
  referenceId?: string;
};

function parseLedgerGroupBy(groupBy: string[] | null | undefined): string | null {
  if (!groupBy || groupBy.length === 0) return null;
  if (groupBy.length > 1) throw new AppError('VALIDATION_FAILED', 'Only one groupBy field is supported');
  const g = groupBy[0];
  const map: Record<string, string> = {
    day: 'DATE(le.createdAt)',
    week: "DATE_FORMAT(le.createdAt, '%x-W%v')",
    month: "DATE_FORMAT(le.createdAt, '%Y-%m')",
    channel: 'COALESCE(le.channel,\'(none)\')',
    branchId: 'COALESCE(le.branchId,\'(none)\')',
    employeeId: 'COALESCE(le.employeeId,\'(none)\')',
    type: 'COALESCE(le.type,\'(none)\')',
  };
  if (!map[g]) throw new AppError('VALIDATION_FAILED', `Unsupported groupBy field: ${g}`);
  return `${map[g]} as groupKey`;
}

function buildFilters(filters: LedgerFilters) {
  const where: string[] = [];
  const params: unknown[] = [];
  if (filters.channel) { where.push('le.channel = ?'); params.push(filters.channel); }
  if (filters.branchId) { where.push('le.branchId = ?'); params.push(filters.branchId); }
  if (filters.deviceId) { where.push('le.deviceId = ?'); params.push(filters.deviceId); }
  if (filters.employeeId) { where.push('le.employeeId = ?'); params.push(filters.employeeId); }
  if (filters.type) { where.push('le.type = ?'); params.push(filters.type); }
  if (filters.referenceId) { where.push('le.refId = ?'); params.push(filters.referenceId); }
  return { where, params };
}

export async function adminAccountingKpis(ctx: ActionContext, payload: any) {
  const q = normalizeTableQuery(payload, { sortBy: 'day', sortDir: 'desc', pageSize: 50 }, { fallbackStoreId: ctx.storeId });
  const safeSort = sanitizeSort(q.sort, ['day'], { by: 'day', dir: 'desc' });
  const safeGroupBy = sanitizeGroupBy(q.groupBy, ['day', 'week', 'month', 'channel', 'branchId', 'employeeId', 'type']);
  const rangeFrom = q.range.from;
  const rangeTo = q.range.to;

  const ordersAgg = await ctx.db.query(
    `SELECT COALESCE(SUM(subtotalCents),0) grossRevenueCents, COALESCE(SUM(totalCents),0) netRevenueCents, COALESCE(SUM(discountCents),0) discountsCents, COALESCE(SUM(shippingCents),0) shippingFeesCents
     FROM orders WHERE storeId=? AND createdAt BETWEEN ? AND ?`,
    [q.storeId, rangeFrom, rangeTo],
  );
  const refundsAgg = await ctx.db.query(
    `SELECT COALESCE(SUM(ref.amountCents),0) refundsCents
     FROM refunds ref JOIN returns r ON r.id=ref.returnId
     WHERE r.storeId=? AND ref.createdAt BETWEEN ? AND ?`,
    [q.storeId, rangeFrom, rangeTo],
  );
  const ledgerAgg = await ctx.db.query(
    `SELECT
      COALESCE(SUM(CASE WHEN amountCents > 0 THEN amountCents ELSE 0 END),0) cashInCents,
      COALESCE(SUM(CASE WHEN amountCents < 0 THEN ABS(amountCents) ELSE 0 END),0) cashOutCents,
      COALESCE(SUM(CASE WHEN type='expense' THEN ABS(amountCents) ELSE 0 END),0) expensesCents,
      COALESCE(SUM(amountCents),0) netCashFlowCents
     FROM ledger_entries
     WHERE storeId=? AND createdAt BETWEEN ? AND ?`,
    [q.storeId, rangeFrom, rangeTo],
  );

  const aggregates = {
    grossRevenueCents: Number(ordersAgg[0]?.grossRevenueCents ?? 0),
    netRevenueCents: Number(ordersAgg[0]?.netRevenueCents ?? 0),
    cashInCents: Number(ledgerAgg[0]?.cashInCents ?? 0),
    cashOutCents: Number(ledgerAgg[0]?.cashOutCents ?? 0),
    refundsCents: Number(refundsAgg[0]?.refundsCents ?? 0),
    expensesCents: Number(ledgerAgg[0]?.expensesCents ?? 0),
    netCashFlowCents: Number(ledgerAgg[0]?.netCashFlowCents ?? 0),
  };

  const g = parseLedgerGroupBy(safeGroupBy) ?? "DATE(le.createdAt) as groupKey";
  const items = await ctx.db.query(
    `SELECT ${g},
            COALESCE(SUM(CASE WHEN le.amountCents > 0 THEN le.amountCents ELSE 0 END),0) cashInCents,
            COALESCE(SUM(CASE WHEN le.amountCents < 0 THEN ABS(le.amountCents) ELSE 0 END),0) cashOutCents,
            COALESCE(SUM(le.amountCents),0) netCashFlowCents
     FROM ledger_entries le
     WHERE le.storeId=? AND le.createdAt BETWEEN ? AND ?
     GROUP BY groupKey
     ORDER BY groupKey ${safeSort.dir === 'asc' ? 'ASC' : 'DESC'}
     LIMIT ? OFFSET ?`,
    [q.storeId, rangeFrom, rangeTo, q.fetchAll ? 10000 : q.pageSize, q.fetchAll ? 0 : (q.page - 1) * q.pageSize],
  );

  const totalRows = await ctx.db.query(`SELECT COUNT(*) total FROM (SELECT ${g.replace(' as groupKey','')} gk FROM ledger_entries le WHERE le.storeId=? AND le.createdAt BETWEEN ? AND ? GROUP BY gk) t`, [q.storeId, rangeFrom, rangeTo]);
  const paging = await applyPaginationOrFetchAll(Number(totalRows[0]?.total ?? 0), q);
  return {
    items,
    pageInfo: ('pageInfo' in paging ? (paging as any).pageInfo : paging),
    aggregates,
    capabilities: { canEdit: false, canDelete: false },
  };
}

export async function adminAccountingLedger(ctx: ActionContext, payload: any) {
  const q = normalizeTableQuery(payload, { sortBy: 'createdAt', sortDir: 'desc', pageSize: 100 }, { fallbackStoreId: ctx.storeId });
  const safeSort = sanitizeSort(q.sort, ['createdAt', 'debitCents', 'creditCents', 'netCents', 'type', 'channel'], { by: 'createdAt', dir: 'desc' });
  const safeGroupBy = sanitizeGroupBy(q.groupBy, ['day', 'week', 'month', 'channel', 'branchId', 'employeeId', 'type']);
  const filters = (q.filters ?? {}) as LedgerFilters;
  const { where, params } = buildFilters(filters);
  const whereSql = where.length ? ` AND ${where.join(' AND ')}` : '';
  const sortMap: Record<string, string> = {
    createdAt: 'le.createdAt',
    debitCents: 'debitCents',
    creditCents: 'creditCents',
    netCents: 'netCents',
    type: 'le.type',
    channel: 'le.channel',
  };
  const sortExpr = sortMap[safeSort.by] ?? sortMap.createdAt;

  const totalRows = await ctx.db.query(
    `SELECT COUNT(*) total FROM ledger_entries le WHERE le.storeId=? AND le.createdAt BETWEEN ? AND ? ${whereSql}`,
    [q.storeId, q.range.from, q.range.to, ...params],
  );
  const total = Number(totalRows[0]?.total ?? 0);
  if (q.fetchAll && total > 10000) throw new AppError('FETCH_ALL_LIMIT_EXCEEDED', 'Fetch all limit exceeded', { limit: 10000, total });

  const items = await ctx.db.query(
    `SELECT le.id, le.createdAt, le.type, le.refType referenceType, le.refId referenceId,
            CASE WHEN le.amountCents < 0 THEN ABS(le.amountCents) ELSE 0 END debitCents,
            CASE WHEN le.amountCents > 0 THEN le.amountCents ELSE 0 END creditCents,
            le.amountCents netCents,
            le.channel, le.branchId, le.deviceId, le.employeeId, NULL notes
     FROM ledger_entries le
     WHERE le.storeId=? AND le.createdAt BETWEEN ? AND ? ${whereSql}
     ORDER BY ${sortExpr} ${safeSort.dir === 'asc' ? 'ASC' : 'DESC'}
     LIMIT ? OFFSET ?`,
    [q.storeId, q.range.from, q.range.to, ...params, q.fetchAll ? 10000 : q.pageSize, q.fetchAll ? 0 : (q.page - 1) * q.pageSize],
  );

  const grouped = safeGroupBy.length ? await ctx.db.query(
    `SELECT ${parseLedgerGroupBy(safeGroupBy)}, COUNT(*) count
     FROM ledger_entries le
     WHERE le.storeId=? AND le.createdAt BETWEEN ? AND ? ${whereSql}
     GROUP BY groupKey ORDER BY count DESC`,
    [q.storeId, q.range.from, q.range.to, ...params],
  ) : undefined;

  const ag = await ctx.db.query(
    `SELECT COUNT(*) count,
            COALESCE(SUM(CASE WHEN le.amountCents < 0 THEN ABS(le.amountCents) ELSE 0 END),0) totalDebitCents,
            COALESCE(SUM(CASE WHEN le.amountCents > 0 THEN le.amountCents ELSE 0 END),0) totalCreditCents,
            COALESCE(SUM(le.amountCents),0) totalNetCents
     FROM ledger_entries le
     WHERE le.storeId=? AND le.createdAt BETWEEN ? AND ? ${whereSql}`,
    [q.storeId, q.range.from, q.range.to, ...params],
  );

  return {
    items: pickColumns(items, ['id', 'createdAt', 'type', 'referenceType', 'referenceId', 'debitCents', 'creditCents', 'netCents', 'channel', 'branchId', 'deviceId', 'employeeId', 'notes'], q.columns),
    pageInfo: { page: q.fetchAll ? 1 : q.page, pageSize: q.fetchAll ? total : q.pageSize, total },
    grouped: grouped ? { by: safeGroupBy, groups: grouped.map((r: any) => ({ key: String(r.groupKey), count: Number(r.count) })) } : undefined,
    aggregates: ag[0],
    capabilities: { canEdit: false, canDelete: false },
  };
}

export async function adminAccountingGeneralLedger(ctx: ActionContext, payload: any) {
  const storeId = payload?.storeId ?? ctx.storeId ?? null;
  const from = String(payload?.from ?? new Date().toISOString().slice(0, 10));
  const to = String(payload?.to ?? from);
  const items = await buildGeneralLedger(ctx.db, { storeId, from, to });
  return { items };
}

export async function adminAccountingTrialBalance(ctx: ActionContext, payload: any) {
  const storeId = payload?.storeId ?? ctx.storeId ?? null;
  const from = String(payload?.from ?? new Date().toISOString().slice(0, 10));
  const to = String(payload?.to ?? from);
  const items = await buildTrialBalance(ctx.db, { storeId, from, to });
  return { items };
}

export async function adminAccountingProfitAndLoss(ctx: ActionContext, payload: any) {
  const storeId = payload?.storeId ?? ctx.storeId ?? null;
  const from = String(payload?.from ?? new Date().toISOString().slice(0, 10));
  const to = String(payload?.to ?? from);
  const items = await buildProfitAndLoss(ctx.db, { storeId, from, to });
  return { items };
}

export async function adminAccountingBalanceSheet(ctx: ActionContext, payload: any) {
  const storeId = payload?.storeId ?? ctx.storeId ?? null;
  const to = String(payload?.to ?? new Date().toISOString().slice(0, 10));
  const items = await buildBalanceSheet(ctx.db, { storeId, from: to, to });
  return { items };
}

export async function adminAccountingCashFlowFoundation(ctx: ActionContext, payload: any) {
  const storeId = payload?.storeId ?? ctx.storeId ?? null;
  const from = String(payload?.from ?? new Date().toISOString().slice(0, 10));
  const to = String(payload?.to ?? from);
  const items = await buildCashFlowFoundation(ctx.db, { storeId, from, to });
  return { items };
}

export async function adminAccountingPeriodCloseValidate(ctx: ActionContext, payload: any) {
  const result = await validatePeriodClose(ctx.db, payload.periodId);
  return { period: result.period, draftEntries: result.draftEntries, canClose: result.draftEntries === 0 };
}

export async function adminAccountingPeriodClose(ctx: ActionContext, payload: any) {
  const period = await closeAccountingPeriod(ctx.db, payload.periodId, ctx.uid ?? null);
  return { period };
}

export async function adminAccountingPeriodReopen(ctx: ActionContext, payload: any) {
  const period = await reopenAccountingPeriod(ctx.db, payload.periodId);
  return { period };
}
