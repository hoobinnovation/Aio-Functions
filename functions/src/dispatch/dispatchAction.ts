import { AppError, toAppError } from '../core/errors';
import { ActionHandler } from '../core/protocol';
import { isValidActionName } from '../actions/catalogs';
import { RequestContext } from '../context/requestContext';
import { STABLE_ERROR_CODES } from '../protocol/errorCodes';
import { Gateway, UnifiedRequest, UnifiedResponse } from '../protocol/envelopes';
import { ACTION_REGISTRIES } from '../registries/actionRegistries';
import { enforceAdminRbac } from '../rbac/adminRbac';
import { ACTION_SPECS } from '../specs/actionSpecs';

function toErrorResponse(err: unknown, requestId: string, serverTime: string): UnifiedResponse {
    const rawCode =
        typeof err === 'object' && err !== null && 'code' in err
            ? String((err as { code: unknown }).code)
            : undefined;

    const appErr = err instanceof AppError ? err : toAppError(err);
    const mappedCode = mapErrorCode(rawCode ?? appErr.code);

    return {
        ok: false,
        error: {
            code: mappedCode,
            message: mappedCode === STABLE_ERROR_CODES.INTERNAL ? 'Internal server error' : appErr.message,
            details: appErr.details,
        },
        meta: { requestId, serverTime },
    };
}

function mapErrorCode(code: string): string {
    switch (code) {
        case 'AUTH_REQUIRED':
        case 'UNAUTHENTICATED':
            return STABLE_ERROR_CODES.AUTH_REQUIRED;

        case 'FORBIDDEN':
            return STABLE_ERROR_CODES.FORBIDDEN;

        case 'STORE_ACCESS_REQUIRED':
            return STABLE_ERROR_CODES.STORE_ACCESS_REQUIRED;

        case 'VALIDATION_FAILED':
        case 'VALIDATION_ERROR':
            return STABLE_ERROR_CODES.VALIDATION_FAILED;

        case 'EDGE_NODE_FORBIDDEN':
            return 'EDGE_NODE_FORBIDDEN';

        case 'EDGE_SIGNATURE_INVALID':
            return 'EDGE_SIGNATURE_INVALID';

        case 'DINE_IN_DISABLED':
            return 'DINE_IN_DISABLED';

        case 'DINE_IN_SECURE_TABLE_MODE_DISABLED':
            return 'DINE_IN_SECURE_TABLE_MODE_DISABLED';

        case 'DINE_IN_QR_INVALID':
            return 'DINE_IN_QR_INVALID';

        case 'DINE_IN_QR_SIGNATURE_INVALID':
            return 'DINE_IN_QR_SIGNATURE_INVALID';

        case 'DINE_IN_TABLE_NOT_FOUND':
            return 'DINE_IN_TABLE_NOT_FOUND';

        case 'DINE_IN_TABLE_NOT_ACTIVE':
            return 'DINE_IN_TABLE_NOT_ACTIVE';

        case 'DINE_IN_BRANCH_NOT_FOUND':
            return 'DINE_IN_BRANCH_NOT_FOUND';

        case 'DINE_IN_BRANCH_NOT_ELIGIBLE':
            return 'DINE_IN_BRANCH_NOT_ELIGIBLE';

        case 'DINE_IN_GEO_REQUIRED':
            return 'DINE_IN_GEO_REQUIRED';

        case 'DINE_IN_GEO_OUT_OF_RANGE':
            return 'DINE_IN_GEO_OUT_OF_RANGE';

        case 'DINE_IN_SESSION_NOT_FOUND':
            return 'DINE_IN_SESSION_NOT_FOUND';

        case 'DINE_IN_SESSION_EXPIRED':
            return 'DINE_IN_SESSION_EXPIRED';

        case 'DINE_IN_SESSION_CLOSED':
            return 'DINE_IN_SESSION_CLOSED';

        case 'DINE_IN_SESSION_REQUIRED':
            return 'DINE_IN_SESSION_REQUIRED';

        case 'DINE_IN_SESSION_CLOSE_NOT_ALLOWED':
            return 'DINE_IN_SESSION_CLOSE_NOT_ALLOWED';

        case 'NOT_FOUND':
        case 'ACTION_NOT_FOUND':
        case 'SPEC_MISSING':
            return STABLE_ERROR_CODES.NOT_FOUND;

        default:
            return STABLE_ERROR_CODES.INTERNAL;
    }
}

function validatePayload(gateway: Gateway, action: string, payload: unknown): unknown {
    const spec = ACTION_SPECS[gateway][action];

    if (!spec) {
        throw new AppError(STABLE_ERROR_CODES.NOT_FOUND, `No spec registered for action ${action}`);
    }

    const { error, value } = spec.schema.validate(payload, {
        abortEarly: false,
        allowUnknown: false,
        stripUnknown: false,
    });

    if (error) {
        throw new AppError(STABLE_ERROR_CODES.VALIDATION_FAILED, 'Validation failed', {
            issues: error.details.map((detail: { message: string }) => detail.message),
        });
    }

    return value;
}

function getStoreIdForRbac(request: UnifiedRequest, validatedPayload: unknown): string | undefined {
    if (request.storeId) {
        return request.storeId;
    }

    if (validatedPayload && typeof validatedPayload === 'object' && 'storeId' in validatedPayload) {
        return (validatedPayload as { storeId?: string }).storeId;
    }

    return undefined;
}

export async function dispatchAction(
    gateway: Gateway,
    request: UnifiedRequest,
    ctx: RequestContext
): Promise<UnifiedResponse> {
    try {
        if (!isValidActionName(request.action)) {
            throw new AppError(STABLE_ERROR_CODES.VALIDATION_FAILED, 'Invalid action format');
        }

        if (gateway !== 'public' && !ctx.auth.uid) {
            throw new AppError(STABLE_ERROR_CODES.AUTH_REQUIRED, 'Authentication required');
        }

        const registry = ACTION_REGISTRIES[gateway] as Record<string, ActionHandler>;
        const handler = registry[request.action];

        if (!handler) {
            throw new AppError(STABLE_ERROR_CODES.NOT_FOUND, `Action ${request.action} was not found`);
        }

        const payload = validatePayload(gateway, request.action, request.payload);

        if (gateway === 'admin') {
            const rbacStoreId = getStoreIdForRbac(request, payload);
            enforceAdminRbac(ctx, request.action, rbacStoreId);
        }

        const data = await handler(ctx as any, payload as any);

        return {
            ok: true,
            data,
            meta: { requestId: ctx.requestId, serverTime: ctx.serverTime },
        };
    } catch (err) {
        return toErrorResponse(err, ctx.requestId, ctx.serverTime);
    }
}
