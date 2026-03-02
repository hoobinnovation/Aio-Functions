import { getStorage } from 'firebase-admin/storage';
import { getDataSource } from '../../db/data-source';
import { MediaAssetEntity } from '../../db/entities/MediaAssetEntity';
import { buildOriginalPath, assertUploadPathOwnership } from '../../lib/media';
import { invalidArgument, notFound } from '../../lib/errors';

export const mediaCreateUploadSpec = async (input: {
  uid: string;
  storeId?: string;
  ownerType: 'product'|'category'|'banner'|'homeSection'|'landing'|'user'|'insurance'|'other';
  ownerId: string;
  kind: 'image'|'document';
  contentType: string;
}): Promise<{ mediaId: string; originalPath: string; uploadUrl: string; expiresAt: string }> => {
  if (input.kind === 'image' && !input.contentType.startsWith('image/')) invalidArgument('Invalid image contentType.');
  if (input.kind === 'document' && input.contentType !== 'application/pdf') invalidArgument('Only pdf documents are allowed.');

  const originalPath = buildOriginalPath({
    storeId: input.storeId,
    ownerType: input.ownerType,
    ownerId: input.ownerId,
    uid: input.uid,
    contentType: input.contentType,
  });

  const ds = await getDataSource();
  const repo = ds.getRepository(MediaAssetEntity);
  const created = await repo.save(repo.create({
    storeId: input.storeId ?? null,
    ownerType: input.ownerType,
    ownerId: input.ownerId,
    kind: input.kind,
    originalPath,
    thumbnailPath: null,
    contentType: input.contentType,
    sizeBytes: '0',
    status: 'created',
    createdByUid: input.uid,
  }));

  const expires = Date.now() + 1000 * 60 * 15;
  const [uploadUrl] = await getStorage().bucket().file(originalPath).getSignedUrl({ version: 'v4', action: 'write', expires });
  return { mediaId: created.id, originalPath, uploadUrl, expiresAt: new Date(expires).toISOString() };
};

export const mediaFinalizeUpload = async (input: {
  uid: string;
  mediaId: string;
  contentType: string;
  sizeBytes: number;
}): Promise<{ mediaId: string; status: string }> => {
  const repo = (await getDataSource()).getRepository(MediaAssetEntity);
  const row = await repo.findOne({ where: { id: input.mediaId } });
  if (!row) notFound('Media asset not found.');
  if (row.createdByUid !== input.uid) notFound('Media asset not found.');
  assertUploadPathOwnership(row.originalPath, input.uid, row.ownerType);

  const [exists] = await getStorage().bucket().file(row.originalPath).exists();
  if (!exists) invalidArgument('Original file not found in Storage.');

  row.contentType = input.contentType;
  row.sizeBytes = String(input.sizeBytes);
  row.status = row.kind === 'image' ? 'processing' : 'ready';
  await repo.save(row);
  return { mediaId: row.id, status: row.status };
};
