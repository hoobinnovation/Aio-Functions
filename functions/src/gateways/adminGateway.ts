import { onCall } from 'firebase-functions/v2/https';
import { actionRegistry } from './actionRegistry';
import { buildCtx, ensureAdminCtx, writeGatewayAudit } from './ctx';
import { ACTION_SPEC_BY_NAME } from './actionsSpec';
import { mapGatewayError } from './errorMap';
import { GatewayResponse } from './types';

export const admin = onCall(async (request): Promise<GatewayResponse> => {
  try {
    const action = String(request.data?.action ?? '');
    const entry = actionRegistry[action];
    if (!entry || entry.gateway !== 'admin') return { ok: false, error: { code: 'invalid-argument', message: 'Unknown action' } };
    const ctx = buildCtx(request as any, entry);
    const spec = ACTION_SPEC_BY_NAME.get(action);
    await ensureAdminCtx(ctx, spec?.role);
    ctx.payload = entry.contract.validate(request.data?.payload ?? {});
    const data = await entry.handler(ctx);
    await writeGatewayAudit(ctx);
    return { ok: true, data, meta: { action } };
  } catch (error) {
    return mapGatewayError(error);
  }
});
