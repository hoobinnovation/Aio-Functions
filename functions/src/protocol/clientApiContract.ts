import Joi from 'joi';
import { AppError } from '../core/errors';
import { Gateway } from './envelopes';
import {
  normalizeColumns,
  normalizeDateInput,
  normalizeFlags,
  normalizeGroupBy,
  normalizeListQueryInput,
  normalizeSearchInput,
  normalizeSort,
} from '../utils/queryNormalization';

const CATALOG_QUERY_CONTRACT = {
  allowedSortFields: ['createdAt', 'updatedAt', 'name', 'slug',"sort.by"],
  sortAliases: {
    newest: { by: 'createdAt', direction: 'desc' as const },
    oldest: { by: 'createdAt', direction: 'asc' as const },
    recentlyUpdated: { by: 'updatedAt', direction: 'desc' as const },
    nameAsc: { by: 'name', direction: 'asc' as const },
    nameDesc: { by: 'name', direction: 'desc' as const },
  },
  allowedFilterKeys: ['categoryId', 'status'],
  allowedGroupByKeys: ['categoryId', 'status'],
  allowedColumns: ['id', 'storeId', 'categoryId', 'name', 'slug', 'description', 'status', 'createdAt', 'updatedAt'],
};

const FAVORITES_QUERY_CONTRACT = {
  allowedSortFields: ['createdAt'],
  allowedFilterKeys: [] as string[],
  allowedGroupByKeys: [] as string[],
  allowedColumns: ['id', 'uid', 'productId', 'storeId', 'createdAt', 'updatedAt'],
};

const WALLET_LOYALTY_QUERY_CONTRACT = {
  allowedSortFields: ['createdAt'],
  allowedFilterKeys: ['type', 'status', 'storeId'],
  allowedGroupByKeys: ['type', 'status'],
  allowedColumns: ['id', 'uid', 'storeId', 'type', 'status', 'amountCents', 'createdAt', 'updatedAt'],
};

const LIST_QUERY_ACTIONS = new Set<string>([
  'catalogListProducts',
  'publicCatalogListProducts',
  'publicCatalogSearchProducts',
  'publicCatalogGetFilters',
  'productFavoritesList',
  'storeFavoritesList',
  'ordersList',
  'notificationsList',
  'supportListTickets',
  'insuranceListMyOrders',
  'walletHistory',
  'loyaltyListTransactions',
]);

const SEARCH_ACTIONS = new Set<string>([
  'publicCatalogSearchProducts',
]);

function normalizeStringIdentifier(value: unknown): string | undefined {
  if (value == null) return undefined;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed || undefined;
  }
  if (typeof value === 'number') {
    return String(value);
  }
  return undefined;
}

function normalizeCatalogFilters(payload: Record<string, unknown>) {
  const categoryId = normalizeStringIdentifier(payload.categoryId);
  if (categoryId) payload.categoryId = categoryId;
}

function normalizeLegalPayload(payload: Record<string, unknown>) {
  if (payload.docType != null) {
    const docType = normalizeStringIdentifier(payload.docType);
    if (docType) payload.docType = docType;
    else delete payload.docType;
  }
}

function normalizeHomePayload(payload: Record<string, unknown>) {
  if ('mode' in payload) {
    const mode = normalizeStringIdentifier(payload.mode);
    payload.mode = mode ?? payload.mode;
  }
}

function normalizeSettingsPayload(payload: Record<string, unknown>) {
  if (!('config' in payload) && typeof payload.settings === 'object' && payload.settings !== null) {
    payload.config = payload.settings;
  }
}

function applyNormalizedListPayload(payload: Record<string, unknown>, q: ReturnType<typeof normalizeListQueryInput>) {
  payload.page = q.page;
  payload.pageSize = q.pageSize;
  payload.limit = q.limit;
  payload.offset = q.offset;
  payload.fetchAll = q.fetchAll;
  payload.filters = q.filters;
  payload.sort = q.sort;
  payload.flags = q.flags;
  payload.groupBy = q.groupBy;
  payload.columns = q.columns;
  payload.range = q.range;
  payload.from = q.range.from;
  payload.to = q.range.to;
  payload.query = q.query;
  payload.q = q.q;
}

function normalizeListPayload(payload: Record<string, unknown>) {
  const q = normalizeListQueryInput(payload, { defaultPageSize: 20, maxPageSize: 200 });
  applyNormalizedListPayload(payload, q);
}

