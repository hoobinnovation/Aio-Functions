import { DataSource } from 'typeorm';
import { CloudGateway } from '../protocol/envelopes';
import { RiderAuthScope } from '../core/protocol';

export interface RequestContext {
  requestId: string;
  serverTime: string;
  gateway: CloudGateway;
  storeId?: string;
  meta?: Record<string, unknown>;
  runtime: 'cloud';
  uid?: string;
  auth: {
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
