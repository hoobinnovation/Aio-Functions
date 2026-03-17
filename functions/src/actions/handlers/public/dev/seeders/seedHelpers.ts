import { Branch } from '../../../../../entities/Branch';
import { Category } from '../../../../../entities/Category';
import { Device } from '../../../../../entities/Device';
import { Drawer } from '../../../../../entities/Drawer';
import { DrawerSession } from '../../../../../entities/DrawerSession';
import { Employee } from '../../../../../entities/Employee';
import { Product } from '../../../../../entities/Product';
import { ProductVariant } from '../../../../../entities/ProductVariant';
import { UserProfile } from '../../../../../entities/UserProfile';
import { deterministicId } from '../seederUtils';
import { SeedContext } from '../types';

export function scopedId(storeId: string, key: string, index: number) {
    return deterministicId(`${storeId}_${key}`.slice(0, 18), index);
}

export function dateOnly(input: Date) {
    return input.toISOString().slice(0, 10);
}

export function addDays(base: Date, days: number) {
    return new Date(base.getTime() + days * 24 * 60 * 60 * 1000);
}

export async function getStoreProducts(ctx: SeedContext) {
    return ctx.manager.getRepository(Product).find({
        where: { storeId: ctx.storeId! },
        order: { name: 'ASC' as any },
        take: 30,
    });
}

export async function getStoreVariants(ctx: SeedContext) {
    const products = await getStoreProducts(ctx);
    if (!products.length) return [];
    const productIds = products.map((p: { id: any; }) => p.id);
    return ctx.manager
        .getRepository(ProductVariant)
        .createQueryBuilder('v')
        .where('v.productId IN (:...productIds)', { productIds })
        .orderBy('v.sku', 'ASC')
        .limit(60)
        .getMany();
}

export async function getStoreCategories(ctx: SeedContext) {
    return ctx.manager.getRepository(Category).find({
        where: { storeId: ctx.storeId! },
        order: { sortOrder: 'ASC' as any },
        take: 20,
    });
}

export async function getStoreBranches(ctx: SeedContext) {
    return ctx.manager.getRepository(Branch).find({
        where: { storeId: ctx.storeId! },
        take: 10,
    });
}

export async function getStoreCustomers() {
    return [];
}

export async function getAnyCustomers(ctx: SeedContext) {
    return ctx.manager.getRepository(UserProfile).find({
        order: { createdAt: 'ASC' as any },
        take: 20,
    });
}

export async function ensurePOSInfra(ctx: SeedContext) {
    const branchRepo = ctx.manager.getRepository(Branch);
    const deviceRepo = ctx.manager.getRepository(Device);
    const employeeRepo = ctx.manager.getRepository(Employee);
    const drawerRepo = ctx.manager.getRepository(Drawer);
    const drawerSessionRepo = ctx.manager.getRepository(DrawerSession);

    const branch = await branchRepo.findOne({ where: { storeId: ctx.storeId! } });
    if (!branch) return null;

    const deviceId = scopedId(ctx.storeId!, 'device', 1);
    const employeeId = scopedId(ctx.storeId!, 'employee', 1);
    const drawerId = scopedId(ctx.storeId!, 'drawer', 1);
    const drawerSessionId = scopedId(ctx.storeId!, 'drawerSession', 1);

    await deviceRepo.save(
        deviceRepo.create({
            id: deviceId,
            storeId: ctx.storeId!,
            branchId: branch.id,
            name: 'POS Front Counter',
            status: 'active',
        }),
    );

    await employeeRepo.save(
        employeeRepo.create({
            id: employeeId,
            storeId: ctx.storeId!,
            uid: ctx.demoUids.adminOpsUid,
            role: 'cashier',
            status: 'active',
        }),
    );

    await drawerRepo.save(
        drawerRepo.create({
            id: drawerId,
            storeId: ctx.storeId!,
            branchId: branch.id,
            name: 'Main Drawer',
            status: 'active',
        }),
    );

    await drawerSessionRepo.save(
        drawerSessionRepo.create({
            id: drawerSessionId,
            drawerId,
            openedByUid: ctx.demoUids.adminOpsUid,
            openedAt: new Date(ctx.now.getTime() - 2 * 60 * 60 * 1000),
            closedByUid: null,
            closedAt: null,
            openingBalanceCents: '500000',
            closingBalanceCents: null,
        }),
    );

    return {
        branch,
        deviceId,
        employeeId,
        drawerId,
        drawerSessionId,
    };
}