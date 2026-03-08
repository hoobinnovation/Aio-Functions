import { onCall } from 'firebase-functions/v2/https';
import Joi from 'joi';
import { buildCloudContext } from '../context/cloudContext';
import { dispatchAction } from '../dispatch/dispatchAction';
import { UnifiedRequest } from '../protocol/envelopes';
import { resolveAdminAuth } from '../rbac/adminRbac';
import { toValidationDetails } from '../protocol/clientApiContract';

const requestSchema = Joi.object({
  action: Joi.string().required(),
  storeId: Joi.string().optional(),
  payload: Joi.any().optional(),
  meta: Joi.object().optional(),
}).required();

export const adminGateway = onCall(async (request) => {
  const envelope = requestSchema.validate(request.data, { abortEarly: false, allowUnknown: false, stripUnknown: false });
  const req = envelope.value as UnifiedRequest;
  const ctx = await buildCloudContext('admin', request, req?.storeId, req?.meta);

  if (envelope.error) {
    return {
      ok: false,
      error: { code: 'VALIDATION_FAILED', message: 'Invalid request envelope', details: toValidationDetails(envelope.error) },
      meta: { requestId: ctx.requestId, serverTime: ctx.serverTime },
    };
  }

  ctx.auth.admin = await resolveAdminAuth(ctx);
  return dispatchAction('admin', req, ctx);
});
