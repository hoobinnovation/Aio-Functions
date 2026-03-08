import { onCall } from 'firebase-functions/v2/https';
import { buildCloudContext } from '../context/cloudContext';
import { dispatchAction } from '../dispatch/dispatchAction';
import { UnifiedRequest } from '../protocol/envelopes';
import { resolveAdminAuth } from '../rbac/adminRbac';
import { toValidationDetails } from '../protocol/clientApiContract';
import { ADMIN_ENVELOPE_SCHEMA } from '../contracts/adminContractCharter';

export const adminGateway = onCall(async (request) => {
  const envelope = ADMIN_ENVELOPE_SCHEMA.validate(request.data, { abortEarly: false, allowUnknown: false, stripUnknown: false });
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
