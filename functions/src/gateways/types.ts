import { CallableRequest } from 'firebase-functions/v2/https';
import { EntityManager } from 'typeorm';

export type GatewayRequest = {
  action: string;
  storeId?: string;
  payload?: Record<string, unknown>;
  meta?: Record<string, unknown>;
};

export type GatewayOk = { ok: true; data: unknown; meta?: Record<string, unknown> };
export type GatewayErr = { ok: false; error: { code: string; message: string }; meta?: Record<string, unknown> };
export type GatewayResponse = GatewayOk | GatewayErr;

export type GatewayCtx = {
  request: CallableRequest<GatewayRequest>;
  action: string;
  storeId?: string;
  payload: Record<string, unknown>;
  uid: string | null;
  manager?: EntityManager;
};

export type ActionContract = { validate: (payload: unknown) => Record<string, unknown> };
export type ActionHandler = (ctx: GatewayCtx) => Promise<unknown>;

export type ActionRegistryItem = {
  gateway: 'public' | 'client' | 'admin';
  requiresAuth: boolean;
  requiresStore: boolean;
  contract: ActionContract;
  handler: ActionHandler;
};
