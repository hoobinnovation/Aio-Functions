import { getBucketName } from './storage';

function encodeStoragePath(path: string): string {
  return path
    .split('/')
    .filter(Boolean)
    .map((segment) => encodeURIComponent(segment))
    .join('/');
}

export function resolveMediaPublicUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  const trimmed = path.trim();
  if (!trimmed) return null;

  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }

  if (trimmed.startsWith('gs://')) {
    const withoutScheme = trimmed.slice(5);
    const slashIdx = withoutScheme.indexOf('/');
    if (slashIdx <= 0) return null;
    const bucket = withoutScheme.slice(0, slashIdx);
    const objectPath = withoutScheme.slice(slashIdx + 1);
    return `https://storage.googleapis.com/${bucket}/${encodeStoragePath(objectPath)}`;
  }

  const bucket = getBucketName();
  if (!bucket) return null;
  return`gs:${encodeStoragePath(trimmed)}`;
}
