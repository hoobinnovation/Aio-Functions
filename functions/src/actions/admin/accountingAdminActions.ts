import { EntityManager } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { ActionContext } from '../../core/protocol';
import { AppError } from '../../core/errors';
import { normalizeTableQuery, pickColumns, applyPaginationOrFetchAll, sanitizeSort, sanitizeGroupBy } from './reporting/tableQuery';
import { AccountingAccount } from '../../entities/AccountingAccount';
import { AccountingJournalEntry } from '../../entities/AccountingJournalEntry';
import { AccountingJournalEntryLine } from '../../entities/AccountingJournalEntryLine';
import { AccountingPeriod } from '../../entities/AccountingPeriod';
import { AccountingPostingRule } from '../../entities/AccountingPostingRule';
import { DrawerSession } from '../../entities/DrawerSession';

type LedgerFilters = {
  channel?: string;
  branchId?: string;
  deviceId?: string;
  employeeId?: string;
  type?: string;
  referenceId?: string;
};

function resolveStoreId(ctx: ActionContext, payload: any) {
  const storeId = payload?.storeId ?? ctx.storeId;
  if (!storeId) throw new AppError('VALIDATION_FAILED', 'storeId is required');
  return String(storeId);
}

function toCents(value: any) {
  const parsed = Number(value || 0);
  if (!Number.isFinite(parsed)) return 0;
  return Math.round(parsed * 100);
}

function normalSideForType(type: string) {
  const normalized = String(type || '').toLowerCase();
  return ['asset', 'expense', 'cogs'].includes(normalized) ? 'debit' : 'credit';
}

function mapAccount(account: AccountingAccount, parentMap: Map<string, AccountingAccount>) {
  const parent = account.parentId ? parentMap.get(account.parentId) || null : null;
  return {
    ...account,
    active: Boolean(account.isActive),
    parentName: parent ? `${parent.code} - ${parent.name}` : '',
  };
}

function mapPeriod(period: AccountingPeriod) {
  return {
    ...period,
    name: period.periodCode,
  };
}

function mapPostingRule(rule: AccountingPostingRule, accountMap: Map<string, AccountingAccount>) {
  const config = (rule.configJson && typeof rule.configJson === 'object') ? rule.configJson as Record<string, any> : {};
  const debitAccountId = typeof config.debitAccountId === 'string' ? config.debitAccountId : null;
  const creditAccountId = typeof config.creditAccountId === 'string' ? config.creditAccountId : null;
  const debitAccount = debitAccountId ? accountMap.get(debitAccountId) || null : null;
  const creditAccount = creditAccountId ? accountMap.get(creditAccountId) || null : null;
  return {
    ...rule,
    name: rule.ruleKey,
    eventType: rule.eventKey,
    sourceType: rule.documentType,
    active: Boolean(rule.isActive),
    debitAccountId,
    creditAccountId,
    debitAccountName: debitAccount ? `${debitAccount.code} - ${debitAccount.name}` : '',
    creditAccountName: creditAccount ? `${creditAccount.code} - ${creditAccount.name}` : '',
  };
}

function mapDrawerSession(session: DrawerSession) {
  const opening = Number(session.openingBalanceCents || 0);
  const closing = session.closingBalanceCents != null ? Number(session.closingBalanceCents) : null;
  return {
    ...session,
    openingBalance: opening / 100,
    closingBalance: closing != null ? closing / 100 : null,
    status: session.closedAt ? 'closed' : 'open',
    overShortCents: closing != null ? closing - opening : null,
  };
}

async function loadJournalLines(ctx: ActionContext, entryIds: string[]) {
  if (!entryIds.length) return new Map<string, AccountingJournalEntryLine[]>();
  const lines = await ctx.db.getRepository(AccountingJournalEntryLine).find({
    where: entryIds.map((entryId) => ({ entryId })) as any,
    order: { lineNo: 'ASC' as any },
  });
  const map = new Map<string, AccountingJournalEntryLine[]>();
  for (const line of lines) {
    const bucket = map.get(line.entryId) || [];
    bucket.push(line);
    map.set(line.entryId, bucket);
  }
  return map;
}

