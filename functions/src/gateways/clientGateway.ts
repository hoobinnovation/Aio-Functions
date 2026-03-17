import { onCall } from 'firebase-functions/v2/https';
import Joi from 'joi';
import { buildCloudContext } from '../context/cloudContext';
import { dispatchAction } from '../dispatch/dispatchAction';
import { UnifiedRequest } from '../protocol/envelopes';
import { toValidationDetails } from '../protocol/clientApiContract';

const requestSchema = Joi.object({
    action: Joi.string().required(),
    storeId: Joi.string().optional(),
    payload: Joi.any().optional(),
    meta: Joi.object().optional(),
}).required();

export const clientGateway = onCall(async (request) => {
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
    if (!req?.storeId && payloadStoreId) {
        req.storeId = payloadStoreId;
    }
    const ctx = await buildCloudContext(
        'client',
        request,
        req?.storeId,
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

    return dispatchAction('client', req, ctx);
});
