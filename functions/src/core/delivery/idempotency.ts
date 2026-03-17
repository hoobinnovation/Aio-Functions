import { createHash } from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { AppError } from '../errors';
import { DeliveryActionRequest } from '../../entities/DeliveryActionRequest';

type DeliveryTx = any;

function sortValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => sortValue(item));
  }
  if (!value || typeof value !== 'object') {
    return value;
  }
  return Object.keys(value as Record<string, unknown>)
    .sort()
    .reduce<Record<string, unknown>>((acc, key) => {
      acc[key] = sortValue((value as Record<string, unknown>)[key]);
      return acc;
    }, {});
}

export function stableHash(value: unknown): string {
  return createHash('sha256')
    .update(JSON.stringify(sortValue(value)))
    .digest('hex');
}

export function resolveIdempotencyKey(meta?: Record<string, unknown>, payload?: Record<string, unknown>): string | null {
  const fromMeta = typeof meta?.idempotencyKey === 'string' ? meta.idempotencyKey.trim() : '';
  if (fromMeta) return fromMeta;
  const fromPayload = typeof payload?.idempotencyKey === 'string' ? payload.idempotencyKey.trim() : '';
  return fromPayload || null;
}

function parseJson(value: unknown): Record<string, unknown> | null {
  if (!value) return null;
  if (typeof value === 'object') return value as Record<string, unknown>;
  try {
    return JSON.parse(String(value)) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export interface IdempotencyContext {
  gateway: 'delivery' | 'admin';
  actorId: string;
  actionName: string;
  idempotencyKey: string | null;
  requestFingerprint: string;
  orderId?: string | null;
}

export async function beginIdempotentRequest(tx: DeliveryTx, input: IdempotencyContext) {
  if (!input.idempotencyKey) {
    return null;
  }

  const rows = await tx.query(
    `SELECT * FROM delivery_action_requests
     WHERE gateway = ? AND actorId = ? AND actionName = ? AND idempotencyKey = ?
     LIMIT 1 FOR UPDATE`,
    [input.gateway, input.actorId, input.actionName, input.idempotencyKey]
  );
  const existing = rows[0] ?? null;

  if (existing) {
    if (existing.requestHash !== input.requestFingerprint) {
      throw new AppError('IDEMPOTENCY_KEY_REUSED', 'The same idempotency key was reused for a different request payload');
    }
    return existing;
  }

  const request = tx.getRepository(DeliveryActionRequest).create({
    id: uuidv4(),
    gateway: input.gateway,
    actorId: input.actorId,
    actionName: input.actionName,
    idempotencyKey: input.idempotencyKey,
    requestHash: input.requestFingerprint,
    orderId: input.orderId ?? null,
    status: 'pending',
    responseJson: null,
  });
  await tx.getRepository(DeliveryActionRequest).save(request);
  return request;
}

export async function completeIdempotentRequest(
  tx: DeliveryTx,
  requestId: string | null | undefined,
  response: Record<string, unknown>
) {
  if (!requestId) return;
  await tx.getRepository(DeliveryActionRequest).update(
    { id: requestId },
    { status: 'completed', responseJson: response as any }
  );
}

export function readIdempotentResponse(existing: any): Record<string, unknown> | null {
  if (!existing || existing.status !== 'completed') {
    return null;
  }
  return parseJson(existing.responseJson);
}
