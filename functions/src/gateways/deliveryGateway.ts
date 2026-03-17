import { onCall } from 'firebase-functions/v2/https';
import Joi from 'joi';
import { AppError, toAppError } from '../core/errors';
import { resolveDeliveryRiderScope } from '../core/delivery/riders';
import { buildCloudContext } from '../context/cloudContext';
import { dispatchAction, toUnifiedErrorResponse } from '../dispatch/dispatchAction';
import { UnifiedRequest } from '../protocol/envelopes';
import { toValidationDetails } from '../protocol/clientApiContract';

const requestSchema = Joi.object({
  action: Joi.string().required(),
  storeId: Joi.string().optional(),
  payload: Joi.any().optional(),
  meta: Joi.object().optional(),
}).required();

export const deliveryGateway = onCall(async (request) => {
  const envelope = requestSchema.validate(request.data, {
    abortEarly: false,
    allowUnknown: false,
    stripUnknown: false,
  });

  const req = envelope.value as UnifiedRequest;
  const payloadStoreId =
    typeof req?.payload === 'object' &&
    req?.payload !== null &&
    typeof (req.payload as Record<string, unknown>).storeId === 'string'
      ? String((req.payload as Record<string, unknown>).storeId).trim()
      : '';
  const requestedStoreId = req?.storeId || payloadStoreId || undefined;

  const ctx = await buildCloudContext(
    'delivery',
    request,
    requestedStoreId,
    req?.meta
  );

  if (envelope.error) {
    return {
      ok: false,
      error: {
        code: 'VALIDATION_FAILED',
        message: 'Invalid request envelope',
        details: toValidationDetails(envelope.error),
      },
      meta: {
        requestId: ctx.requestId,
        serverTime: ctx.serverTime,
      },
    };
  }

  try {
    const rider = await resolveDeliveryRiderScope(ctx as any, requestedStoreId);
    const deliveryCtx = {
      ...ctx,
      storeId: rider.storeId,
      auth: {
        ...ctx.auth,
        rider,
      },
    };
    req.storeId = rider.storeId;
    return dispatchAction('delivery', req, deliveryCtx as any);
  } catch (error) {
    return toUnifiedErrorResponse(
      error instanceof AppError ? error : toAppError(error),
      ctx.requestId,
      ctx.serverTime
    );
  }
});
