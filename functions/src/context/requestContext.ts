import { DataSource } from 'typeorm';
import { Gateway } from '../protocol/envelopes';

export interface RequestContext {
  requestId: string;
  serverTime: string;
  gateway: Gateway;
  storeId?: string;
  meta?: Record<string, unknown>;
  runtime: 'cloud';
  uid?: string;
  auth: {
    uid?: string;
    admin?: {
      roles: string[];
      status: string;
      storeAccess: string[];
    };
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
