import { EntityManager } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { ActionContext } from '../../core/protocol';
import { actionsListForGateway } from '../../health/actionsHealth';
import { MediaAsset } from '../../entities/MediaAsset';
import { AppError } from '../../core/errors';
import { getBucketName, getStorage } from '../../utils/storage';
import { UserProfile } from '../../entities/UserProfile';
import { UserAddress } from '../../entities/UserAddress';
import { UserAccountDeleteRequest } from '../../entities/UserAccountDeleteRequest';
import { Store } from '../../entities/Store';
import { UserStoreContext } from '../../entities/UserStoreContext';

function extSafe(ext: string) {
  return ext.replace(/^\./, '').toLowerCase();
}

async function requireProfile(ctx: ActionContext): Promise<UserProfile> {
  const p = await ctx.db.getRepository(UserProfile).findOneBy({ uid: ctx.uid! });
  if (!p) throw new AppError('NOT_FOUND', 'User profile not found');
  return p;
}

async function requireActiveProfileForWrite(ctx: ActionContext): Promise<UserProfile> {
  const p = await requireProfile(ctx);
  if (p.status !== 'active') throw new AppError('ACCOUNT_DISABLED', 'Profile is not active');
  return p;
}

export async function clientHealthWhoAmI(ctx: ActionContext) {
  return { uid: ctx.uid, gateway: ctx.gateway };
}

export async function clientActionsList() {
  return {
    gateway: 'client',
    allowedActions: actionsListForGateway('client'),
  };
}

export async function authEnsureUserProfile(ctx: ActionContext) {
  let profile = await ctx.db.getRepository(UserProfile).findOneBy({ uid: ctx.uid! });
  if (!profile) {
    await ctx.db.transaction(async (tx: EntityManager) => {
      profile = tx.getRepository(UserProfile).create({ uid: ctx.uid!, status: 'active' });
      await tx.getRepository(UserProfile).save(profile);
    });
  }
  return { profile };
}

export async function profileGet(ctx: ActionContext) {
  const profile = await requireProfile(ctx);
  return { profile };
}

export async function profileUpdate(ctx: ActionContext, payload: any) {
  await requireActiveProfileForWrite(ctx);
  await ctx.db.transaction(async (tx: EntityManager) => {
    await tx.getRepository(UserProfile).update({ uid: ctx.uid! }, {
      phone: payload.phone ?? null,
      email: payload.email ?? null,
      displayName: payload.displayName ?? null,
      locale: payload.locale ?? null,
      marketingOptIn: payload.marketingOptIn ?? false,
    });
  });
  return profileGet(ctx);
}

export async function accountDeleteRequest(ctx: ActionContext, payload: any) {
  await requireProfile(ctx);
  const repo = ctx.db.getRepository(UserAccountDeleteRequest);
  const existing = await repo.findOne({ where: { uid: ctx.uid!, status: 'pending' } })
    || await repo.findOne({ where: { uid: ctx.uid!, status: 'approved' } });
  if (existing) return { request: existing, idempotent: true };

  const id = uuidv4();
  await ctx.db.transaction(async (tx: EntityManager) => {
    const req = tx.getRepository(UserAccountDeleteRequest).create({
      id,
      uid: ctx.uid!,
      reason: payload.reason ?? null,
      status: 'pending',
      requestedAt: new Date(),
      reviewedAt: null,
      reviewedByUid: null,
    });
    await tx.getRepository(UserAccountDeleteRequest).save(req);
    await tx.getRepository(UserProfile).update({ uid: ctx.uid! }, { status: 'deleted_pending' });
  });
  const created = await repo.findOneByOrFail({ id });
  return { request: created, idempotent: false };
}

export async function addressesList(ctx: ActionContext) {
  const rows = await ctx.db.getRepository(UserAddress).find({ where: { uid: ctx.uid! }, order: { updatedAt: 'DESC' as any } });
  return { addresses: rows };
}

export async function addressesCreate(ctx: ActionContext, payload: any) {
  await requireActiveProfileForWrite(ctx);
  const id = uuidv4();
  await ctx.db.transaction(async (tx: EntityManager) => {
    if (payload.isDefault) {
      await tx.getRepository(UserAddress).update({ uid: ctx.uid! }, { isDefault: false });
    }
    const row = tx.getRepository(UserAddress).create({ ...payload, id, uid: ctx.uid!, isDefault: !!payload.isDefault });
    await tx.getRepository(UserAddress).save(row);
  });
  return { address: await ctx.db.getRepository(UserAddress).findOneByOrFail({ id }) };
}

