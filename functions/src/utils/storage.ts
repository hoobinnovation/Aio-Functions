import { Storage } from '@google-cloud/storage';

const storage = new Storage();

export function normalizeBucketName(raw: string | null | undefined): string {
  return String(raw || '')
    .replace(/^gs:\/\//i, '')
    .replace(/^\/+|\/+$/g, '')
    .trim();
}

export function getBucketName(): string {
  const raw = process.env.MEDIA_BUCKET || process.env.FIREBASE_STORAGE_BUCKET || 'aio-erp-sys.appspot.com';
  return normalizeBucketName(raw);
}

export function getStorage() {
  return storage;
}
