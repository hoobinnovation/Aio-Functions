import { AdminRole } from '../entities/AdminRole';
import { AdminStoreAccess } from '../entities/AdminStoreAccess';
import { AdminUser } from '../entities/AdminUser';
import { ACTION_ROLE_MAP } from '../core/rbac';
import { RequestContext } from '../context/requestContext';
import { STABLE_ERROR_CODES } from '../protocol/errorCodes';

export { ACTION_ROLE_MAP };

export async function resolveAdminAuth(ctx: RequestContext): Promise<RequestContext['auth']['admin']> {
  const uid = ctx.auth.uid;
  if (!uid) {
    return undefined;
  }

  const user = await ctx.db.getRepository(AdminUser).findOne({ where: { uid } });
  const roles = await ctx.db.getRepository(AdminRole).find({ where: { adminUid: uid } });
  const storeAccessRows = await ctx.db.getRepository(AdminStoreAccess).find({ where: { adminUid: uid } });

  return {
    status: user?.status ?? 'missing',
    roles: roles.map((role: AdminRole) => role.role),
    storeAccess: storeAccessRows.map((row: AdminStoreAccess) => row.storeId),
  };
}

export function enforceAdminRbac(ctx: RequestContext, action: string, storeId?: string): void {
  const policy = ACTION_ROLE_MAP[action];
  if (!policy) {
    const err = new Error('Action was not found in RBAC policy map.');
    (err as Error & { code?: string }).code = STABLE_ERROR_CODES.NOT_FOUND;
    throw err;
  }

  const admin = ctx.auth.admin;
  if (!admin || admin.status !== 'active') {
    const err = new Error('Admin user is not active.');
    (err as Error & { code?: string }).code = STABLE_ERROR_CODES.FORBIDDEN;
    throw err;
  }

  const hasRole = policy.rolesAllowed.some((role) => admin.roles.includes(role));
  if (!hasRole) {
    const err = new Error('Missing required admin role.');
    (err as Error & { code?: string }).code = STABLE_ERROR_CODES.FORBIDDEN;
    throw err;
  }

  if (policy.storeAccessRequired) {
    if (!storeId) {
      const err = new Error('storeId is required for this action.');
      (err as Error & { code?: string }).code = STABLE_ERROR_CODES.STORE_ACCESS_REQUIRED;
      throw err;
    }
    if (!admin.storeAccess.includes(storeId)) {
      const err = new Error('Missing store access.');
      (err as Error & { code?: string }).code = STABLE_ERROR_CODES.STORE_ACCESS_REQUIRED;
      throw err;
    }
  }
}
