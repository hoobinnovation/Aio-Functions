import { onCall } from 'firebase-functions/v2/https';
import { buildCloudContext } from '../context/cloudContext';
import { dispatchAction } from '../dispatch/dispatchAction';

export const publicDevGateway = onCall({ timeoutSeconds: 3600 }, async (request: any) => {
    const rawData =
        request?.data && typeof request.data === 'object' && request.data !== null
            ? request.data
            : {};

    const action =
        typeof rawData?.action === 'string' && rawData.action.trim()
            ? rawData.action.trim()
            : null;

    if (!action) {
        return {
            ok: false,
            error: {
                code: 'VALIDATION_FAILED',
                message: 'action is required',
            },
            meta: {
                requestId: null,
                serverTime: new Date().toISOString(),
            },
        };
    }

    const resolvedStoreId =
        typeof rawData?.storeId === 'string' && rawData.storeId.trim()
            ? rawData.storeId.trim()
            : typeof rawData?.payload?.storeId === 'string' && rawData.payload.storeId.trim()
                ? rawData.payload.storeId.trim()
                : undefined;

    const req = {
        action,
        payload: rawData?.payload ?? {},
        meta: rawData?.meta ?? {},
        storeId: resolvedStoreId,
    };

    // @ts-ignore
    const ctx = await buildCloudContext('public', request, resolvedStoreId, req.meta);

    return dispatchAction('public', req as any, ctx);
});