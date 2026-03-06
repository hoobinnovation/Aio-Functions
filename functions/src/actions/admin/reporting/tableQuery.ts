import { AppError } from '../../../core/errors';

export const MAX_FETCH_ALL = 10000;

export interface TableRange { from: string; to: string; }
export interface TableSort { by: string; dir: 'asc' | 'desc'; }
export interface TableQuery {
  storeId: string;
  range: TableRange;
  filters: Record<string, unknown>;
  sort: TableSort;
  page: number;
  pageSize: number;
  fetchAll: boolean;
  groupBy: string[] | null;
  columns: string[] | null;
  flags: Record<string, unknown>;
}

export function normalizeRange(range: TableRange) {
  const from = new Date(range.from);
  const to = new Date(range.to);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || from > to) {
    throw new AppError('VALIDATION_FAILED', 'Invalid range');
  }
  return { from: from.toISOString(), to: to.toISOString() };
}

export function normalizeTableQuery(payload: any, defaults: { sortBy: string; sortDir: 'asc' | 'desc'; pageSize: number }): TableQuery {
  const range = normalizeRange(payload.range);
  const fetchAll = Boolean(payload.fetchAll);
  return {
    storeId: String(payload.storeId),
    range,
    filters: (payload.filters ?? {}) as Record<string, unknown>,
    sort: { by: payload.sort?.by ?? defaults.sortBy, dir: payload.sort?.dir === 'asc' ? 'asc' : (payload.sort?.dir === 'desc' ? 'desc' : defaults.sortDir) },
    page: fetchAll ? 1 : Math.max(1, Number(payload.page ?? 1)),
    pageSize: fetchAll ? MAX_FETCH_ALL : Math.max(1, Number(payload.pageSize ?? defaults.pageSize)),
    fetchAll,
    groupBy: Array.isArray(payload.groupBy) ? payload.groupBy : null,
    columns: Array.isArray(payload.columns) ? payload.columns : null,
    flags: (payload.flags ?? {}) as Record<string, unknown>,
  };
}

export function sanitizeSort(sort: TableSort, allowedSortFields: string[], defaultSort: TableSort): TableSort {
  return {
    by: allowedSortFields.includes(sort.by) ? sort.by : defaultSort.by,
    dir: sort.dir === 'asc' || sort.dir === 'desc' ? sort.dir : defaultSort.dir,
  };
}

export function sanitizeGroupBy(groupBy: string[] | null, allowedGroupFields: string[]): string[] {
  if (!groupBy || !groupBy.length) return [];
  const invalid = groupBy.filter((g) => !allowedGroupFields.includes(g));
  if (invalid.length) throw new AppError('VALIDATION_FAILED', 'Invalid groupBy fields', { invalid });
  return groupBy;
}

export function sanitizeColumns(columns: string[] | null, allowedColumns: string[]): string[] | null {
  if (!columns || !columns.length) return null;
  const invalid = columns.filter((c) => !allowedColumns.includes(c));
  if (invalid.length) throw new AppError('VALIDATION_FAILED', 'Invalid columns', { invalid });
  return columns;
}

export async function applyPaginationOrFetchAll(arg1: any, query: TableQuery) {
  if (typeof arg1 === 'number') {
    const total = arg1;
    if (query.fetchAll) {
      if (total > MAX_FETCH_ALL) throw new AppError('FETCH_ALL_LIMIT_EXCEEDED', 'Fetch all limit exceeded', { limit: MAX_FETCH_ALL, total });
      return { limit: MAX_FETCH_ALL, offset: 0, pageInfo: { page: 1, pageSize: total, total } };
    }
    return { limit: query.pageSize, offset: (query.page - 1) * query.pageSize, pageInfo: { page: query.page, pageSize: query.pageSize, total } };
  }
  const qb = arg1;
  const total = await qb.getCount();
  if (query.fetchAll) {
    if (total > MAX_FETCH_ALL) throw new AppError('FETCH_ALL_LIMIT_EXCEEDED', 'Fetch all limit exceeded', { limit: MAX_FETCH_ALL, total });
    qb.take(MAX_FETCH_ALL).skip(0);
    return { page: 1, pageSize: total, total };
  }
  qb.take(query.pageSize).skip((query.page - 1) * query.pageSize);
  return { page: query.page, pageSize: query.pageSize, total };
}

export function applySort(qb: any, query: TableQuery, allowedSortFields: Record<string, string>, defaultSort: { by: string; dir: 'asc' | 'desc' }) {
  const sort = sanitizeSort(query.sort, Object.keys(allowedSortFields), defaultSort);
  qb.orderBy(allowedSortFields[sort.by], sort.dir);
}

export async function applyGroupBySummary(qbBase: any, query: TableQuery, allowedGroupFields: Record<string, string>) {
  const groups = sanitizeGroupBy(query.groupBy, Object.keys(allowedGroupFields));
  if (!groups.length) return undefined;
  const expr = groups.map((g) => allowedGroupFields[g]).join(", '|', ");
  const rows = await qbBase.clone().select(`CONCAT(${expr})`, 'groupKey').addSelect('COUNT(*)', 'count').groupBy(groups.map((g) => allowedGroupFields[g]).join(', ')).getRawMany();
  return { by: groups, groups: rows.map((r: any) => ({ key: String(r.groupKey), count: Number(r.count) })) };
}

export function buildPageInfo(page: number, pageSize: number, total: number) {
  return { page, pageSize, total };
}

export function pickColumns<T extends Record<string, unknown>>(items: T[], columnsWhitelist: string[], requestedColumns: string[] | null) {
  const cols = sanitizeColumns(requestedColumns, columnsWhitelist);
  if (!cols) return items;
  return items.map((item) => {
    const out: Record<string, unknown> = {};
    for (const c of cols) out[c] = item[c];
    return out;
  });
}

export async function buildGroupedSummary(
  db: { query: (sql: string, params: unknown[]) => Promise<any[]> },
  query: TableQuery,
  allowedGroupFields: string[],
  groupExprMap: Record<string, string>,
  baseFromWhereSql: string,
  params: unknown[],
) {
  const groups = sanitizeGroupBy(query.groupBy, allowedGroupFields);
  if (!groups.length) return undefined;
  const expr = groups.map((g) => groupExprMap[g]).join(",'|',");
  const rows = await db.query(`SELECT CONCAT(${expr}) key, COUNT(*) count ${baseFromWhereSql} GROUP BY ${groups.map((g) => groupExprMap[g]).join(', ')}`, params);
  return { by: groups, groups: rows.map((r: any) => ({ key: String(r.key), count: Number(r.count) })) };
}