async function mapJournalEntries(ctx: ActionContext, entries: AccountingJournalEntry[]) {
  const entryIds = entries.map((entry) => entry.id);
  const linesByEntryId = await loadJournalLines(ctx, entryIds);
  const accountIds = Array.from(new Set(entries.flatMap((entry) => (linesByEntryId.get(entry.id) || []).map((line) => line.accountId))));
  const accounts = accountIds.length ? await ctx.db.getRepository(AccountingAccount).findByIds(accountIds) : [];
  const accountMap = new Map<string, AccountingAccount>(accounts.map((account: AccountingAccount) => [account.id, account]));

  return entries.map((entry) => {
    const lines = (linesByEntryId.get(entry.id) || []).map((line) => {
      const account = accountMap.get(line.accountId) || null;
      return {
        ...line,
        debit: Number(line.debitCents || 0) / 100,
        credit: Number(line.creditCents || 0) / 100,
        accountName: account ? `${account.code} - ${account.name}` : line.accountId,
      };
    });
    const postingStatus = entry.status === 'draft' ? 'pending' : entry.status;
    return {
      ...entry,
      reference: entry.id,
      postingDate: entry.entryDate,
      sourceType: entry.documentType,
      sourceId: entry.documentId,
      postingStatus,
      postingError: entry.sourceContext && typeof entry.sourceContext === 'object' ? (entry.sourceContext as any).postingError || null : null,
      lines,
    };
  });
}

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

export async function adminDrawerSessionsList(ctx: ActionContext, payload: any = {}) {
  const storeId = resolveStoreId(ctx, payload);
  const sessions = await ctx.db.query(
    `SELECT ds.* FROM drawer_sessions ds
     JOIN drawers d ON d.id = ds.drawerId
     WHERE d.storeId=?
     ORDER BY ds.openedAt DESC
     LIMIT ?`,
    [storeId, Number(payload.limit || 100)],
  );
  return { items: sessions.map((session: DrawerSession) => mapDrawerSession(session as any)) };
}

export async function adminDrawerSessionsGet(ctx: ActionContext, payload: any) {
  const sessionId = String(payload.sessionId || payload.id || '');
  if (!sessionId) throw new AppError('VALIDATION_FAILED', 'sessionId is required');
  const session = await ctx.db.getRepository(DrawerSession).findOneBy({ id: sessionId });
  if (!session) throw new AppError('NOT_FOUND', 'Drawer session not found');
  return { session: mapDrawerSession(session) };
}

export async function adminDrawerReconciliationsList(ctx: ActionContext, payload: any = {}) {
  const storeId = resolveStoreId(ctx, payload);
  const rows = await ctx.db.query(
    `SELECT ds.* FROM drawer_sessions ds
     JOIN drawers d ON d.id = ds.drawerId
     WHERE d.storeId=? AND ds.closedAt IS NOT NULL
     ORDER BY ds.closedAt DESC
     LIMIT ?`,
    [storeId, Number(payload.limit || 100)],
  );
  return {
    items: rows.map((row: DrawerSession) => {
      const mapped = mapDrawerSession(row as any);
      return {
        ...mapped,
        differenceCents: mapped.overShortCents,
      };
    }),
  };
}

export async function adminChartOfAccountsList(ctx: ActionContext, payload: any = {}) {
  const storeId = resolveStoreId(ctx, payload);
  const accounts = await ctx.db.getRepository(AccountingAccount).find({
    where: [{ storeId }, { storeId: null }] as any,
    order: { code: 'ASC' as any },
  });
  const accountMap = new Map<string, AccountingAccount>(accounts.map((account: AccountingAccount) => [account.id, account]));
  return { items: accounts.map((account: AccountingAccount) => mapAccount(account, accountMap)) };
}

