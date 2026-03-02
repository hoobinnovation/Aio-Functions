import os from 'os';
import path from 'path';
import fs from 'fs/promises';
import sharp from 'sharp';
import { onObjectFinalized } from 'firebase-functions/v2/storage';
import { getStorage } from 'firebase-admin/storage';
import { getDataSource } from '../db/data-source';
import { MediaAssetEntity } from '../db/entities/MediaAssetEntity';
import { thumbFromOriginal } from '../lib/media';

export const storageThumbnails = onObjectFinalized(async (event) => {
  const objectPath = event.data.name;
  if (!objectPath || !objectPath.includes('/original/')) return;

  const ds = await getDataSource();
  const repo = ds.getRepository(MediaAssetEntity);
  const asset = await repo.findOne({ where: { originalPath: objectPath } });
  if (!asset || asset.kind !== 'image') return;

  const bucket = getStorage().bucket(event.data.bucket);
  const tempIn = path.join(os.tmpdir(), path.basename(objectPath));
  const tempOut = path.join(os.tmpdir(), `thumb-${path.basename(objectPath).replace(/\.[^.]+$/, '.jpg')}`);

  try {
    await bucket.file(objectPath).download({ destination: tempIn });
    const info = await sharp(tempIn).metadata();
    await sharp(tempIn).resize({ width: 320, withoutEnlargement: true }).jpeg({ quality: 80 }).toFile(tempOut);
    const thumbPath = thumbFromOriginal(objectPath).replace(/\.[^.]+$/, '.jpg');
    await bucket.upload(tempOut, { destination: thumbPath, contentType: 'image/jpeg' });

    const tInfo = await sharp(tempOut).metadata();
    asset.width = info.width ?? null;
    asset.height = info.height ?? null;
    asset.thumbWidth = tInfo.width ?? null;
    asset.thumbHeight = tInfo.height ?? null;
    asset.thumbnailPath = thumbPath;
    asset.status = 'ready';
    await repo.save(asset);
  } catch (_e) {
    asset.status = 'failed';
    await repo.save(asset);
  } finally {
    await fs.rm(tempIn, { force: true });
    await fs.rm(tempOut, { force: true });
  }
});
