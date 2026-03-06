import { EntityManager } from 'typeorm';

export type SeedMode = 'reset' | 'upsert';
export type SeedScenario = 'baseline' | 'full';

export interface SeedSizes {
  stores?: number;
  branchesPerStore?: number;
  categories?: number;
  productsPerStore?: number;
  customers?: number;
  ordersPerStore?: number;
  insuranceOrdersPerStore?: number;
  // legacy knobs
  products?: number;
  variantsPerProduct?: number;
  orders?: number;
  insuranceOrders?: number;
}

export interface SeedPayload {
  seedKey: string;
  mode?: SeedMode;
  scenario?: SeedScenario;
  storeCode?: string;
  sizes?: SeedSizes;
}

export interface SeedStoreProfile {
  code: string;
  name: string;
  vertical: 'ecommerce' | 'restaurant' | 'pharmacy';
  supportEmail: string;
  supportPhone: string;
}

export interface SeedContext {
  manager: EntityManager;
  now: Date;
  scenario: SeedScenario;
  sizes: Required<SeedSizes>;
  stores: SeedStoreProfile[];
  demoUids: {
    adminOwnerUid: string;
    adminManagerUid: string;
    adminOpsUid: string;
    adminAnalystUid: string;
    adminSupportUid: string;
    clientUid?: string;
    adminCatalogUid?: string;
  };
  // backward-compatible fields for legacy seed modules
  storeId?: string;
}

export interface SeedSummary {
  created: Record<string, number>;
  updated: Record<string, number>;
  skipped: Array<{ entity: string; reason: string }>;
}