export async function adminChartOfAccountsCreate(ctx: ActionContext, payload: any) {
  const storeId = payload.storeId ?? resolveStoreId(ctx, payload);
  const id = uuidv4();
  const account = ctx.db.getRepository(AccountingAccount).create({
    id,
    storeId: storeId || null,
    parentId: payload.parentId || null,
    code: String(payload.code || '').trim(),
    name: String(payload.name || '').trim(),
    type: payload.type,
    normalSide: payload.normalSide || normalSideForType(payload.type),
    isActive: payload.active !== false,
    allowPosting: payload.allowPosting !== false,
    isSystem: false,
  });
  await ctx.db.getRepository(AccountingAccount).save(account);
  return adminChartOfAccountsList(ctx, { storeId });
}

export async function adminChartOfAccountsUpdate(ctx: ActionContext, payload: any) {
  const id = String(payload.id || '');
  if (!id) throw new AppError('VALIDATION_FAILED', 'id is required');
  const existing = await ctx.db.getRepository(AccountingAccount).findOneBy({ id });
  if (!existing) throw new AppError('NOT_FOUND', 'Accounting account not found');
  await ctx.db.getRepository(AccountingAccount).update({ id }, {
    parentId: payload.parentId ?? existing.parentId,
    code: payload.code ?? existing.code,
    name: payload.name ?? existing.name,
    type: payload.type ?? existing.type,
    normalSide: payload.normalSide ?? normalSideForType(payload.type ?? existing.type),
    isActive: payload.active !== undefined ? Boolean(payload.active) : existing.isActive,
    allowPosting: payload.allowPosting !== undefined ? Boolean(payload.allowPosting) : existing.allowPosting,
  });
  return adminChartOfAccountsList(ctx, { storeId: existing.storeId ?? payload.storeId ?? ctx.storeId });
}

export async function adminChartOfAccountsSetActive(ctx: ActionContext, payload: any) {
  return adminChartOfAccountsUpdate(ctx, { ...payload, active: payload.active });
}

export async function adminJournalEntriesList(ctx: ActionContext, payload: any = {}) {
  const storeId = resolveStoreId(ctx, payload);
  const where: any[] = [{ storeId }];
  if (payload.sourceType) where.push({ storeId, documentType: payload.sourceType });
  if (payload.sourceId) where.push({ storeId, documentId: payload.sourceId });
  const entries = await ctx.db.getRepository(AccountingJournalEntry).find({
    where: where.length === 1 ? where[0] as any : where as any,
    order: { createdAt: 'DESC' as any },
    take: Number(payload.limit || 200),
  });
  let mapped = await mapJournalEntries(ctx, entries);
  if (payload.postingStatus) mapped = mapped.filter((entry) => String(entry.postingStatus) === String(payload.postingStatus));
  if (payload.sourceType) mapped = mapped.filter((entry) => String(entry.sourceType || '') === String(payload.sourceType));
  if (payload.sourceId) mapped = mapped.filter((entry) => String(entry.sourceId || '') === String(payload.sourceId));
  return { items: mapped };
}

export async function adminJournalEntriesGet(ctx: ActionContext, payload: any) {
  const id = String(payload.id || '');
  if (!id) throw new AppError('VALIDATION_FAILED', 'id is required');
  const entry = await ctx.db.getRepository(AccountingJournalEntry).findOneBy({ id });
  if (!entry) throw new AppError('NOT_FOUND', 'Journal entry not found');
  const mapped = await mapJournalEntries(ctx, [entry]);
  return { entry: mapped[0] || null };
}

