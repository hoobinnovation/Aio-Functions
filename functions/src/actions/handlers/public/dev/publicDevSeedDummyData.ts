import { EntityManager } from 'typeorm';
import { AppError } from '../../../../core/errors';
import { ActionContext } from '../../../../core/protocol';
import { addSkip, initSummary, incCreated } from './seederUtils';
import { SeedContext, SeedPayload, SeedStoreProfile } from './types';
import { runSeedDomains } from './seeders/runSeedDomains';
import PROD from "../../../../utils/PROD";

const rateLimitWindowMs = 10 * 60 * 1000;
const rateLimitMaxCalls = 3;
const rateLimitBuckets = new Map<string, number[]>();

function ensureDevOnly(payload: SeedPayload) {
  // if (process.env.NODE_ENV === 'production') {
  //   throw new AppError('DEV_ONLY', 'This action is disabled in production.');
  // }

  const expectedSeedKey = '1';
  if (!expectedSeedKey || payload.seedKey !== expectedSeedKey) {
    throw new AppError('SEED_KEY_INVALID', 'Invalid or missing seed key.');
  }

  const now = Date.now();
  const bucketKey = `${process.env.K_SERVICE ?? 'local-instance'}:publicDevSeedDummyData`;
  const calls = (rateLimitBuckets.get(bucketKey) ?? []).filter((t) => now - t <= rateLimitWindowMs);

  if (calls.length >= rateLimitMaxCalls) {
    throw new AppError('SEED_RATE_LIMIT', 'Seed rate limit exceeded.');
  }

  calls.push(now);
  rateLimitBuckets.set(bucketKey, calls);
}

async function resetAllTables(ctx: ActionContext) {
  const dbAny = ctx.db as any;
  const queryRunner = dbAny.createQueryRunner();

  await queryRunner.connect();
  await queryRunner.startTransaction();

  try {
    await queryRunner.query('SET FOREIGN_KEY_CHECKS = 0');

    for (const metadata of dbAny.entityMetadatas as any[]) {
      await queryRunner.query(`TRUNCATE TABLE \`${metadata.tableName}\``);
    }

    await queryRunner.query('SET FOREIGN_KEY_CHECKS = 1');
    await queryRunner.commitTransaction();
  } catch (error) {
    await queryRunner.rollbackTransaction();
    throw error;
  } finally {
    await queryRunner.release();
  }
}

function defaultStores(): SeedStoreProfile[] {
  return [
    {
      code: '1',
      name: 'AIO Demo',
      vertical: 'ecommerce',
      supportEmail: 'support@ecom.demo',
      supportPhone: '+15550010001',
    },
    {
      code: 'ecom',
      name: 'AIO E-Commerce',
      vertical: 'ecommerce',
      supportEmail: 'support@ecom.demo',
      supportPhone: '+15550010001',
    },
    {
      code: 'resto',
      name: 'AIO Bistro',
      vertical: 'restaurant',
      supportEmail: 'support@resto.demo',
      supportPhone: '+15550010002',
    },
    {
      code: 'pharma',
      name: 'AIO Pharmacy',
      vertical: 'pharmacy',
      supportEmail: 'support@pharma.demo',
      supportPhone: '+15550010003',
    },
  ];
}

