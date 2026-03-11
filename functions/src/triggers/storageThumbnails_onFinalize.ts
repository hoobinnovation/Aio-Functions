import { onObjectFinalized } from 'firebase-functions/v2/storage';
import { EntityManager } from 'typeorm';
import { getInitializedDataSource } from '../core/db';
import { MediaAsset } from '../entities/MediaAsset';
import { getBucketName, getStorage } from '../utils/storage';

export const storageThumbnails_onFinalize = onObjectFinalized(async (event: any) => {
  const object = event.data;
  if (!object.name || !object.bucket) return;
  if (object.name.startsWith('thumb/') || object.name.includes('/thumb/')) return;
  if (!object.contentType?.startsWith('image/')) return;

  const db = await getInitializedDataSource();
  const repo = db.getRepository(MediaAsset);
  const asset = await repo.findOneBy({ originalPath: object.name });
  if (!asset) {
    console.log('No media asset row for object', object.name);
    return;
  }

  const bucketName = getBucketName() || object.bucket;
  const thumbPath = `thumb/${object.name}`;
  try {
    const bucket = getStorage().bucket(bucketName);
    const [raw] = await bucket.file(object.name).download();
    const sharp = require('sharp');
    const thumb = await sharp(raw).resize(512, 512, { fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 80 }).toBuffer();
    await bucket.file(thumbPath).save(thumb, { contentType: 'image/jpeg' });
    await db.transaction(async (tx: EntityManager) => {
      await tx.getRepository(MediaAsset).update(asset.id, { thumbnailPath: thumbPath, status: 'ready' });
    });
  } catch (error) {
    console.error('Thumbnail generation failed', error);
    await db.transaction(async (tx: EntityManager) => {
      await tx.getRepository(MediaAsset).update(asset.id, { status: 'failed' });
    });
  }
});