export async function adminJournalEntriesCreate(ctx: ActionContext, payload: any) {
  const storeId = resolveStoreId(ctx, payload);
  const lines = Array.isArray(payload.lines) ? payload.lines : [];
  if (lines.length < 2) throw new AppError('VALIDATION_FAILED', 'At least two lines are required');
  const totalDebit = lines.reduce((sum: number, line: any) => sum + toCents(line.debit), 0);
  const totalCredit = lines.reduce((sum: number, line: any) => sum + toCents(line.credit), 0);
  if (totalDebit <= 0 || totalCredit <= 0 || totalDebit !== totalCredit) {
    throw new AppError('VALIDATION_FAILED', 'Journal entry lines must be balanced');
  }

  const id = uuidv4();
  await ctx.db.transaction(async (tx: EntityManager) => {
    await tx.getRepository(AccountingJournalEntry).save(tx.getRepository(AccountingJournalEntry).create({
      id,
      storeId,
      periodId: payload.periodId || null,
      entryDate: payload.postingDate,
      status: 'draft',
      documentType: payload.sourceType || null,
      documentId: payload.sourceId || null,
      sourceContext: { postingStatus: 'pending' },
      memo: payload.memo || null,
      createdByUid: ctx.uid ?? null,
    }));
    for (let index = 0; index < lines.length; index += 1) {
      const line = lines[index];
      await tx.getRepository(AccountingJournalEntryLine).save(tx.getRepository(AccountingJournalEntryLine).create({
        id: uuidv4(),
        entryId: id,
        accountId: line.accountId,
        lineNo: index + 1,
        description: line.description || null,
        debitCents: String(toCents(line.debit)),
        creditCents: String(toCents(line.credit)),
        currencyCode: payload.currencyCode || 'EGP',
        branchId: payload.branchId || null,
      }));
    }
  });
  return adminJournalEntriesGet(ctx, { id });
}

export async function adminJournalEntriesPost(ctx: ActionContext, payload: any) {
  const id = String(payload.id || '');
  const entry = await ctx.db.getRepository(AccountingJournalEntry).findOneBy({ id });
  if (!entry) throw new AppError('NOT_FOUND', 'Journal entry not found');
  await ctx.db.getRepository(AccountingJournalEntry).update({ id }, {
    status: 'posted',
    postedAt: new Date(),
    postedByUid: ctx.uid ?? null,
    sourceContext: { ...(entry.sourceContext || {}), postingStatus: 'posted', postingError: null },
  });
  return adminJournalEntriesGet(ctx, { id });
}

export async function adminJournalEntriesReverse(ctx: ActionContext, payload: any) {
  const id = String(payload.id || '');
  const entry = await ctx.db.getRepository(AccountingJournalEntry).findOneBy({ id });
  if (!entry) throw new AppError('NOT_FOUND', 'Journal entry not found');
  await ctx.db.getRepository(AccountingJournalEntry).update({ id }, {
    status: 'reversed',
    reversedAt: new Date(),
    reversedByUid: ctx.uid ?? null,
    sourceContext: { ...(entry.sourceContext || {}), postingStatus: 'reversed' },
  });
  return adminJournalEntriesGet(ctx, { id });
}

export async function adminJournalEntriesRetry(ctx: ActionContext, payload: any) {
  const id = String(payload.id || '');
  await ctx.db.getRepository(AccountingJournalEntry).update({ id }, {
    sourceContext: { postingStatus: 'pending', postingError: null },
  });
  return adminJournalEntriesPost(ctx, { id });
}

export async function adminAccountingPeriodsList(ctx: ActionContext, payload: any = {}) {
  const storeId = resolveStoreId(ctx, payload);
  const periods = await ctx.db.getRepository(AccountingPeriod).find({
    where: { storeId } as any,
    order: { startDate: 'DESC' as any },
  });
  return { items: periods.map(mapPeriod) };
}

export async function adminAccountingPeriodsCreate(ctx: ActionContext, payload: any) {
  const storeId = resolveStoreId(ctx, payload);
  const startDate = String(payload.startDate || '');
  const id = uuidv4();
  const start = new Date(startDate);
  await ctx.db.getRepository(AccountingPeriod).save(ctx.db.getRepository(AccountingPeriod).create({
    id,
    storeId,
    fiscalYear: Number.isFinite(start.getUTCFullYear()) ? start.getUTCFullYear() : new Date().getUTCFullYear(),
    periodCode: payload.name || startDate.slice(0, 7),
    startDate,
    endDate: String(payload.endDate || ''),
    status: payload.status || 'open',
    closedAt: payload.status === 'closed' ? new Date() : null,
    closedByUid: payload.status === 'closed' ? (ctx.uid ?? null) : null,
  }));
  return adminAccountingPeriodsList(ctx, { storeId });
}