function normalizeCatalogListPayload(payload: Record<string, unknown>) {
  const q = normalizeListQueryInput(payload, {
    defaultPageSize: 20,
    maxPageSize: 200,
    contract: CATALOG_QUERY_CONTRACT,
    defaultSort: { by: 'updatedAt', dir: 'desc' },
  });
  applyNormalizedListPayload(payload, q);
  normalizeCatalogFilters(payload);
}

function normalizeWalletLoyaltyPayload(payload: Record<string, unknown>) {
  const q = normalizeListQueryInput(payload, {
    defaultPageSize: 20,
    maxPageSize: 200,
    contract: WALLET_LOYALTY_QUERY_CONTRACT,
    defaultSort: { by: 'createdAt', dir: 'desc' },
  });
  applyNormalizedListPayload(payload, q);
  const range = normalizeDateInput(payload, { allowEmpty: true });
  if (range.from || range.to) {
    payload.from = range.from;
    payload.to = range.to;
    payload.range = { from: range.from, to: range.to };
  }
}

export function normalizeActionPayload(gateway: Gateway, action: string, inputPayload: unknown): unknown {
  if (gateway === 'admin') {
    return inputPayload;
  }

  const payload = (typeof inputPayload === 'object' && inputPayload !== null ? { ...(inputPayload as Record<string, unknown>) } : {}) as Record<string, unknown>;

  if (LIST_QUERY_ACTIONS.has(action)) {
    normalizeListPayload(payload);
  }

  if (SEARCH_ACTIONS.has(action)) {
    const search = normalizeSearchInput(payload);
    payload.query = search.term;
    payload.q = search.term;
  }

  switch (action) {
    case 'homeGetLayout':
    case 'publicCatalogGetHome':
      normalizeHomePayload(payload);
      break;
    case 'catalogListProducts':
    case 'publicCatalogListProducts':
    case 'publicCatalogSearchProducts':
    case 'publicCatalogGetFilters':
      normalizeCatalogListPayload(payload);
      break;
    case 'productFavoritesList':
    case 'storeFavoritesList': {
      const q = normalizeListQueryInput(payload, {
        defaultPageSize: 20,
        maxPageSize: 200,
        contract: FAVORITES_QUERY_CONTRACT,
        defaultSort: { by: 'createdAt', dir: 'desc' },
      });
      applyNormalizedListPayload(payload, q);
      break;
    }
    case 'legalGetDocs':
      normalizeLegalPayload(payload);
      break;
    case 'settingsUpdate':
      normalizeSettingsPayload(payload);
      break;
    case 'walletHistory':
    case 'loyaltyListTransactions':
      normalizeWalletLoyaltyPayload(payload);
      break;
    default:
      break;
  }

  if ('ids' in payload && !Array.isArray(payload.ids) && typeof payload.ids === 'string') {
    payload.ids = payload.ids.split(',').map((part) => part.trim()).filter(Boolean);
  }

  if ('slugs' in payload && !Array.isArray(payload.slugs) && typeof payload.slugs === 'string') {
    payload.slugs = payload.slugs.split(',').map((part) => part.trim()).filter(Boolean);
  }

  if ('groupBy' in payload) payload.groupBy = normalizeGroupBy(payload.groupBy);
  if ('columns' in payload) payload.columns = normalizeColumns(payload.columns);
  if ('flags' in payload) payload.flags = normalizeFlags(payload.flags);
  if ('sort' in payload) payload.sort = normalizeSort(payload, { by: 'createdAt', dir: 'desc' });

  return payload;
}

function joiDetailPath(detail: any): string {
  if (!detail.path.length) return 'payload';
  return `payload.${detail.path.join('.')}`;
}

export function toValidationDetails(error: any): { issues: string[]; fields: Array<{ path: string; message: string; type: string }> } {
  const fields = (error.details || []).map((detail: any) => ({
    path: joiDetailPath(detail),
    message: detail.message.replace(/"/g, ''),
    type: detail.type,
  }));

  return {
    issues: fields.map((entry: { path: string; message: string }) => `${entry.path}: ${entry.message}`),
    fields,
  };
}

export function mapErrorForContract(err: AppError): AppError {
  switch (err.code) {
    case 'VALIDATION_ERROR':
      return new AppError('VALIDATION_FAILED', err.message, err.details);
    case 'ACTION_NOT_FOUND':
    case 'SPEC_MISSING':
      return new AppError('UNSUPPORTED_ACTION', err.message, err.details);
    case 'ACCOUNT_DISABLED':
    case 'OUT_OF_STOCK':
    case 'COUPON_INVALID':
    case 'COUPON_LIMIT':
    case 'DINE_IN_SESSION_CLOSE_NOT_ALLOWED':
      return new AppError('INVALID_STATE', err.message, err.details);
    default:
      return err;
  }
}
