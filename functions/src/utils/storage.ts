import { Storage } from '@google-cloud/storage';

const storage = new Storage();

export function getBucketName(): string {
  return process.env.MEDIA_BUCKET || process.env.FIREBASE_STORAGE_BUCKET || 'gs://aio-erp-sys.appspot.com';
}

export function getStorage() {
  return storage;
}
