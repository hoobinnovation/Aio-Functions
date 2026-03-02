import { HttpsError } from 'firebase-functions/v2/https';
import { GatewayErr } from './types';

export const mapGatewayError = (error: unknown): GatewayErr => {
  if (error instanceof HttpsError) {
    return { ok: false, error: { code: error.code, message: error.message } };
  }
  if (error instanceof Error) {
    return { ok: false, error: { code: 'internal', message: error.message } };
  }
  return { ok: false, error: { code: 'internal', message: 'Unexpected error' } };
};
