import { onCall } from 'firebase-functions/v2/https';
import { actionRegistry } from './actionRegistry';
import { buildCtx, writeGatewayAudit } from './ctx';
import { mapGatewayError } from './errorMap';
import { GatewayResponse } from './types';

export const publicGateway = onCall(async (request): Promise<GatewayResponse> => {
  try {
    const action = String(request.data?.action ?? '');
    const entry = actionRegistry[action];
    if (!entry || entry.gateway !== 'public') return { ok: false, error: { code: 'invalid-argument', message: 'Unknown action' } };
    const ctx = buildCtx(request as any, entry);
    ctx.payload = entry.contract.validate(request.data?.payload ?? {});
    const data = await entry.handler(ctx);
    await writeGatewayAudit(ctx);
    return { ok: true, data, meta: { action } };
  } catch (error) {
    return mapGatewayError(error);
  }
});
