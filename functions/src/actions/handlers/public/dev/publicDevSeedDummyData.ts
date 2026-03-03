import { EntityManager } from 'typeorm';
import { AppError } from '../../../../core/errors';
import { ActionContext } from '../../../../core/protocol';
import { seedStoresAndSettings } from './seeders/seedStoresAndSettings';
import { seedRBAC } from './seeders/seedRBAC';
import { seedCatalog } from './seeders/seedCatalog';
import { seedHomeCMS } from './seeders/seedHomeCMS';
import { seedDeliveryZonesAndShipping } from './seeders/seedDeliveryZonesAndShipping';
import { seedOrdersPaymentsTracking } from './seeders/seedOrdersPaymentsTracking';
import { seedPromotions } from './seeders/seedPromotions';
import { seedLoyaltyWallet } from './seeders/seedLoyaltyWallet';
import { seedSupportNotifications } from './seeders/seedSupportNotifications';
import { seedInsurance } from './seeders/seedInsurance';
import { seedAccounting } from './seeders/seedAccounting';
import { addSkip, deterministicId, initSummary, incCreated } from './seederUtils';
import { SeedContext, SeedPayload } from './types';

const rateLimitWindowMs = 10 * 60 * 1000;
const rateLimitMaxCalls = 3;
const rateLimitBuckets = new Map<string, number[]>();

function ensureDevOnly(payload: SeedPayload) {
  if (process.env.NODE_ENV === 'production') {
    throw new AppError('DEV_ONLY', 'This action is disabled in production.');
  }

  const expectedSeedKey = process.env.PUBLIC_SEED_KEY;
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

async function seedRemainingEntities(ctx: SeedContext, summary: ReturnType<typeof initSummary>) {
  const managerAny = ctx.manager as any;
  for (const metadata of managerAny.connection.entityMetadatas as any[]) {
    const count = await ctx.manager.getRepository(metadata.target).count();
    if (count > 0) continue;

    const row: Record<string, unknown> = {};
    let skipReason: string | null = null;

    for (const column of metadata.columns) {
      if (column.isCreateDate || column.isUpdateDate || column.isDeleteDate || column.isVersion || column.isGenerated) {
        continue;
      }

      const hasDefault = column.default !== undefined && column.default !== null;
      if (column.isPrimary) {
        if (hasDefault) continue;
        if (column.type === Number || column.type === 'int' || column.type === 'bigint') {
          skipReason = 'requires explicit seeder';
          break;
        }
        row[column.propertyName] = deterministicId(metadata.tableName, 1);
        continue;
      }

      if (column.isNullable) {
        row[column.propertyName] = null;
        continue;
      }

      if (hasDefault) continue;

      skipReason = 'requires explicit seeder';
      break;
    }

    if (skipReason) {
      addSkip(summary, metadata.name, skipReason);
      continue;
    }

    await ctx.manager.getRepository(metadata.target).insert(row);
    incCreated(summary, metadata.name);
  }
}

export async function publicDevSeedDummyData(actionCtx: ActionContext, payload: SeedPayload) {
  try {
    ensureDevOnly(payload);
    const mode = payload.mode ?? 'upsert';
    const storeId = payload.storeId ?? 'store_demo_001';
    const now = new Date();
    const summary = initSummary();

    const seedingWork = async (manager: EntityManager) => {
      const seedCtx: SeedContext = {
        manager,
        storeId,
        now,
        sizes: {
          categories: payload.sizes?.categories ?? 4,
          products: payload.sizes?.products ?? 12,
          variantsPerProduct: payload.sizes?.variantsPerProduct ?? 2,
          customers: payload.sizes?.customers ?? 4,
          orders: payload.sizes?.orders ?? 6,
          insuranceOrders: payload.sizes?.insuranceOrders ?? 3,
        },
        demoUids: {
          adminOwnerUid: process.env.DEMO_ADMIN_OWNER_UID ?? 'demo_admin_owner_uid',
          adminCatalogUid: process.env.DEMO_ADMIN_CATALOG_UID ?? 'demo_admin_catalog_uid',
          adminSupportUid: process.env.DEMO_ADMIN_SUPPORT_UID ?? 'demo_admin_support_uid',
          clientUid: process.env.DEMO_CLIENT_UID ?? 'demo_client_uid',
        },
      };

      await seedStoresAndSettings(seedCtx, summary);
      await seedRBAC(seedCtx, summary);
      await seedCatalog(seedCtx, summary);
      await seedHomeCMS(seedCtx, summary);
      await seedDeliveryZonesAndShipping(seedCtx, summary);
      await seedOrdersPaymentsTracking(seedCtx, summary);
      await seedPromotions(seedCtx, summary);
      await seedLoyaltyWallet(seedCtx, summary);
      await seedSupportNotifications(seedCtx, summary);
      await seedInsurance(seedCtx, summary);
      await seedAccounting(seedCtx, summary);
      await seedRemainingEntities(seedCtx, summary);
    };

    if (mode === 'reset') {
      await resetAllTables(actionCtx);
    }

    await actionCtx.db.transaction(async (tx) => {
      await seedingWork(tx);
    });

    return {
      storeId,
      mode,
      summary,
    };
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError('SEED_FAILED', 'Failed to seed dummy data.', {
      reason: error instanceof Error ? error.message : String(error),
    });
  }
}
