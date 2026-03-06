import { createLogger } from '../core/logging';
import { getInitializedDataSource } from '../db/dataSource';
import { Gateway } from '../protocol/envelopes';
import { createRequestMeta } from '../protocol/requestId';
import { RequestContext } from './requestContext';

export async function buildCloudContext(gateway: Gateway, request: any, storeId?: string, requestMeta?: Record<string, unknown>): Promise<RequestContext> {
  const requestInfo = createRequestMeta();
  return {
    ...requestInfo,
    gateway,
    storeId,
    meta: requestMeta,
    runtime: 'cloud',
    uid: request.auth?.uid,
    auth: {
      uid: request.auth?.uid,
    },
    ip: request.rawRequest?.ip,
    userAgent: request.rawRequest?.get?.('user-agent') ?? undefined,
    db: await getInitializedDataSource(),
    logger: createLogger(`${gateway}:${requestInfo.requestId}`),
  };
}
