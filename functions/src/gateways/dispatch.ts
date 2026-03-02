import { randomUUID } from 'crypto';
import { CallableRequest } from 'firebase-functions/v2/https';
import { ensureAdminCtx, buildCtx, writeGatewayAudit } from './ctx';
import { mapGatewayError } from './errorMap';
import { ACTION_SPEC_BY_NAME } from './actionsSpec';
import { ActionRegistryItem, GatewayRequest, GatewayResponse } from './types';

const nowIso = (): string => new Date().toISOString();

type DispatchOptions = {
  request: CallableRequest<GatewayRequest>;
  registry: Record<string, ActionRegistryItem>;
  gateway: 'public' | 'client' | 'admin';
};

export async function dispatchGateway({ request, registry, gateway }: DispatchOptions): Promise<GatewayResponse> {
  const requestId = randomUUID();
  const serverTime = nowIso();

  try {
    const action = String(request.data?.action ?? '');
    const entry = registry[action];
    if (!entry) {
      return { ok: false, error: { code: 'invalid-argument', message: 'Unknown action' }, meta: { requestId, serverTime } };
    }

    const ctx = buildCtx(request as unknown as { data: GatewayRequest; auth?: { uid?: string } | null }, entry);
    if (gateway === 'admin') {
      const spec = ACTION_SPEC_BY_NAME.get(action);
      await ensureAdminCtx(ctx, spec?.role);
    }

    ctx.payload = entry.contract.validate(request.data?.payload ?? {});
    const data = await entry.handler(ctx);
    await writeGatewayAudit(ctx);
    return { ok: true, data, meta: { requestId, serverTime } };
  } catch (error) {
    const mapped = mapGatewayError(error);
    return { ...mapped, meta: { requestId, serverTime } };
  }
}
