import { AppError } from '../core/errors';

export type DateInputSource = 'range' | 'topLevel' | 'defaulted' | 'none';

export interface NormalizedDateInput {
  from: string | null;
  to: string | null;
  source: DateInputSource;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function toStringOrNull(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length ? trimmed : null;
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  return null;
}

function toBooleanOrUndefined(value: unknown): boolean | undefined {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'true' || normalized === '1' || normalized === 'yes') return true;
    if (normalized === 'false' || normalized === '0' || normalized === 'no') return false;
  }
  if (typeof value === 'number') {
    if (value === 1) return true;
    if (value === 0) return false;
  }
  return undefined;
}

function toNumberOrUndefined(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return undefined;
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
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
  const fetchAll = toBooleanOrUndefined(payload?.fetchAll) ?? false;

  const pageFromTopLevel = toNumberOrUndefined(payload?.page);
  const limit = toNumberOrUndefined(payload?.limit);
  const offset = toNumberOrUndefined(payload?.offset);

  const pageSizeFromTopLevel = toNumberOrUndefined(payload?.pageSize);
  const pageSizeFromLimit = limit;

  let page = pageFromTopLevel ?? 1;
  let pageSize = pageSizeFromTopLevel ?? pageSizeFromLimit ?? defaultPageSize;

  if (!pageFromTopLevel && offset != null && limit != null && limit > 0) {
    page = Math.floor(offset / limit) + 1;
  }

  page = Math.max(1, Math.floor(page));
  pageSize = Math.max(1, Math.min(maxPageSize, Math.floor(pageSize)));

  if (fetchAll) {
    page = 1;
    pageSize = maxPageSize;
  }

  return { page, pageSize, fetchAll };
}

export function normalizeSort(payload: any, defaults: { by: string; dir: 'asc' | 'desc' }) {
  const sortInput = payload?.sort;
  let by: unknown;
  let dir: unknown;

  if (typeof sortInput === 'string') {
    const [byPart, dirPart] = sortInput.split(':');
    by = byPart;
    dir = dirPart;
  } else if (isObject(sortInput)) {
    by = sortInput.by;
    dir = sortInput.dir;
  }

  const normalizedDir = toStringOrNull(dir)?.toLowerCase();
  return {
    by: toStringOrNull(by) ?? defaults.by,
    dir: normalizedDir === 'asc' || normalizedDir === 'desc' ? normalizedDir : defaults.dir,
  };
}

export function normalizeFilters(filters: unknown) {
  if (!isObject(filters)) return {};
  return Object.fromEntries(Object.entries(filters).filter(([, value]) => value !== undefined));
}

export function normalizeFlags(flags: unknown) {
  if (!isObject(flags)) return {};
  return Object.fromEntries(
    Object.entries(flags).map(([key, value]) => {
      const normalizedBool = toBooleanOrUndefined(value);
      return [key, normalizedBool ?? value];
    }).filter(([, value]) => value !== undefined),
  ) as Record<string, unknown>;
}

function normalizeStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map(toStringOrNull).filter((entry): entry is string => !!entry);
  }
  const raw = toStringOrNull(value);
  if (!raw) return [];
  return raw.split(',').map((entry) => entry.trim()).filter(Boolean);
}

export function normalizeGroupBy(groupBy: unknown) {
  return normalizeStringArray(groupBy);
}

export function normalizeColumns(columns: unknown) {
  const normalized = normalizeStringArray(columns);
  return normalized.length ? normalized : null;
}

export function normalizeSearchInput(payload: any): string {
  const raw = payload?.query ?? payload?.q ?? payload?.search;
  return toStringOrNull(raw) ?? '';
}

export function isDevRelaxedValidationEnabled() {
  return isDevelopmentRuntime();
}

export function normalizeListQueryInput(
  payload: any,
  options?: { defaultPageSize?: number; maxPageSize?: number; defaultSort?: { by: string; dir: 'asc' | 'desc' } },
) {
  const pagination = normalizePagination(payload, options?.defaultPageSize ?? 20, options?.maxPageSize ?? 200);
  const offset = (pagination.page - 1) * pagination.pageSize;
  const query = normalizeSearchInput(payload);

  return {
    ...pagination,
    limit: pagination.pageSize,
    offset,
    filters: normalizeFilters(payload?.filters),
    sort: normalizeSort(payload, options?.defaultSort ?? { by: 'createdAt', dir: 'desc' }),
    flags: normalizeFlags(payload?.flags),
    groupBy: normalizeGroupBy(payload?.groupBy),
    columns: normalizeColumns(payload?.columns),
    query,
    q: query,
  };
}

export function resolveStoreScopedId(ctxStoreId: string | undefined | null, payloadStoreId: unknown) {
  const fromPayload = typeof payloadStoreId === 'string' && payloadStoreId.trim() ? payloadStoreId : null;
  const resolved = fromPayload ?? ctxStoreId ?? null;
  if (!resolved) throw new AppError('VALIDATION_FAILED', 'storeId is required');
  return resolved;
}
