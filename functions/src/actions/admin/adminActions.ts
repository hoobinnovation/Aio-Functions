import { EntityManager } from 'typeorm';
import { ActionContext } from '../../core/protocol';
import { AdminUser } from '../../entities/AdminUser';
import { AdminRole } from '../../entities/AdminRole';
import { AdminStoreAccess } from '../../entities/AdminStoreAccess';
import { MediaAsset } from '../../entities/MediaAsset';
import { AppError } from '../../core/errors';
import { getBucketName, getStorage } from '../../utils/storage';
import { v4 as uuidv4 } from 'uuid';
import { Store } from '../../entities/Store';
import { StoreSettings } from '../../entities/StoreSettings';
import { UserProfile } from '../../entities/UserProfile';
import { adminHealthActionsCoverage as adminHealthActionsCoverageCore, actionsListForGateway } from '../../health/actionsHealth';
import { ACTION_ROLE_MAP } from '../../rbac/adminRbac';
import { normalizeListQueryInput } from '../../utils/queryNormalization';

export async function adminHealthWhoAmI(ctx: ActionContext) {
  return { uid: ctx.uid, gateway: ctx.gateway };
}

export async function adminHealthDbCheck(ctx: ActionContext) {
  await ctx.db.query('SELECT 1');
  const names = ['stores', 'admin_users', 'admin_roles', 'admin_store_access', 'user_profiles', 'media_assets'];
  const rows: Array<{ TABLE_NAME: string }> = await ctx.db.query(
    `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME IN (${names.map(() => '?').join(',')})`,
    [process.env.DB_NAME, ...names],
  );
  const found = new Set(rows.map((r) => r.TABLE_NAME));
  const tables = Object.fromEntries(names.map((n) => [n, found.has(n)]));
  return { ping: true, tables };
}

export async function adminHealthActionsCoverage() {
  const coverage = adminHealthActionsCoverageCore();
  return {
    ...coverage,
    hasErrors: [coverage.public, coverage.client, coverage.admin].some((g) => g.extraHandlers.length > 0),
  };
}

export async function adminActionsList(ctx: ActionContext) {
  const actions = actionsListForGateway('admin');
  const allowed = ctx.auth?.admin?.roles?.length
    ? actions.filter((action) => {
        const policy = ACTION_ROLE_MAP[action];
        if (!policy) {
          return false;
        }
        return policy.rolesAllowed.some((role) => ctx.auth!.admin!.roles.includes(role));
      })
    : actions;

  return {
    gateway: 'admin',
    allowedActions: allowed,
  };
}

export async function adminMe(ctx: ActionContext) {
  const user = await ctx.db.getRepository(AdminUser).findOneBy({ uid: ctx.uid! });
  const roles = await ctx.db.getRepository(AdminRole).findBy({ adminUid: ctx.uid! });
  return {
    uid: ctx.uid,
    status: user?.status ?? null,
    roles: roles.map((r: AdminRole) => r.role),
  };
}

export async function adminStoresList(ctx: ActionContext) {
  const stores = await ctx.db.getRepository(Store).find({ order: { updatedAt: 'DESC' as any } });
  return { stores };
}

export async function adminStoresGet(ctx: ActionContext, payload: any) {
  const store = await ctx.db.getRepository(Store).findOneBy({ id: payload.storeId });
  if (!store) throw new AppError('NOT_FOUND', 'Store not found');
  return { store };
}

export async function adminStoresCreate(ctx: ActionContext, payload: any) {
  const existing = await ctx.db.getRepository(Store).findOneBy({ id: payload.storeId });
  if (existing) throw new AppError('CONFLICT', 'Store already exists');
  await ctx.db.transaction(async (tx: EntityManager) => {
    await tx.getRepository(Store).save(tx.getRepository(Store).create({
      id: payload.storeId,
      name: payload.name,
      status: 'active',
      disabledReason: null,
      disabledAt: null,
      disabledByUid: null,
    }));
    await tx.getRepository(StoreSettings).save(tx.getRepository(StoreSettings).create({
      storeId: payload.storeId,
      currency: payload.currency ?? 'USD',
      taxMode: payload.taxMode ?? 'exclusive',
      supportWhatsApp: payload.supportWhatsApp ?? null,
      supportEmail: payload.supportEmail ?? null,
      pickupEnabled: payload.pickupEnabled ?? true,
      deliveryEnabled: payload.deliveryEnabled ?? true,
    }));
  });
  return adminStoresGet(ctx, { storeId: payload.storeId });
}

