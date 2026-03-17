import { addSkip } from '../seederUtils';
import { SeedContext, SeedDomain, SeedStoreProfile, SeedSummary } from '../types';
import { seedStoresAndSettings } from './seedStoresAndSettings';
import { seedRBAC } from './seedRBAC';
import { seedCatalog } from './seedCatalog';
import { seedDeliveryZonesAndShipping } from './seedDeliveryZonesAndShipping';
import { seedPromotions } from './seedPromotions';
import { seedOrdersPaymentsTracking } from './seedOrdersPaymentsTracking';
import { seedLoyaltyWallet } from './seedLoyaltyWallet';
import { seedSupportNotifications } from './seedSupportNotifications';
import { seedInsurance } from './seedInsurance';
import { seedHomeCMS } from './seedHomeCMS';
import { seedAccounting } from './seedAccounting';
import { seedWarehouseProcurementInventory } from './seedWarehouseProcurementInventory';
import { seedPOS } from './seedPOS';
import { seedPrescription } from './seedPrescription';
import { seedImportsAndMappings } from './seedImportsAndMappings';
import { seedAccountingAdvanced } from './seedAccountingAdvanced';
import { seedAuthAndEdge } from './seedAuthAndEdge';

const BASELINE_DOMAINS: SeedDomain[] = [
    'core',
    'rbac',
    'catalog',
    'delivery',
    'promotions',
    'orders',
    'loyalty',
    'support',
];

const FULL_DOMAINS: SeedDomain[] = [
    ...BASELINE_DOMAINS,
    'insurance',
    'home',
    'accounting',
    'warehouse',
    'procurement',
    'inventoryAdvanced',
    'pos',
    'prescription',
    'imports',
    'auth',
    'edge',
];

export function resolveSeedDomains(ctx: SeedContext, requested?: SeedDomain[]): SeedDomain[] {
    if (requested?.length) return Array.from(new Set(requested));
    return ctx.scenario === 'baseline' ? BASELINE_DOMAINS : FULL_DOMAINS;
}

function buildScopedContext(ctx: SeedContext, store: SeedStoreProfile): SeedContext {
    const resolvedStoreId =
        ctx.storeId && ctx.storeId.trim()
            ? ctx.storeId.trim()
            : `store_${store.code}`;

    return {
        ...ctx,
        storeId: resolvedStoreId,
        stores: [store],
        sizes: { ...ctx.sizes, stores: 1 },
    };
}

export async function runSeedDomains(ctx: SeedContext, summary: SeedSummary, requestedDomains?: SeedDomain[]) {
    const domains = resolveSeedDomains(ctx, requestedDomains);

    for (const store of ctx.stores) {
        const scopedCtx = buildScopedContext(ctx, store);

        for (const domain of domains) {
            switch (domain) {
                case 'core':
                    await seedStoresAndSettings(scopedCtx, summary);
                    break;
                case 'rbac':
                    await seedRBAC(scopedCtx, summary);
                    break;
                case 'catalog':
                    await seedCatalog(scopedCtx, summary);
                    break;
                case 'delivery':
                    await seedDeliveryZonesAndShipping(scopedCtx, summary);
                    break;
                case 'promotions':
                    await seedPromotions(scopedCtx, summary);
                    break;
                case 'orders':
                    await seedOrdersPaymentsTracking(scopedCtx, summary);
                    break;
                case 'loyalty':
                    await seedLoyaltyWallet(scopedCtx, summary);
                    break;
                case 'support':
                    await seedSupportNotifications(scopedCtx, summary);
                    break;
                case 'insurance':
                    await seedInsurance(scopedCtx, summary);
                    break;
                case 'home':
                    await seedHomeCMS(scopedCtx, summary);
                    break;
                case 'accounting':
                    await seedAccounting(scopedCtx, summary);
                    await seedAccountingAdvanced(scopedCtx, summary);
                    break;
                case 'warehouse':
                case 'procurement':
                case 'inventoryAdvanced':
                    await seedWarehouseProcurementInventory(scopedCtx, summary);
                    break;
                case 'pos':
                    await seedPOS(scopedCtx, summary);
                    break;
                case 'prescription':
                    await seedPrescription(scopedCtx, summary);
                    break;
                case 'imports':
                    await seedImportsAndMappings(scopedCtx, summary);
                    break;
                case 'auth':
                case 'edge':
                    await seedAuthAndEdge(scopedCtx, summary);
                    break;
                default:
                    addSkip(summary, 'SeedDomain', `Unhandled domain: ${String(domain)}`);
            }
        }

        addSkip(summary, 'SeedStoreRun', `storeId=${scopedCtx.storeId} storeCode=${store.code}`);
    }

    addSkip(summary, 'SeedDomains', domains.join(', '));
}