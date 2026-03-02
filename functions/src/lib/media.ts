import { invalidArgument, permissionDenied } from './errors';

const extFor = (contentType: string): string => {
  if (contentType === 'image/jpeg') return 'jpg';
  if (contentType === 'image/png') return 'png';
  if (contentType === 'image/webp') return 'webp';
  if (contentType === 'application/pdf') return 'pdf';
  return 'bin';
};

export const buildOriginalPath = (input: {
  storeId?: string;
  ownerType: 'product'|'category'|'banner'|'homeSection'|'landing'|'user'|'insurance'|'other';
  ownerId: string;
  uid: string;
  contentType: string;
}): string => {
  const ext = extFor(input.contentType);
  const rand = `${Date.now()}-${Math.floor(Math.random() * 100000)}`;
  if (input.ownerType === 'user') return `users/${input.uid}/avatars/original/${rand}.${ext}`;
  if (input.ownerType === 'insurance') {
    if (!input.storeId) invalidArgument('storeId is required for insurance media.');
    return `insurance/${input.storeId}/${input.ownerId}/original/file_${rand}.${ext}`;
  }
  if (!input.storeId) invalidArgument('storeId is required.');
  return `stores/${input.storeId}/${input.ownerType}/${input.ownerId}/original/${rand}.${ext}`;
};

export const assertUploadPathOwnership = (path: string, uid: string, ownerType: string): void => {
  if (ownerType === 'user' && !path.startsWith(`users/${uid}/`)) permissionDenied('Invalid media path ownership.');
};

export const thumbFromOriginal = (originalPath: string): string => originalPath.replace('/original/', '/thumb/');
