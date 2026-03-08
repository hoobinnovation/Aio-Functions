import { AppError } from '../core/errors';

export type DateInputSource = 'range' | 'topLevel' | 'defaulted' | 'none';

export interface NormalizedDateInput {
  from: string | null;
  to: string | null;
  source: DateInputSource;
}

export interface NormalizedSortInput {
  by: string;
  direction: 'asc' | 'desc';
  dir: 'asc' | 'desc';
}

export interface NormalizedSearchInput {
  term: string;
}

export interface NormalizedListQuery {
  search: NormalizedSearchInput;
  filters: Record<string, unknown>;
  sort: NormalizedSortInput;
  page: number;
  pageSize: number;
  fetchAll: boolean;
  groupBy: string[];
  range: { from: string | null; to: string | null };
  flags: Record<string, unknown>;
  columns: string[] | null;
  limit: number;
  offset: number;
  query: string;
  q: string;
}

export interface QueryContractOptions {
  allowedSortFields?: string[];
  sortAliases?: Record<string, { by: string; direction: 'asc' | 'desc' }>;
  allowedFilterKeys?: string[];
  filterAliases?: Record<string, string>;
  allowedGroupByKeys?: string[];
  groupByAliases?: Record<string, string>;
  allowedColumns?: string[];
  columnAliases?: Record<string, string>;
  allowedFlagKeys?: string[];
  flagAliases?: Record<string, string>;
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
    throw new AppError('QUERY_RANGE_INVALID', 'Invalid range date format', { from: fromRaw, to: toRaw });
  }

  if (from && to && from > to) {
    throw new AppError('QUERY_RANGE_INVALID', 'range.from must be before range.to', { from, to });
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
      throw new AppError('QUERY_RANGE_INVALID', 'Date range is required');
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

  if (!Number.isFinite(page) || page < 1 || !Number.isInteger(page)) {
    throw new AppError('QUERY_PAGINATION_INVALID', 'page must be a positive integer');
  }

  if (!Number.isFinite(pageSize) || pageSize < 1) {
    throw new AppError('QUERY_PAGINATION_INVALID', 'pageSize must be a positive integer');
  }

  page = Math.max(1, Math.floor(page));
  pageSize = Math.max(1, Math.min(maxPageSize, Math.floor(pageSize)));

  if (fetchAll) {
    page = 1;
    pageSize = maxPageSize;
  }

  return { page, pageSize, fetchAll };
}

export function normalizeSort(
  payload: any,
  defaults: { by: string; dir: 'asc' | 'desc' },
  options?: Pick<QueryContractOptions, 'allowedSortFields' | 'sortAliases'>,
): NormalizedSortInput {
  const sortInput = payload?.sort ?? payload?.sortBy;
  let by: unknown;
  let dir: unknown;

  if (typeof sortInput === 'string') {
    const alias = options?.sortAliases?.[sortInput.trim()];
    if (alias) {
      return { by: alias.by, direction: alias.direction, dir: alias.direction };
    }
    const [byPart, dirPart] = sortInput.split(':');
    by = byPart;
    dir = dirPart;
  } else if (isObject(sortInput)) {
    by = sortInput.by;
    dir = sortInput.dir ?? sortInput.direction;
  }

  const normalizedBy = toStringOrNull(by) ?? defaults.by;
  const normalizedDir = (toStringOrNull(dir)?.toLowerCase() ?? defaults.dir);

  if (normalizedDir !== 'asc' && normalizedDir !== 'desc') {
    throw new AppError('QUERY_SORT_INVALID', 'sort.direction must be asc or desc', { direction: dir });
  }

  if (options?.allowedSortFields && options.allowedSortFields.length > 0 && !options.allowedSortFields.includes(normalizedBy)) {
    throw new AppError('QUERY_SORT_INVALID', 'sort.by is not allowed for this action', {
      by: normalizedBy,
      allowed: options.allowedSortFields,
    });
  }

  return {
    by: normalizedBy,
    direction: normalizedDir,
    dir: normalizedDir,
  };
}

function coerceSimpleFilterValue(value: unknown): unknown {
  if (value == null) return undefined;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed.length) return undefined;
    const bool = toBooleanOrUndefined(trimmed);
    if (bool !== undefined) return bool;
    const numeric = toNumberOrUndefined(trimmed);
    if (numeric !== undefined && /^-?\d+(\.\d+)?$/.test(trimmed)) return numeric;
    return trimmed;
  }
  if (Array.isArray(value)) {
    return value.map(coerceSimpleFilterValue).filter((entry) => entry !== undefined);
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }
  if (isObject(value)) {
    return value;
  }
  return undefined;
}

export function normalizeFilters(filters: unknown, allowedFilterKeys?: string[], filterAliases?: Record<string, string>) {
  if (!isObject(filters)) {
    if (filters == null) return {};
    throw new AppError('QUERY_FILTERS_INVALID', 'filters must be an object');
  }

  const normalized = Object.fromEntries(
    Object.entries(filters)
      .map(([key, value]) => [filterAliases?.[key] ?? key, coerceSimpleFilterValue(value)] as const)
      .filter(([, value]) => value !== undefined),
  );

  if (allowedFilterKeys?.length) {
    const unsupported = Object.keys(normalized).filter((key) => !allowedFilterKeys.includes(key));
    if (unsupported.length) {
      throw new AppError('QUERY_FILTERS_INVALID', 'Unsupported filter keys for this action', {
        unsupported,
        allowed: allowedFilterKeys,
      });
    }
  }

  return normalized;
}

