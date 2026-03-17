export type Gateway = 'public' | 'client' | 'admin' | 'delivery';
export type CloudGateway = Gateway | 'webhook';

export interface UnifiedRequest {
  action: string;
  storeId?: string;
  payload?: unknown;
  meta?: Record<string, unknown>;
}

export interface ResponseMeta {
  requestId: string;
  serverTime: string;
}

export interface UnifiedSuccess {
  ok: true;
  data: unknown;
  meta: ResponseMeta;
}

export interface UnifiedError {
  ok: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
  meta: ResponseMeta;
  raw:any
}

export type UnifiedResponse = UnifiedSuccess | UnifiedError;
