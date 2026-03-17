import { DataSource } from 'typeorm';

export interface RiderAuthScope {
  riderId: string;
  uid: string;
  role: 'rider';
  storeId: string;
  branchId?: string | null;
  displayName?: string | null;
  phone?: string | null;
  vehicleType?: string | null;
  status: string;
  presenceStatus: string;
  activeOrderId?: string | null;
  activeTripId?: string | null;
  lastSeenAt?: string | null;
}

export interface EnvelopeRequest {
  action: string;
  storeId?: string;
  payload?: unknown;
  meta?: Record<string, unknown>;
}

export interface ResponseMeta {
  requestId: string;
  serverTime: string;
}

export interface ErrorPayload {
  code: string;
  message: string;
  details?: unknown;
}

export interface SuccessResponse {
  ok: true;
  data: unknown;
  meta: ResponseMeta;
}

export interface ErrorResponse {
  ok: false;
  error: ErrorPayload;
  meta: ResponseMeta;
}

export type UnifiedResponse = SuccessResponse | ErrorResponse;

export interface ActionContext {
  requestId: string;
  serverTime: string;
  uid?: string;
  storeId?: string;
  meta?: Record<string, unknown>;
  gateway: 'public' | 'client' | 'admin' | 'delivery';
  runtime?: 'cloud';
  auth?: {
    uid?: string;
    isAnonymous?: boolean;
    token?: Record<string, unknown>;
    admin?: {
      roles: string[];
      status: string;
      storeAccess: string[];
    };
    rider?: RiderAuthScope;
  };
  ip?: string;
  userAgent?: string;
  db: DataSource;
  logger: {
    info: (msg: string, data?: unknown) => void;
    error: (msg: string, data?: unknown) => void;
    warn: (msg: string, data?: unknown) => void;
  };
}

export type ActionHandler<TPayload = any> = (ctx: ActionContext, payload: TPayload) => Promise<unknown>;