export async function publicDevSeedDummyData(actionCtx: ActionContext, payload: SeedPayload) {
  try {
    ensureDevOnly(payload);

    const mode = payload.mode ?? 'upsert';
    const scenario = payload.scenario ?? 'full';
    const now = new Date();
    const summary = initSummary();

    const resolvedStoreId =
        typeof payload.storeId === 'string' && payload.storeId.trim()
            ? payload.storeId.trim()
            : typeof actionCtx.storeId === 'string' && actionCtx.storeId.trim()
                ? actionCtx.storeId.trim()
                : undefined;

    const stores = payload.storeCode
        ? defaultStores().filter((store) => store.code === payload.storeCode)
        : defaultStores();

    if (!stores.length) {
      throw new AppError('VALIDATION_FAILED', 'Requested storeCode is not supported in seed profiles');
    }

    const seedingWork = async (manager: EntityManager) => {
      const seedCtx: SeedContext = {
        manager,
        now,
        scenario,
        storeId: resolvedStoreId,
        stores,
        sizes: {
          stores: payload.sizes?.stores ?? stores.length,
          branchesPerStore: payload.sizes?.branchesPerStore ?? 3,
          categories: payload.sizes?.categories ?? 6,
          productsPerStore: payload.sizes?.productsPerStore ?? payload.sizes?.products ?? 24,
          customers: payload.sizes?.customers ?? 20,
          ordersPerStore: payload.sizes?.ordersPerStore ?? payload.sizes?.orders ?? 36,
          insuranceOrdersPerStore: payload.sizes?.insuranceOrdersPerStore ?? payload.sizes?.insuranceOrders ?? 8,
          products: payload.sizes?.products ?? 24,
          variantsPerProduct: payload.sizes?.variantsPerProduct ?? 2,
          orders: payload.sizes?.orders ?? 36,
          insuranceOrders: payload.sizes?.insuranceOrders ?? 8,
        },
        demoUids: {
          adminOwnerUid: process.env.DEMO_ADMIN_OWNER_UID ?? (PROD ? '2eYRdoUIKXNRM0PeugRrZLvvpEE2':'8O85OCx1IQUdhuBS3Ys7mrOjfCTL'),
          adminManagerUid: process.env.DEMO_ADMIN_MANAGER_UID ??(PROD ? '2eYRdoUIKXNRM0PeugRrZLvvpEE2': '50dMnpqXPWEIeAmmKs3smUX8LDnO'),
          adminOpsUid: process.env.DEMO_ADMIN_OPS_UID ??(PROD ? '2eYRdoUIKXNRM0PeugRrZLvvpEE2': 'Nfmtax9liBTyHaiKWR5QnI2AKpMz'),
          adminAnalystUid: process.env.DEMO_ADMIN_ANALYST_UID ?? (PROD ? '2eYRdoUIKXNRM0PeugRrZLvvpEE2':'demo_admin_analyst'),
          adminSupportUid: process.env.DEMO_ADMIN_SUPPORT_UID ?? (PROD ? '2eYRdoUIKXNRM0PeugRrZLvvpEE2':'OdAMmHfEoqxdxMKx4g1R5w8WnHNX'),
          adminCatalogUid: process.env.DEMO_ADMIN_CATALOG_UID ?? (PROD ? '2eYRdoUIKXNRM0PeugRrZLvvpEE2':'ZAA6d9lkzXALvzq2W23uOPuZdufs'),
          clientUid: process.env.DEMO_CLIENT_UID ??(PROD ? 'GdAObjkydxZn2lL4Zh49qfgwaYi2': 'XVOxKFeyg4gDnvg531VzsGckzlg6'),
        },
      };

      if (scenario === 'baseline') {
        seedCtx.sizes.productsPerStore = Math.min(seedCtx.sizes.productsPerStore, 12);
        seedCtx.sizes.ordersPerStore = Math.min(seedCtx.sizes.ordersPerStore, 18);
      }

      await runSeedDomains(seedCtx, summary, payload.domains);

      incCreated(summary, 'SeedScenarioRuns');
      addSkip(summary, 'SeedMode', `mode=${mode} scenario=${scenario}`);
      addSkip(summary, 'SeedStoreScope', resolvedStoreId ? `storeId=${resolvedStoreId}` : 'storeId=AUTO_PER_STORE');
    };

    if (mode === 'reset') {
      await resetAllTables(actionCtx);
    }

    await actionCtx.db.transaction(async (tx: EntityManager) => {
      await seedingWork(tx);
    });

    return {
      ok: true,
      mode,
      scenario,
      storeId: resolvedStoreId ?? null,
      stores: stores.map((s) => s.code),
      domains: payload.domains ?? null,
      summary,
      note: 'Seed completed using modular domain runner.',
    };
  } catch (err) {
    throw err instanceof AppError
        ? err
        : new AppError('SEED_FAILED', 'Failed to seed dummy data', { cause: String(err) });
  }
}