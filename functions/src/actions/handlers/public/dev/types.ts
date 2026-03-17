import { EntityManager } from 'typeorm';

export type SeedMode = 'reset' | 'upsert';
export type SeedScenario = 'baseline' | 'full';

export type SeedDomain =
    | 'core'
    | 'rbac'
    | 'catalog'
    | 'delivery'
    | 'promotions'
    | 'orders'
    | 'loyalty'
    | 'support'
    | 'insurance'
    | 'home'
    | 'accounting'
    | 'warehouse'
    | 'procurement'
    | 'inventoryAdvanced'
    | 'pos'
    | 'prescription'
    | 'imports'
    | 'auth'
    | 'edge';

export interface SeedSizes {
  stores?: number;
  branchesPerStore?: number;
  categories?: number;
  productsPerStore?: number;
  customers?: number;
  ordersPerStore?: number;
  insuranceOrdersPerStore?: number;

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
  storeId?: string;
  domains?: SeedDomain[];
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
  storeId?: string;
}

export interface SeedSummary {
  created: Record<string, number>;
  updated: Record<string, number>;
  skipped: Array<{ entity: string; reason: string }>;
}