export async function adminStoresUpdate(ctx: ActionContext, payload: any) {
  await ctx.db.transaction(async (tx: EntityManager) => {
    const res = await tx.getRepository(Store).update({ id: payload.storeId }, { name: payload.name, status: payload.status ?? undefined });
    if (!res.affected) throw new AppError('NOT_FOUND', 'Store not found');
  });
  return adminStoresGet(ctx, { storeId: payload.storeId });
}

export async function adminStoresDisable(ctx: ActionContext, payload: any) {
  await ctx.db.transaction(async (tx: EntityManager) => {
    const res = await tx.getRepository(Store).update({ id: payload.storeId }, {
      status: 'disabled',
      disabledReason: payload.reason ?? null,
      disabledAt: new Date(),
      disabledByUid: ctx.uid!,
    });
    if (!res.affected) throw new AppError('NOT_FOUND', 'Store not found');
  });
  return adminStoresGet(ctx, { storeId: payload.storeId });
}

export async function adminStoreSettingsGet(ctx: ActionContext, payload: any) {
  const settings = await ctx.db.getRepository(StoreSettings).findOneBy({ storeId: payload.storeId });
  if (!settings) throw new AppError('NOT_FOUND', 'Store settings not found');
  return { settings };
}

export async function adminStoreSettingsUpdate(ctx: ActionContext, payload: any) {
  await ctx.db.transaction(async (tx: EntityManager) => {
    await tx.getRepository(StoreSettings).upsert({
      storeId: payload.storeId,
      currency: payload.currency,
      taxMode: payload.taxMode,
      supportWhatsApp: payload.supportWhatsApp ?? null,
      supportEmail: payload.supportEmail ?? null,
      pickupEnabled: payload.pickupEnabled,
      deliveryEnabled: payload.deliveryEnabled,
    }, ['storeId']);
  });
  return adminStoreSettingsGet(ctx, { storeId: payload.storeId });
}

export async function adminCustomersList(ctx: ActionContext, payload: any = {}) {
  const q = normalizeListQueryInput(payload, { defaultPageSize: 20, maxPageSize: 100 });
  const limit = q.limit;
  const offset = q.offset;
  const rows = await ctx.db.getRepository(UserProfile).find({ order: { updatedAt: 'DESC' as any }, take: limit, skip: offset });
  return { customers: rows, limit, offset };
}

export async function adminCustomersGet(ctx: ActionContext, payload: any) {
  const customer = await ctx.db.getRepository(UserProfile).findOneBy({ uid: payload.uid });
  if (!customer) throw new AppError('NOT_FOUND', 'Customer not found');
  return { customer };
}

export async function adminCustomersUpdate(ctx: ActionContext, payload: any) {
  await ctx.db.transaction(async (tx: EntityManager) => {
    const res = await tx.getRepository(UserProfile).update({ uid: payload.uid }, {
      phone: payload.phone ?? null,
      email: payload.email ?? null,
      displayName: payload.displayName ?? null,
      locale: payload.locale ?? null,
      marketingOptIn: payload.marketingOptIn ?? false,
      status: payload.status ?? undefined,
    });
    if (!res.affected) throw new AppError('NOT_FOUND', 'Customer not found');
  });
  return adminCustomersGet(ctx, { uid: payload.uid });
}

export async function adminCustomersDisable(ctx: ActionContext, payload: any) {
  await ctx.db.transaction(async (tx: EntityManager) => {
    const res = await tx.getRepository(UserProfile).update({ uid: payload.uid }, {
      status: 'disabled',
      disabledReason: payload.reason ?? null,
      disabledAt: new Date(),
      disabledByUid: ctx.uid!,
    });
    if (!res.affected) throw new AppError('NOT_FOUND', 'Customer not found');
  });
  return adminCustomersGet(ctx, { uid: payload.uid });
}

