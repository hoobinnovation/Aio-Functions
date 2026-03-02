import { onCall } from 'firebase-functions/v2/https';
import { AppError } from '../core/errors';
import { getInitializedDataSource } from '../core/db';
import { createLogger } from '../core/logging';
import { registryClient } from './registries';
import { executeWithProtocol, responseMeta, validateActionPayload, validateEnvelope } from './helpers';

export const clientGateway = onCall(async (request: any) => {
  const meta = responseMeta();
  const logger = createLogger(`client:${meta.requestId}`);
  return executeWithProtocol(async () => {
    if (!request.auth?.uid) throw new AppError('UNAUTHENTICATED', 'Authentication required');
    const envelope = validateEnvelope(request.data);
    const handler = registryClient.get(envelope.action);
    if (!handler) throw new AppError('ACTION_NOT_FOUND', `Unknown action ${envelope.action}`);
    const payload = validateActionPayload(envelope.action, envelope.payload);
    const db = await getInitializedDataSource();
    return handler({
      requestId: meta.requestId,
      serverTime: meta.serverTime,
      uid: request.auth.uid,
      storeId: envelope.storeId,
      gateway: 'client',
      db,
      logger,
    }, payload);
  }, meta);
});
