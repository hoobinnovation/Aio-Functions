import sharp from 'sharp';
import { onObjectFinalized } from 'firebase-functions/v2/storage';
import { getStorage } from 'firebase-admin/storage';
import { getDataSource } from '../db/data-source';
import { MediaAssetEntity } from '../db/entities/MediaAssetEntity';
import { thumbFromOriginal } from '../lib/media';

export const storageThumbnails_onFinalize = onObjectFinalized(async (event) => {
  const objectPath = event.data.name;
  if (!objectPath || !objectPath.includes('/original/')) return;

  const ds = await getDataSource();
  const repo = ds.getRepository(MediaAssetEntity);
  const asset = await repo.findOne({ where: { originalPath: objectPath } });
  if (!asset || asset.kind !== 'image') return;

  const bucket = getStorage().bucket(event.data.bucket);

  try {
    const [originalBuffer] = await bucket.file(objectPath).download();
    const meta = await sharp(originalBuffer).metadata();
    const thumbBuffer = await sharp(originalBuffer).resize({ width: 320, withoutEnlargement: true }).jpeg({ quality: 80 }).toBuffer();

    const thumbPath = thumbFromOriginal(objectPath).replace(/\.[^.]+$/, '.jpg');
    await bucket.file(thumbPath).save(thumbBuffer, { contentType: 'image/jpeg' });
    const tMeta = await sharp(thumbBuffer).metadata();

    asset.width = meta.width ?? null;
    asset.height = meta.height ?? null;
    asset.thumbWidth = tMeta.width ?? null;
    asset.thumbHeight = tMeta.height ?? null;
    asset.thumbnailPath = thumbPath;
    asset.status = 'ready';
    await repo.save(asset);
  } catch (_error) {
    asset.status = 'failed';
    await repo.save(asset);
  }
});