export async function adminAccountingPeriodsUpdate(ctx: ActionContext, payload: any) {
  const id = String(payload.id || '');
  const existing = await ctx.db.getRepository(AccountingPeriod).findOneBy({ id });
  if (!existing) throw new AppError('NOT_FOUND', 'Accounting period not found');
  await ctx.db.getRepository(AccountingPeriod).update({ id }, {
    periodCode: payload.name ?? existing.periodCode,
    startDate: payload.startDate ?? existing.startDate,
    endDate: payload.endDate ?? existing.endDate,
    status: payload.status ?? existing.status,
    closedAt: (payload.status ?? existing.status) === 'closed' ? (existing.closedAt || new Date()) : null,
    closedByUid: (payload.status ?? existing.status) === 'closed' ? (existing.closedByUid || ctx.uid || null) : null,
  });
  return adminAccountingPeriodsList(ctx, { storeId: existing.storeId ?? payload.storeId ?? ctx.storeId });
}

export async function adminAccountingPeriodsSetStatus(ctx: ActionContext, payload: any) {
  return adminAccountingPeriodsUpdate(ctx, payload);
}

export async function adminAccountingPeriodsOpen(ctx: ActionContext, payload: any) {
  return adminAccountingPeriodsSetStatus(ctx, { ...payload, status: 'open' });
}

export async function adminAccountingPeriodsClose(ctx: ActionContext, payload: any) {
  return adminAccountingPeriodsSetStatus(ctx, { ...payload, status: 'closed' });
}

export async function adminPostingRulesList(ctx: ActionContext, payload: any = {}) {
  const storeId = resolveStoreId(ctx, payload);
  const rules = await ctx.db.getRepository(AccountingPostingRule).find({
    where: { storeId } as any,
    order: { priority: 'ASC' as any, createdAt: 'DESC' as any },
  });
  const accountRows = await ctx.db.getRepository(AccountingAccount).find({ where: [{ storeId }, { storeId: null }] as any });
  const accountMap = new Map<string, AccountingAccount>(accountRows.map((account: AccountingAccount) => [account.id, account]));
  return { items: rules.map((rule: AccountingPostingRule) => mapPostingRule(rule, accountMap)) };
}

export async function adminPostingRulesCreate(ctx: ActionContext, payload: any) {
  const storeId = resolveStoreId(ctx, payload);
  await ctx.db.getRepository(AccountingPostingRule).save(ctx.db.getRepository(AccountingPostingRule).create({
    id: uuidv4(),
    storeId,
    ruleKey: payload.name,
    documentType: payload.sourceType,
    eventKey: payload.eventType,
    priority: Number(payload.priority || 100),
    isActive: payload.active !== false,
    configJson: {
      debitAccountId: payload.debitAccountId || null,
      creditAccountId: payload.creditAccountId || null,
    },
  }));
  return adminPostingRulesList(ctx, { storeId });
}

export async function adminPostingRulesUpdate(ctx: ActionContext, payload: any) {
  const id = String(payload.id || '');
  const existing = await ctx.db.getRepository(AccountingPostingRule).findOneBy({ id });
  if (!existing) throw new AppError('NOT_FOUND', 'Posting rule not found');
  await ctx.db.getRepository(AccountingPostingRule).update({ id }, {
    ruleKey: payload.name ?? existing.ruleKey,
    documentType: payload.sourceType ?? existing.documentType,
    eventKey: payload.eventType ?? existing.eventKey,
    priority: payload.priority ?? existing.priority,
    isActive: payload.active !== undefined ? Boolean(payload.active) : existing.isActive,
    configJson: {
      ...((existing.configJson && typeof existing.configJson === 'object') ? existing.configJson : {}),
      debitAccountId: payload.debitAccountId ?? ((existing.configJson as any)?.debitAccountId ?? null),
      creditAccountId: payload.creditAccountId ?? ((existing.configJson as any)?.creditAccountId ?? null),
    },
  });
  return adminPostingRulesList(ctx, { storeId: existing.storeId ?? payload.storeId ?? ctx.storeId });
}
