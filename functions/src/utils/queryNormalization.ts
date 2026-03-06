import { AppError } from '../core/errors';

export type DateInputSource = 'range' | 'topLevel' | 'defaulted' | 'none';

export interface NormalizedDateInput {
  from: string | null;
  to: string | null;
  source: DateInputSource;
}

export function isDevelopmentRuntime() {
  return process.env.NODE_ENV !== 'production' || [true, 'true'].includes(process.env.FUNCTIONS_EMULATOR as any);
}

function toIsoOrNull(value: unknown) {
  if (value == null || value === '') return null;
  const d = new Date(String(value));
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

export function normalizeDateInput(
  payload: any,
  options?: { defaultDaysBack?: number; allowEmpty?: boolean; requireCompleteRange?: boolean },
): NormalizedDateInput {
  const fromRaw = payload?.from ?? payload?.dateFrom ?? payload?.range?.from;
  const toRaw = payload?.to ?? payload?.dateTo ?? payload?.range?.to;
  const source: DateInputSource = payload?.from != null || payload?.to != null
    ? 'topLevel'
    : payload?.range
      ? 'range'
      : 'none';

  let from = toIsoOrNull(fromRaw);
  let to = toIsoOrNull(toRaw);

  if ((fromRaw != null && !from) || (toRaw != null && !to)) {
    throw new AppError('VALIDATION_FAILED', 'Invalid date input');
  }

  if (from && to && from > to) {
    throw new AppError('VALIDATION_FAILED', 'Invalid range');
  }

  if (!from && !to && options?.defaultDaysBack) {
    const end = new Date();
    const start = new Date(end.getTime() - (options.defaultDaysBack * 86400000));
    return { from: start.toISOString(), to: end.toISOString(), source: 'defaulted' };
  }

  if (options?.requireCompleteRange) {
    if (!from && to) from = new Date(new Date(to).getTime() - ((options.defaultDaysBack ?? 30) * 86400000)).toISOString();
    if (from && !to) to = new Date().toISOString();
    if (!from || !to) {
      throw new AppError('VALIDATION_FAILED', 'Date range is required');
    }
  }

  if (!from && !to && !options?.allowEmpty) {
    return { from: null, to: null, source: 'none' };
  }

  return { from, to, source };
}

export function normalizePagination(payload: any, defaultPageSize = 20, maxPageSize = 1000) {
  const fetchAll = Boolean(payload?.fetchAll ?? false);
  const page = fetchAll ? 1 : Math.max(1, Number(payload?.page ?? 1));
  const pageSize = fetchAll
    ? maxPageSize
    : Math.max(1, Math.min(maxPageSize, Number(payload?.pageSize ?? defaultPageSize)));
  return { page, pageSize, fetchAll };
}

export function normalizeSort(payload: any, defaults: { by: string; dir: 'asc' | 'desc' }) {
  return {
    by: payload?.sort?.by ?? defaults.by,
    dir: payload?.sort?.dir === 'asc' || payload?.sort?.dir === 'desc' ? payload.sort.dir : defaults.dir,
  };
}

export function normalizeFilters(filters: unknown) {
  return (filters && typeof filters === 'object' && !Array.isArray(filters) ? filters : {}) as Record<string, unknown>;
}

export function normalizeFlags(flags: unknown) {
  return (flags && typeof flags === 'object' && !Array.isArray(flags) ? flags : {}) as Record<string, unknown>;
}

export function normalizeGroupBy(groupBy: unknown) {
  return Array.isArray(groupBy) ? groupBy.map(String) : [];
}

export function normalizeColumns(columns: unknown) {
  return Array.isArray(columns) ? columns.map(String) : null;
}



export function isDevRelaxedValidationEnabled() {
  return isDevelopmentRuntime();
}

export function normalizeListQueryInput(
  payload: any,
  options?: { defaultPageSize?: number; maxPageSize?: number; defaultSort?: { by: string; dir: 'asc' | 'desc' } },
) {
  const pagination = normalizePagination(payload, options?.defaultPageSize ?? 20, options?.maxPageSize ?? 200);
  return {
    ...pagination,
    limit: pagination.pageSize,
    offset: (pagination.page - 1) * pagination.pageSize,
    filters: normalizeFilters(payload?.filters),
    sort: normalizeSort(payload, options?.defaultSort ?? { by: 'createdAt', dir: 'desc' }),
    flags: normalizeFlags(payload?.flags),
    groupBy: normalizeGroupBy(payload?.groupBy),
    columns: normalizeColumns(payload?.columns),
    query: typeof payload?.query === 'string' ? payload.query : '',
  };
}

export function resolveStoreScopedId(ctxStoreId: string | undefined | null, payloadStoreId: unknown) {
  const fromPayload = typeof payloadStoreId === 'string' && payloadStoreId.trim() ? payloadStoreId : null;
  const resolved = fromPayload ?? ctxStoreId ?? null;
  if (!resolved) throw new AppError('VALIDATION_FAILED', 'storeId is required');
  return resolved;
}
