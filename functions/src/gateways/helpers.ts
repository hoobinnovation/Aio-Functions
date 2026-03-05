import { v4 as uuidv4 } from 'uuid';
import { AppError, toAppError } from '../core/errors';
import { EnvelopeRequest, UnifiedResponse } from '../core/protocol';
import { envelopeSchema, validateOrThrow, ACTION_SPECS } from '../core/validate';

export function responseMeta() {
  return { requestId: uuidv4(), serverTime: new Date().toISOString() };
}

export async function executeWithProtocol(fn: () => Promise<unknown>, meta: { requestId: string; serverTime: string }): Promise<UnifiedResponse> {
  try {
    const data = await fn();
    return { ok: true, data, meta };
  } catch (err) {
    const appErr = toAppError(err);
    return {
      ok: false,
      error: { code: appErr.code, message: appErr.message, details: appErr.details },
      meta,
    };
  }
}

export function validateEnvelope(data: unknown): EnvelopeRequest {

    return validateOrThrow(envelopeSchema, data);
}

export function validateActionPayload(action: string, payload: unknown): unknown {
  const spec = ACTION_SPECS[action];
  if (!spec) {
    throw new AppError('SPEC_MISSING', `Action spec missing: ${action}`);
  }
  return validateOrThrow(spec.schema, payload);
}
