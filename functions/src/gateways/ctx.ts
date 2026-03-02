import { getDataSource } from '../db/data-source';
import { writeAudit } from '../lib/audit';
import { verifyAdminRole, verifyStoreAccess } from '../lib/auth';
import { invalidArgument, permissionDenied } from '../lib/errors';
import { ActionRegistryItem, GatewayCtx, GatewayRequest } from './types';

export const buildCtx = (request: { data: GatewayRequest; auth?: { uid?: string } | null }, actionItem: ActionRegistryItem): GatewayCtx => {
  const data = request.data ?? ({} as GatewayRequest);
  if (!data.action || typeof data.action !== 'string') invalidArgument('action is required.');

  const uid = request.auth?.uid ?? null;
  if (actionItem.requiresAuth && !uid) permissionDenied('Authentication required.');
  if (actionItem.requiresStore && !data.storeId) invalidArgument('storeId is required.');

  return {
    request: request as any,
    action: data.action,
    storeId: data.storeId,
    payload: (data.payload ?? {}) as Record<string, unknown>,
    uid,
  };
};

export const ensureAdminCtx = async (ctx: GatewayCtx, requiredRole?: string): Promise<void> => {
  if (!ctx.uid) permissionDenied('Authentication required.');
  const accepted = requiredRole ? ['SUPER_ADMIN', requiredRole] : ['SUPER_ADMIN', 'STORE_ADMIN', 'SUPPORT', 'MARKETING'];
  await verifyAdminRole(ctx.uid, accepted);
  if (ctx.storeId) await verifyStoreAccess(ctx.uid, ctx.storeId);
};

export const writeGatewayAudit = async (ctx: GatewayCtx): Promise<void> => {
  await writeAudit({
    actorType: ctx.uid ? 'user' : 'system',
    actorUid: ctx.uid,
    action: `gateway.${ctx.action}`,
    targetType: 'gateway_action',
    targetId: ctx.action,
    storeId: ctx.storeId ?? null,
    metadata: { payloadKeys: Object.keys(ctx.payload ?? {}) },
  });
};

export const dbHealthCheck = async (): Promise<boolean> => {
  const ds = await getDataSource();
  await ds.query('SELECT 1 as ok');
  return true;
};
