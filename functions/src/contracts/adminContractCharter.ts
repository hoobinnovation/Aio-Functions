import Joi from 'joi';
import { ACTION_NAME_REGEX, ACTION_CATALOGS } from '../actions/catalogs';
import { AppError } from '../core/errors';
import { ACTION_ROLE_MAP } from '../core/rbac';
import { STABLE_ERROR_CODES } from '../protocol/errorCodes';
import { ACTION_REGISTRIES } from '../registries/actionRegistries';
import { ACTION_SPECS } from '../specs/actionSpecs';

export const ADMIN_ENVELOPE_SCHEMA = Joi.object({
  action: Joi.string().pattern(ACTION_NAME_REGEX).required(),
  storeId: Joi.string().optional(),
  payload: Joi.any().optional(),
  meta: Joi.object().optional(),
}).required();

export interface AdminActionContract {
  action: string;
  canonicalActionName: string;
  storeScoped: boolean;
  module: string;
  rolesAllowed: string[];
  hasSpec: boolean;
  hasHandler: boolean;
  errorCodes: string[];
}

export interface AdminContractCoverage {
  missingSpecs: string[];
  missingHandlers: string[];
  missingRbac: string[];
  invalidCanonicalNames: string[];
}

export function getAdminActionContract(action: string): AdminActionContract {
  const policy = ACTION_ROLE_MAP[action];
  const spec = ACTION_SPECS.admin[action];
  const hasHandler = typeof ACTION_REGISTRIES.admin[action] === 'function';

  return {
    action,
    canonicalActionName: action,
    storeScoped: Boolean(policy?.storeAccessRequired),
    module: policy?.module ?? 'unknown',
    rolesAllowed: policy?.rolesAllowed ?? [],
    hasSpec: Boolean(spec),
    hasHandler,
    errorCodes: spec?.errorCodes ?? [STABLE_ERROR_CODES.VALIDATION_FAILED],
  };
}

export function getAdminContractCoverage(): AdminContractCoverage {
  const adminActions = ACTION_CATALOGS.admin;

  return {
    missingSpecs: adminActions.filter((action) => !ACTION_SPECS.admin[action]),
    missingHandlers: adminActions.filter((action) => typeof ACTION_REGISTRIES.admin[action] !== 'function'),
    missingRbac: adminActions.filter((action) => !ACTION_ROLE_MAP[action]),
    invalidCanonicalNames: adminActions.filter((action) => !ACTION_NAME_REGEX.test(action)),
  };
}

export function assertAdminActionContract(action: string): AdminActionContract {
  const contract = getAdminActionContract(action);

  if (!contract.hasSpec) {
    throw new AppError('UNSUPPORTED_ACTION', `No ACTION_SPEC registered for ${action}`);
  }

  if (!contract.hasHandler) {
    throw new AppError('UNSUPPORTED_ACTION', `No handler registered for ${action}`);
  }

  if (!contract.rolesAllowed.length) {
    throw new AppError(STABLE_ERROR_CODES.NOT_FOUND, `RBAC policy missing for action ${action}`);
  }

  return contract;
}

export function resolveAdminStoreId(options: {
  action: string;
  requestStoreId?: string;
  payloadStoreId?: unknown;
  storeScoped: boolean;
}): string | undefined {
  const requestStoreId = typeof options.requestStoreId === 'string' ? options.requestStoreId.trim() : '';
  const payloadStoreId = typeof options.payloadStoreId === 'string' ? options.payloadStoreId.trim() : '';

  if (requestStoreId && payloadStoreId && requestStoreId !== payloadStoreId) {
    throw new AppError(STABLE_ERROR_CODES.VALIDATION_FAILED, 'storeId mismatch between request envelope and payload', {
      action: options.action,
      requestStoreId,
      payloadStoreId,
    });
  }

  const resolved = requestStoreId || payloadStoreId || undefined;

  if (options.storeScoped && !resolved) {
    throw new AppError(STABLE_ERROR_CODES.STORE_ACCESS_REQUIRED, `storeId is required for ${options.action}`);
  }

  return resolved;
}

export function normalizeAdminSmartTableResponse(data: unknown, requestPayload: unknown): unknown {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return data;
  }

  const record = { ...(data as Record<string, unknown>) };
  const arrayEntries = Object.entries(record).filter(([, value]) => Array.isArray(value));
  const hasItems = Array.isArray(record.items);

  if (!hasItems && arrayEntries.length === 1) {
    record.items = arrayEntries[0][1];
  }

  if (!record.pageInfo && Array.isArray(record.items)) {
    const payload = (requestPayload && typeof requestPayload === 'object') ? requestPayload as Record<string, unknown> : {};
    const page = Number(payload.page ?? 1);
    const pageSize = Number(payload.pageSize ?? (record.items as unknown[]).length);
    const total = Number((record as any).total ?? (record as any).count ?? (record.items as unknown[]).length);
    record.pageInfo = {
      page: Number.isFinite(page) && page > 0 ? Math.floor(page) : 1,
      pageSize: Number.isFinite(pageSize) && pageSize > 0 ? Math.floor(pageSize) : (record.items as unknown[]).length,
      total: Number.isFinite(total) && total >= 0 ? Math.floor(total) : (record.items as unknown[]).length,
    };
  }

  if (!record.capabilities) {
    record.capabilities = { canEdit: false, canDelete: false };
  }

  if (!record.availability) {
    record.availability = {};
  }

  return record;
}
