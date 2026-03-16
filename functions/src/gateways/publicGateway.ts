import { onCall } from 'firebase-functions/v2/https';
import Joi from 'joi';
import { buildCloudContext } from '../context/cloudContext';
import { dispatchAction } from '../dispatch/dispatchAction';
import { UnifiedRequest } from '../protocol/envelopes';
import { toValidationDetails } from '../protocol/clientApiContract';

const requestSchema = Joi.object({
  action: Joi.string().required(),
  storeId: Joi.string().min(1).required(),
  payload: Joi.any().optional(),
  meta: Joi.object().optional(),
}).required();

function toPublicEnvelopeError(error: any) {
  const hasStoreIdIssue = (error.details || []).some((detail: any) => detail.path.join('.') === 'storeId');
  const hasMissingStoreId = (error.details || []).some((detail: any) => detail.path.join('.') === 'storeId' && detail.type === 'any.required');

  if (hasStoreIdIssue) {
    return {
      code: hasMissingStoreId ? 'PUBLIC_STORE_ID_REQUIRED' : 'PUBLIC_STORE_ID_INVALID',
      message: hasMissingStoreId ? 'storeId is required for public requests' : 'storeId is invalid for public requests',
      details: toValidationDetails(error),
    };
  }

  return {
    code: 'VALIDATION_FAILED',
    message: 'Invalid request envelope',
    details: toValidationDetails(error),
  };
}

export const publicGateway = onCall({timeoutSeconds:3600 },async (request: any) => {
  const incoming = request?.data && typeof request.data === 'object' && request.data !== null
    ? { ...request.data, storeId: request.data.storeId ?(
              typeof request.data.storeId === 'string' ? request.data.storeId.trim() : request.data.storeId
          ) : request.data.payload.storeId }
    : request?.data;

  const envelope = requestSchema.validate(incoming, { abortEarly: false, allowUnknown: false, stripUnknown: true });
  const req = envelope.value as UnifiedRequest;
  // @ts-ignore
    const ctx = await buildCloudContext('public', request, req?.storeId || req.payload?.storeId, req?.meta);

  if (envelope.error) {
    return {
      ok: false,
      error: toPublicEnvelopeError(envelope.error),
      meta: { requestId: ctx.requestId, serverTime: ctx.serverTime },
    };
  }

  return dispatchAction('public', req, ctx);
});