export function normalizeFlags(flags: unknown, allowedFlagKeys?: string[], flagAliases?: Record<string, string>) {
  if (!isObject(flags)) return {};
  const normalized = Object.fromEntries(
    Object.entries(flags).map(([key, value]) => {
      const normalizedBool = toBooleanOrUndefined(value);
      return [flagAliases?.[key] ?? key, normalizedBool ?? value];
    }).filter(([, value]) => value !== undefined),
  ) as Record<string, unknown>;

  if (allowedFlagKeys?.length) {
    const unsupported = Object.keys(normalized).filter((key) => !allowedFlagKeys.includes(key));
    if (unsupported.length) {
      throw new AppError('VALIDATION_FAILED', 'Unsupported flags for this action', { unsupported, allowed: allowedFlagKeys });
    }
  }

  return normalized;
}

function normalizeStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map(toStringOrNull).filter((entry): entry is string => !!entry);
  }
  const raw = toStringOrNull(value);
  if (!raw) return [];
  return raw.split(',').map((entry) => entry.trim()).filter(Boolean);
}

function enforceAllowedList(values: string[], allowedValues: string[] | undefined, code: string, message: string) {
  if (!allowedValues?.length || !values.length) return values;
  const unsupported = values.filter((value) => !allowedValues.includes(value));
  if (unsupported.length) {
    throw new AppError(code, message, { unsupported, allowed: allowedValues });
  }
  return values;
}

export function normalizeGroupBy(groupBy: unknown, allowedGroupByKeys?: string[], groupByAliases?: Record<string, string>) {
  const normalized = normalizeStringArray(groupBy).map((value) => groupByAliases?.[value] ?? value);
  return enforceAllowedList(normalized, allowedGroupByKeys, 'QUERY_GROUP_BY_INVALID', 'Unsupported groupBy keys for this action');
}

export function normalizeColumns(columns: unknown, allowedColumns?: string[], columnAliases?: Record<string, string>) {
  const normalized = normalizeStringArray(columns).map((value) => columnAliases?.[value] ?? value);
  const safeColumns = enforceAllowedList(normalized, allowedColumns, 'QUERY_COLUMNS_INVALID', 'Unsupported columns for this action');
  return safeColumns.length ? safeColumns : null;
}

export function normalizeSearchInput(payload: any): NormalizedSearchInput {
  const raw = payload?.search?.term ?? payload?.query ?? payload?.q ?? payload?.search;
  if (raw == null) return { term: '' };
  const term = toStringOrNull(raw);
  if (term == null) {
    throw new AppError('QUERY_SEARCH_INVALID', 'search term must be a string');
  }
  return { term };
}

export function isDevRelaxedValidationEnabled() {
  return isDevelopmentRuntime();
}

export function normalizeListQueryInput(
  payload: any,
  options?: {
    defaultPageSize?: number;
    maxPageSize?: number;
    defaultSort?: { by: string; dir: 'asc' | 'desc' };
    contract?: QueryContractOptions;
  },
): NormalizedListQuery {
  const pagination = normalizePagination(payload, options?.defaultPageSize ?? 20, options?.maxPageSize ?? 200);
  const offset = (pagination.page - 1) * pagination.pageSize;
  const search = normalizeSearchInput(payload);

  const rangeInput = normalizeDateInput(payload, { allowEmpty: true });

  const sort = normalizeSort(payload, options?.defaultSort ?? { by: 'createdAt', dir: 'desc' }, {
    allowedSortFields: options?.contract?.allowedSortFields,
    sortAliases: options?.contract?.sortAliases,
  });

  const filters = normalizeFilters(payload?.filters, options?.contract?.allowedFilterKeys, options?.contract?.filterAliases);
  const groupBy = normalizeGroupBy(payload?.groupBy, options?.contract?.allowedGroupByKeys, options?.contract?.groupByAliases);
  const columns = normalizeColumns(payload?.columns, options?.contract?.allowedColumns, options?.contract?.columnAliases);

  return {
    ...pagination,
    limit: pagination.pageSize,
    offset,
    filters,
    sort,
    flags: normalizeFlags(payload?.flags, options?.contract?.allowedFlagKeys, options?.contract?.flagAliases),
    groupBy,
    columns,
    search,
    range: { from: rangeInput.from, to: rangeInput.to },
    query: search.term,
    q: search.term,
  };
}

export function resolveStoreScopedId(ctxStoreId: string | undefined | null, payloadStoreId: unknown) {
  const fromPayload = typeof payloadStoreId === 'string' && payloadStoreId.trim() ? payloadStoreId : null;
  const resolved = fromPayload ?? ctxStoreId ?? null;
  if (!resolved) throw new AppError('VALIDATION_FAILED', 'storeId is required');
  return resolved;
}
