import { EntityManager } from 'typeorm';

export type SeedMode = 'reset' | 'upsert';

export interface SeedSizes {
  categories?: number;
  products?: number;
  variantsPerProduct?: number;
  customers?: number;
  orders?: number;
  insuranceOrders?: number;
}

export interface SeedPayload {
  seedKey: string;
  mode?: SeedMode;
  storeId?: string;
  sizes?: SeedSizes;
}

export interface SeedContext {
  manager: EntityManager;
  storeId: string;
  sizes: Required<SeedSizes>;
  demoUids: {
    adminOwnerUid: string;
    adminCatalogUid: string;
    adminSupportUid: string;
    clientUid: string;
  };
  now: Date;
}

export interface SeedSummary {
  created: Record<string, number>;
  updated: Record<string, number>;
  skipped: Array<{ entity: string; reason: string }>;
}
