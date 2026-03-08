import { onCall, HttpsError } from 'firebase-functions/v2/https';
import Joi from 'joi';
import { buildCloudContext } from '../context/cloudContext';
import { dispatchAction } from '../dispatch/dispatchAction';
import { UnifiedRequest } from '../protocol/envelopes';

const requestSchema = Joi.object({
    action: Joi.string().required(),
    storeId: Joi.string().optional(),
    payload: Joi.any().optional(),
    meta: Joi.object().optional(),
}).required();

export const clientGateway = onCall(async (request) => {
    try {
        const envelope = requestSchema.validate(request.data, {
            abortEarly: false,
            allowUnknown: false,
            stripUnknown: false,
        });

        if (envelope.error) {
            return {
                ok: false,
                error: {
                    code: 'VALIDATION_FAILED',
                    message: 'Validation failed',
                    details: {
                        issues: envelope.error.details.map((d) => d.message),
                    },
                },
                meta: {
                    requestId: request.rawRequest?.headers?.['x-request-id'] || null,
                    serverTime: new Date().toISOString(),
                },
            };
        }

        const req = envelope.value as UnifiedRequest;

        const ctx = await buildCloudContext(
            'client',
            request,
            req?.storeId,
            req?.meta
        );

        return await dispatchAction('client', req, ctx);
    } catch (error: any) {
        console.error('clientGateway error:', {
            message: error?.message,
            code: error?.code,
            stack: error?.stack,
            details: error?.details || null,
        });

        return {
            ok: false,
            error: {
                code: error?.code || 'INTERNAL',
                message: error?.message || 'Internal server error',
                details: error?.details || null,
            },
            meta: {
                requestId: null,
                serverTime: new Date().toISOString(),
            },
        };
    }
});
