import { EntityManager } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { AppError } from '../core/errors';
import { MediaAsset, MediaKind } from '../entities/MediaAsset';
import { getBucketName } from './storage';

type CreateMediaUploadSpecInput = {
  tx: EntityManager;
  storeId?: string | null;
  ownerType: string;
  ownerId: string;
  kind: MediaKind;
  fileExt: string;
  contentType: string;
  sizeBytes: number | string;
  createdByUid: string;
  finalizeAction: string;
};

export function normalizeMediaFileExtension(fileExt: string): string {
  const normalized = String(fileExt || '')
    .replace(/^\./, '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');

  if (!normalized) {
    throw new AppError('VALIDATION_ERROR', 'File extension is required');
  }

  return normalized;
}

export function buildMediaOriginalPath(params: {
  storeId?: string | null;
  ownerType: string;
  ownerId: string;
  assetId: string;
  fileExt: string;
}): string {
  const ext = normalizeMediaFileExtension(params.fileExt);
  if (params.storeId) {
    return `stores/${params.storeId}/${params.ownerType}/${params.ownerId}/${params.assetId}.${ext}`;
  }
  return `global/${params.ownerType}/${params.ownerId}/${params.assetId}.${ext}`;
}

export async function createMediaUploadSpec(input: CreateMediaUploadSpecInput) {
  const bucketName = getBucketName();
  if (!bucketName) {
    throw new AppError('CONFIG_ERROR', 'Storage bucket is not configured');
  }

  const assetId = uuidv4();
  const originalPath = buildMediaOriginalPath({
    storeId: input.storeId ?? null,
    ownerType: input.ownerType,
    ownerId: input.ownerId,
    assetId,
    fileExt: input.fileExt,
  });

  const asset = input.tx.getRepository(MediaAsset).create({
    id: assetId,
    storeId: input.storeId ?? null,
    ownerType: input.ownerType,
    ownerId: input.ownerId,
    kind: input.kind,
    originalPath,
    thumbnailPath: null,
    contentType: input.contentType,
    sizeBytes: String(input.sizeBytes),
    status: 'created',
    createdByUid: input.createdByUid,
  });
  await input.tx.getRepository(MediaAsset).save(asset);

  return {
    assetId,
    bucket: bucketName,
    originalPath,
    upload: {
      strategy: 'firebase-storage',
      method: 'SDK',
      path: originalPath,
      contentType: input.contentType,
    },
    finalizeHint: {
      action: input.finalizeAction,
      assetId,
    },
  };
}