export async function adminCustomersSearch(ctx: ActionContext, payload: any = {}) {
  const nq = normalizeListQueryInput(payload, { defaultPageSize: 20, maxPageSize: 100 });
  const q = `%${nq.query || ''}%`;
  const rows = await ctx.db.query(
    'SELECT * FROM user_profiles WHERE uid LIKE ? OR email LIKE ? OR phone LIKE ? OR displayName LIKE ? ORDER BY updatedAt DESC LIMIT ?',
    [q, q, q, q, nq.limit],
  );
  return { customers: rows };
}

export async function adminMediaCreateUploadSpec(ctx: ActionContext, payload: any) {
  const assetId = uuidv4();
  const ext = String(payload.fileExt).replace(/^\./, '').toLowerCase();
  const originalPath = ctx.storeId
    ? `stores/${ctx.storeId}/${payload.ownerType}/${payload.ownerId}/${assetId}.${ext}`
    : `global/${payload.ownerType}/${payload.ownerId}/${assetId}.${ext}`;
  const bucketName = getBucketName();

  await ctx.db.transaction(async (tx: EntityManager) => {
    const asset = tx.getRepository(MediaAsset).create({
      id: assetId,
      storeId: ctx.storeId ?? null,
      ownerType: payload.ownerType,
      ownerId: payload.ownerId,
      kind: payload.kind,
      originalPath,
      thumbnailPath: null,
      contentType: payload.contentType,
      sizeBytes: String(payload.sizeBytes),
      status: 'created',
      createdByUid: ctx.uid!,
    });
    await tx.getRepository(MediaAsset).save(asset);
  });

  const [url] = await getStorage().bucket(bucketName).file(originalPath).getSignedUrl({
    version: 'v4',
    action: 'write',
    expires: Date.now() + 15 * 60 * 1000,
    contentType: payload.contentType,
  });

  return {
    assetId,
    bucket: bucketName,
    originalPath,
    upload: { method: 'PUT', url, headers: { 'Content-Type': payload.contentType } },
    finalizeHint: { action: 'adminMediaFinalizeUpload', assetId },
  };
}

export async function adminMediaFinalizeUpload(ctx: ActionContext, payload: any) {
  const asset = await ctx.db.getRepository(MediaAsset).findOneBy({ id: payload.assetId });
  if (!asset) throw new AppError('NOT_FOUND', 'Asset not found');

  const effectiveStore = ctx.storeId ?? asset.storeId ?? undefined;
  if (effectiveStore) {
    const access = await ctx.db.getRepository(AdminStoreAccess).findOneBy({ adminUid: ctx.uid!, storeId: effectiveStore });
    if (!access) throw new AppError('FORBIDDEN', 'Missing store access for asset store');
  }

  const [metadata] = await getStorage().bucket(getBucketName()).file(asset.originalPath).getMetadata();
  const size = Number(metadata.size || 0);
  if (size > Number(asset.sizeBytes)) {
    throw new AppError('VALIDATION_ERROR', 'Uploaded size exceeds requested size', { requested: asset.sizeBytes, actual: size });
  }
  if (metadata.contentType !== asset.contentType) {
    throw new AppError('VALIDATION_ERROR', 'Uploaded content type mismatch', { requested: asset.contentType, actual: metadata.contentType });
  }

  await ctx.db.transaction(async (tx: EntityManager) => {
    await tx.getRepository(MediaAsset).update(asset.id, {
      contentType: metadata.contentType || asset.contentType,
      sizeBytes: String(size),
      status: asset.kind === 'image' ? 'processing' : 'ready',
    });
  });

  const updated = await ctx.db.getRepository(MediaAsset).findOneByOrFail({ id: asset.id });
  return {
    asset: {
      id: updated.id,
      originalPath: updated.originalPath,
      thumbnailPath: updated.thumbnailPath ?? undefined,
      status: updated.status,
      contentType: updated.contentType,
      sizeBytes: Number(updated.sizeBytes),
      kind: updated.kind,
      ownerType: updated.ownerType,
      ownerId: updated.ownerId,
      storeId: updated.storeId ?? undefined,
    },
  };
}