export async function addressesUpdate(ctx: ActionContext, payload: any) {
  await requireActiveProfileForWrite(ctx);
  const existing = await ctx.db.getRepository(UserAddress).findOneBy({ id: payload.id, uid: ctx.uid! });
  if (!existing) throw new AppError('NOT_FOUND', 'Address not found');
  await ctx.db.transaction(async (tx: EntityManager) => {
    if (payload.isDefault) {
      await tx.getRepository(UserAddress).update({ uid: ctx.uid! }, { isDefault: false });
    }
    await tx.getRepository(UserAddress).update({ id: payload.id, uid: ctx.uid! }, { ...payload, isDefault: payload.isDefault ?? existing.isDefault });
  });
  return { address: await ctx.db.getRepository(UserAddress).findOneByOrFail({ id: payload.id }) };
}

export async function addressesDelete(ctx: ActionContext, payload: any) {
  await requireActiveProfileForWrite(ctx);
  await ctx.db.transaction(async (tx: EntityManager) => {
    const res = await tx.getRepository(UserAddress).delete({ id: payload.id, uid: ctx.uid! });
    if (!res.affected) throw new AppError('NOT_FOUND', 'Address not found');
  });
  return { deleted: true };
}

export async function addressesSetDefault(ctx: ActionContext, payload: any) {
  await requireActiveProfileForWrite(ctx);
  const existing = await ctx.db.getRepository(UserAddress).findOneBy({ id: payload.id, uid: ctx.uid! });
  if (!existing) throw new AppError('NOT_FOUND', 'Address not found');
  await ctx.db.transaction(async (tx: EntityManager) => {
    await tx.getRepository(UserAddress).update({ uid: ctx.uid! }, { isDefault: false });
    await tx.getRepository(UserAddress).update({ id: payload.id, uid: ctx.uid! }, { isDefault: true });
  });
  return { defaultAddressId: payload.id };
}

export async function storesList(ctx: ActionContext) {
  const stores = await ctx.db.getRepository(Store).find({ where: { status: 'active' }, order: { updatedAt: 'DESC' as any } });
  return { stores };
}

export async function storesGet(_ctx: ActionContext, payload: any) {
  const store = await _ctx.db.getRepository(Store).findOneBy({ id: payload.storeId, status: 'active' });
  if (!store) throw new AppError('NOT_FOUND', 'Store not found');
  return { store };
}

export async function storeContextGetMyStore(ctx: ActionContext) {
  const context = await ctx.db.getRepository(UserStoreContext).findOneBy({ uid: ctx.uid! });
  return { context };
}

export async function storeContextSetMyStore(ctx: ActionContext, payload: any) {
  const store = await ctx.db.getRepository(Store).findOneBy({ id: payload.storeId, status: 'active' });
  if (!store) throw new AppError('VALIDATION_ERROR', 'Store is not active');
  await ctx.db.transaction(async (tx: EntityManager) => {
    await tx.getRepository(UserStoreContext).upsert({ uid: ctx.uid!, storeId: payload.storeId }, ['uid']);
  });
  return { context: await ctx.db.getRepository(UserStoreContext).findOneBy({ uid: ctx.uid! }) };
}

export async function mediaCreateUploadSpec(ctx: ActionContext, payload: any) {
  const assetId = uuidv4();
  const ext = extSafe(payload.fileExt);
  const originalPath = ctx.storeId
    ? `stores/${ctx.storeId}/${payload.ownerType}/${payload.ownerId}/${assetId}.${ext}`
    : `global/${payload.ownerType}/${payload.ownerId}/${assetId}.${ext}`;
  const bucketName = getBucketName();
  if (!bucketName) throw new AppError('CONFIG_ERROR', 'Storage bucket is not configured');

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
    upload: {
      method: 'PUT',
      url,
      headers: {
        'Content-Type': payload.contentType,
      },
    },
    finalizeHint: { action: 'mediaFinalizeUpload', assetId },
  };
}

export async function mediaFinalizeUpload(ctx: ActionContext, payload: any) {
  const repo = ctx.db.getRepository(MediaAsset);
  const asset = await repo.findOne({ where: { id: payload.assetId } });
  if (!asset) throw new AppError('NOT_FOUND', 'Asset not found');
  if (asset.createdByUid !== ctx.uid) throw new AppError('FORBIDDEN', 'Asset does not belong to caller');

  const bucketName = getBucketName();
  const [metadata] = await getStorage().bucket(bucketName).file(asset.originalPath).getMetadata();
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

  const updated = await repo.findOneByOrFail({ id: asset.id });
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
