import { ActionHandler } from '../../gateways/types';
import { mediaCreateUploadSpec as createSpec, mediaFinalizeUpload as finalize } from './service';
import { invalidArgument } from '../../lib/errors';

const asObj = (x: unknown): Record<string, unknown> => (x && typeof x === 'object' ? (x as Record<string, unknown>) : {});

export const mediaCreateUploadSpec: ActionHandler = async (ctx) => {
  if (!ctx.uid) invalidArgument('Authentication required.');
  const uid = ctx.uid as string;
  const p = asObj(ctx.payload);
  const ownerType = String(p.ownerType ?? 'other') as any;
  const ownerId = String(p.ownerId ?? '');
  const kind = String(p.kind ?? 'image') as any;
  const contentType = String(p.contentType ?? '');
  if (!ownerId || !contentType) invalidArgument('ownerId and contentType are required.');
  return createSpec({ uid, storeId: ctx.storeId, ownerType, ownerId, kind, contentType });
};

export const mediaFinalizeUpload: ActionHandler = async (ctx) => {
  if (!ctx.uid) invalidArgument('Authentication required.');
  const uid = ctx.uid as string;
  const p = asObj(ctx.payload);
  const mediaId = String(p.mediaId ?? '');
  const contentType = String(p.contentType ?? '');
  const sizeBytes = Number(p.sizeBytes ?? 0);
  if (!mediaId || !contentType || sizeBytes <= 0) invalidArgument('mediaId/contentType/sizeBytes are required.');
  return finalize({ uid, mediaId, contentType, sizeBytes });
};

export const adminMediaCreateUploadSpec: ActionHandler = mediaCreateUploadSpec;
export const adminMediaFinalizeUpload: ActionHandler = mediaFinalizeUpload;

export const mediaActionHandlers = {
  mediaCreateUploadSpec,
  mediaFinalizeUpload,
  adminMediaCreateUploadSpec,
  adminMediaFinalizeUpload,
};
