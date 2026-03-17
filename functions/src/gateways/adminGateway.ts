import { onCall } from 'firebase-functions/v2/https';
import Joi from 'joi';
import { buildCloudContext } from '../context/cloudContext';
import { dispatchAction } from '../dispatch/dispatchAction';
import { UnifiedRequest } from '../protocol/envelopes';
import { resolveAdminAuth } from '../rbac/adminRbac';
import { toValidationDetails } from '../protocol/clientApiContract';


function resolveStoreIdFromClaims(request: { auth?: { token?: Record<string, unknown> } }): string | undefined {
  const token = request.auth?.token;
  const claimStoreId = typeof token?.storeId === 'string'
    ? token.storeId
    : typeof token?.store_id === 'string'
      ? token.store_id
      : undefined;
  return claimStoreId?.trim() || undefined;
}

const requestSchema = Joi.object({
  action: Joi.string().required(),
  storeId: Joi.string().optional(),
  payload: Joi.any().optional(),
  meta: Joi.object().optional(),
}).required();

export const adminGateway = onCall(async (request) => {
  const envelope = requestSchema.validate(request.data, { abortEarly: false, allowUnknown: false, stripUnknown: false });
  const req = envelope.value as UnifiedRequest;
  const storeIdFromClaims = resolveStoreIdFromClaims(request as any);
  const requestedStoreId = typeof req?.storeId === 'string' && req.storeId.trim() ? req.storeId.trim() : undefined;
  const resolvedStoreId = storeIdFromClaims ?? req?.storeId;
  const ctx = await buildCloudContext('admin', request, resolvedStoreId, req?.meta);

  if (envelope.error) {
    return {
      ok: false,
      error: { code: 'VALIDATION_FAILED', message: 'Invalid request envelope', details: toValidationDetails(envelope.error) },
      meta: { requestId: ctx.requestId, serverTime: ctx.serverTime },
    };
  }

  if (storeIdFromClaims && requestedStoreId && requestedStoreId !== storeIdFromClaims) {
    return {
      ok: false,
      error: {
        code: 'STORE_SCOPE_CONFLICT',
        message: 'Authenticated admin session is bound to a different store',
        details: { claimStoreId: storeIdFromClaims, requestedStoreId },
      },
      meta: { requestId: ctx.requestId, serverTime: ctx.serverTime },
    };
  }

  if (resolvedStoreId) req.storeId = resolvedStoreId;

  ctx.auth.admin = await resolveAdminAuth(ctx);
  return dispatchAction('admin', req, ctx);
});
