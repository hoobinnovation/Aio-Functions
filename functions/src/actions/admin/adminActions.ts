import { EntityManager } from 'typeorm';
import { ActionContext } from '../../core/protocol';
import { ADMIN_ACTIONS_SOT } from '../../sot/adminActions';
import { CLIENT_ACTIONS_SOT } from '../../sot/clientActions';
import { PUBLIC_ACTIONS_SOT } from '../../sot/publicActions';
import { registryAdmin, registryClient, registryPublic } from '../../gateways/registries';
import { ACTION_SPECS } from '../../core/validate';
import { AdminUser } from '../../entities/AdminUser';
import { AdminRole } from '../../entities/AdminRole';
import { AdminStoreAccess } from '../../entities/AdminStoreAccess';
import { MediaAsset } from '../../entities/MediaAsset';
import { AppError } from '../../core/errors';
import { getBucketName, getStorage } from '../../utils/storage';
import { v4 as uuidv4 } from 'uuid';
import { Store } from '../../entities/Store';
import { StoreSettings } from '../../entities/StoreSettings';
import { UserProfile } from '../../entities/UserProfile';

/** ✅ NEW */
import { Order } from '../../entities/Order';
import { OrderStatusEvent } from '../../entities/OrderStatusEvent';
import { Shipment } from '../../entities/Shipment';

function coverage(sot: readonly string[], reg: Map<string, unknown>) {
    const handlers = Array.from(reg.keys());
    return {
        missingHandlers: sot.filter((a) => !reg.has(a)),
        missingSpecs: handlers.filter((a) => !ACTION_SPECS[a]),
        extraHandlers: handlers.filter((a) => !sot.includes(a)),
        implementedCount: handlers.length,
        sotCount: sot.length,
    };
}

export async function adminHealthWhoAmI(ctx: ActionContext) {
    return { uid: ctx.uid, gateway: ctx.gateway };
}

export async function adminHealthDbCheck(ctx: ActionContext) {
    await ctx.db.query('SELECT 1');
    const names = ['stores', 'admin_users', 'admin_roles', 'admin_store_access', 'user_profiles', 'media_assets'];
    const rows: Array<{ TABLE_NAME: string }> = await ctx.db.query(
        `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME IN (${names.map(() => '?').join(',')})`,
        [process.env.DB_NAME, ...names],
    );
    const found = new Set(rows.map((r) => r.TABLE_NAME));
    const tables = Object.fromEntries(names.map((n) => [n, found.has(n)]));
    return { ping: true, tables };
}

export async function adminHealthActionsCoverage() {
    const publicCoverage = coverage(PUBLIC_ACTIONS_SOT, registryPublic);
    const clientCoverage = coverage(CLIENT_ACTIONS_SOT, registryClient);
    const adminCoverage = coverage(ADMIN_ACTIONS_SOT, registryAdmin);
    return {
        public: publicCoverage,
        client: clientCoverage,
        admin: adminCoverage,
        hasErrors: [publicCoverage, clientCoverage, adminCoverage].some((g) => g.extraHandlers.length > 0),
    };
}

export async function adminActionsList() {
    return {
        gateway: 'admin',
        implementedActions: Array.from(registryAdmin.keys()),
        sotActionsCount: ADMIN_ACTIONS_SOT.length,
    };
}

export async function adminMe(ctx: ActionContext) {
    const user = await ctx.db.getRepository(AdminUser).findOneBy({ uid: ctx.uid! });
    const roles = await ctx.db.getRepository(AdminRole).findBy({ adminUid: ctx.uid! });
    return {
        uid: ctx.uid,
        status: user?.status ?? null,
        roles: roles.map((r: AdminRole) => r.role),
    };
}

export async function adminStoresList(ctx: ActionContext) {
    const stores = await ctx.db.getRepository(Store).find({ order: { updatedAt: 'DESC' as any } });
    return { stores };
}

export async function adminStoresGet(ctx: ActionContext, payload: any) {
    const store = await ctx.db.getRepository(Store).findOneBy({ id: payload.storeId });
    if (!store) throw new AppError('NOT_FOUND', 'Store not found');
    return { store };
}

export async function adminStoresCreate(ctx: ActionContext, payload: any) {
    const existing = await ctx.db.getRepository(Store).findOneBy({ id: payload.storeId });
    if (existing) throw new AppError('CONFLICT', 'Store already exists');

    await ctx.db.transaction(async (tx: EntityManager) => {
        await tx.getRepository(Store).save(
            tx.getRepository(Store).create({
                id: payload.storeId,
                name: payload.name,
                status: 'active',
                disabledReason: null,
                disabledAt: null,
                disabledByUid: null,
            }),
        );

        await tx.getRepository(StoreSettings).save(
            tx.getRepository(StoreSettings).create({
                storeId: payload.storeId,
                currency: payload.currency ?? 'USD',
                taxMode: payload.taxMode ?? 'exclusive',
                supportWhatsApp: payload.supportWhatsApp ?? null,
                supportEmail: payload.supportEmail ?? null,
                pickupEnabled: payload.pickupEnabled ?? true,
                deliveryEnabled: payload.deliveryEnabled ?? true,
            }),
        );
    });

    return adminStoresGet(ctx, { storeId: payload.storeId });
}

export async function adminStoresUpdate(ctx: ActionContext, payload: any) {
    await ctx.db.transaction(async (tx: EntityManager) => {
        const res = await tx.getRepository(Store).update(
            { id: payload.storeId },
            { name: payload.name, status: payload.status ?? undefined },
        );
        if (!res.affected) throw new AppError('NOT_FOUND', 'Store not found');
    });

    return adminStoresGet(ctx, { storeId: payload.storeId });
}

export async function adminStoresDisable(ctx: ActionContext, payload: any) {
    await ctx.db.transaction(async (tx: EntityManager) => {
        const res = await tx.getRepository(Store).update(
            { id: payload.storeId },
            {
                status: 'disabled',
                disabledReason: payload.reason ?? null,
                disabledAt: new Date(),
                disabledByUid: ctx.uid!,
            },
        );
        if (!res.affected) throw new AppError('NOT_FOUND', 'Store not found');
    });

    return adminStoresGet(ctx, { storeId: payload.storeId });
}

export async function adminStoreSettingsGet(ctx: ActionContext, payload: any) {
    const settings = await ctx.db.getRepository(StoreSettings).findOneBy({ storeId: payload.storeId });
    if (!settings) throw new AppError('NOT_FOUND', 'Store settings not found');
    return { settings };
}

export async function adminStoreSettingsUpdate(ctx: ActionContext, payload: any) {
    await ctx.db.transaction(async (tx: EntityManager) => {
        await tx.getRepository(StoreSettings).upsert(
            {
                storeId: payload.storeId,
                currency: payload.currency,
                taxMode: payload.taxMode,
                supportWhatsApp: payload.supportWhatsApp ?? null,
                supportEmail: payload.supportEmail ?? null,
                pickupEnabled: payload.pickupEnabled,
                deliveryEnabled: payload.deliveryEnabled,
            },
            ['storeId'],
        );
    });

    return adminStoreSettingsGet(ctx, { storeId: payload.storeId });
}

export async function adminCustomersList(ctx: ActionContext, payload: any) {
    const limit = payload.limit ?? 20;
    const offset = payload.offset ?? 0;
    const rows = await ctx.db.getRepository(UserProfile).find({
        order: { updatedAt: 'DESC' as any },
        take: limit,
        skip: offset,
    });
    return { customers: rows, limit, offset };
}

export async function adminCustomersGet(ctx: ActionContext, payload: any) {
    const customer = await ctx.db.getRepository(UserProfile).findOneBy({ uid: payload.uid });
    if (!customer) throw new AppError('NOT_FOUND', 'Customer not found');
    return { customer };
}

export async function adminCustomersUpdate(ctx: ActionContext, payload: any) {
    await ctx.db.transaction(async (tx: EntityManager) => {
        const res = await tx.getRepository(UserProfile).update(
            { uid: payload.uid },
            {
                phone: payload.phone ?? null,
                email: payload.email ?? null,
                displayName: payload.displayName ?? null,
                locale: payload.locale ?? null,
                marketingOptIn: payload.marketingOptIn ?? false,
                status: payload.status ?? undefined,
            },
        );
        if (!res.affected) throw new AppError('NOT_FOUND', 'Customer not found');
    });

    return adminCustomersGet(ctx, { uid: payload.uid });
}

export async function adminCustomersDisable(ctx: ActionContext, payload: any) {
    await ctx.db.transaction(async (tx: EntityManager) => {
        const res = await tx.getRepository(UserProfile).update(
            { uid: payload.uid },
            {
                status: 'disabled',
                disabledReason: payload.reason ?? null,
                disabledAt: new Date(),
                disabledByUid: ctx.uid!,
            },
        );
        if (!res.affected) throw new AppError('NOT_FOUND', 'Customer not found');
    });

    return adminCustomersGet(ctx, { uid: payload.uid });
}

export async function adminCustomersSearch(ctx: ActionContext, payload: any) {
    const q = `%${payload.query || ''}%`;
    const rows = await ctx.db.query(
        'SELECT * FROM user_profiles WHERE uid LIKE ? OR email LIKE ? OR phone LIKE ? OR displayName LIKE ? ORDER BY updatedAt DESC LIMIT ?',
        [q, q, q, q, payload.limit ?? 20],
    );
    return { customers: rows };
}

export async function adminMediaCreateUploadSpec(ctx: ActionContext, payload: any) {
    const assetId = uuidv4();
    const ext = String(payload.fileExt).replace(/^\./, '').toLowerCase();
    const originalPath = ctx.storeId
        ? `stores/${ctx.storeId}/${payload.ownerType}/${payload.ownerId}/${assetId}.${ext}`
        : `global/${payload.ownerType}/${payload.ownerId}/${assetId}.${ext}`;
    const bucketName = getBucketName();

    await ctx.db.transaction(async (tx: EntityManager) => {
        const asset = tx.getRepository(MediaAsset).create({
            id: assetId,
            storeId: ctx.storeId ?? null,
            ownerType: payload.ownerType,
            ownerId: payload.ownerId,
            kind: payload.kind,
            originalPath,
            thumbnailPath: null,
            contentType: payload.contentType,
            sizeBytes: String(payload.sizeBytes),
            status: 'created',
            createdByUid: ctx.uid!,
        });
        await tx.getRepository(MediaAsset).save(asset);
    });

    const [url] = await getStorage().bucket(bucketName).file(originalPath).getSignedUrl({
        version: 'v4',
        action: 'write',
        expires: Date.now() + 15 * 60 * 1000,
        contentType: payload.contentType,
    });

    return {
        assetId,
        bucket: bucketName,
        originalPath,
        upload: { method: 'PUT', url, headers: { 'Content-Type': payload.contentType } },
        finalizeHint: { action: 'adminMediaFinalizeUpload', assetId },
    };
}

export async function adminMediaFinalizeUpload(ctx: ActionContext, payload: any) {
    const asset = await ctx.db.getRepository(MediaAsset).findOneBy({ id: payload.assetId });
    if (!asset) throw new AppError('NOT_FOUND', 'Asset not found');

    const effectiveStore = ctx.storeId ?? asset.storeId ?? undefined;
    if (effectiveStore) {
        const access = await ctx.db.getRepository(AdminStoreAccess).findOneBy({
            adminUid: ctx.uid!,
            storeId: effectiveStore,
        });
        if (!access) throw new AppError('FORBIDDEN', 'Missing store access for asset store');
    }

    const [metadata] = await getStorage().bucket(getBucketName()).file(asset.originalPath).getMetadata();
    const size = Number(metadata.size || 0);

    if (size > Number(asset.sizeBytes)) {
        throw new AppError('VALIDATION_ERROR', 'Uploaded size exceeds requested size', {
            requested: asset.sizeBytes,
            actual: size,
        });
    }

    if (metadata.contentType !== asset.contentType) {
        throw new AppError('VALIDATION_ERROR', 'Uploaded content type mismatch', {
            requested: asset.contentType,
            actual: metadata.contentType,
        });
    }

    await ctx.db.transaction(async (tx: EntityManager) => {
        await tx.getRepository(MediaAsset).update(asset.id, {
            contentType: metadata.contentType || asset.contentType,
            sizeBytes: String(size),
            status: asset.kind === 'image' ? 'processing' : 'ready',
        });
    });

    const updated = await ctx.db.getRepository(MediaAsset).findOneByOrFail({ id: asset.id });

    return {
        asset: {
            id: updated.id,
            originalPath: updated.originalPath,
            thumbnailPath: updated.thumbnailPath ?? undefined,
            status: updated.status,
            contentType: updated.contentType,
            sizeBytes: Number(updated.sizeBytes),
            kind: updated.kind,
            ownerType: updated.ownerType,
            ownerId: updated.ownerId,
            storeId: updated.storeId ?? undefined,
        },
    };
}

/** ✅ NEW */
export async function adminOrdersCreate(ctx: ActionContext, payload: any) {
    const storeId = String(payload.storeId || ctx.storeId || '').trim();

    if (!storeId) {
        throw new AppError('VALIDATION_ERROR', 'storeId is required');
    }

    if (!payload.customerName || !String(payload.customerName).trim()) {
        throw new AppError('VALIDATION_ERROR', 'customerName is required');
    }

    if (!payload.customerPhone || !String(payload.customerPhone).trim()) {
        throw new AppError('VALIDATION_ERROR', 'customerPhone is required');
    }

    if (!payload.addressLine && !payload.address) {
        throw new AppError('VALIDATION_ERROR', 'addressLine is required');
    }

    if (payload.total === undefined || payload.total === null || Number.isNaN(Number(payload.total))) {
        throw new AppError('VALIDATION_ERROR', 'total is required');
    }

    const allowedStatuses = [
        'pending',
        'paid',
        'confirmed',
        'preparing',
        'ready',
        'out_for_delivery',
        'delivered',
        'cancelled',
        'rejected',
    ];

    const allowedPriorities = ['low', 'normal', 'high'];

    const status = allowedStatuses.includes(String(payload.status || '').trim())
        ? String(payload.status).trim()
        : 'pending';

    const priority = allowedPriorities.includes(String(payload.priority || '').trim())
        ? String(payload.priority).trim()
        : 'normal';

    const orderRepo = ctx.db.getRepository(Order);
    const eventRepo = ctx.db.getRepository(OrderStatusEvent);
    const shipmentRepo = ctx.db.getRepository(Shipment);

    const created = await ctx.db.transaction(async (tx: EntityManager) => {
        const order = tx.getRepository(Order).create({
            storeId,
            customerName: String(payload.customerName || '').trim(),
            customerPhone: String(payload.customerPhone || '').trim(),
            fromCity: payload.fromCity ?? null,
            toCity: payload.toCity ?? null,
            city: payload.city ?? payload.toCity ?? null,
            area: payload.area ?? null,
            addressLine: payload.addressLine ?? payload.address ?? null,
            address: payload.address ?? payload.addressLine ?? null,
            total: Number(payload.total || 0),
            status,
            priority,
            zoneId: payload.zoneId ? String(payload.zoneId) : null,
            deliveryZoneId: payload.zoneId ? String(payload.zoneId) : null,
            latitude:
                payload.latitude !== undefined && payload.latitude !== null && payload.latitude !== ''
                    ? Number(payload.latitude)
                    : null,
            longitude:
                payload.longitude !== undefined && payload.longitude !== null && payload.longitude !== ''
                    ? Number(payload.longitude)
                    : null,
            imageName: payload.imageName ?? null,
            createdByUid: ctx.uid ?? null,
            updatedByUid: ctx.uid ?? null,
        } as any);

        const savedOrder = await tx.getRepository(Order).save(order);

        const statusEvent = tx.getRepository(OrderStatusEvent).create({
            orderId: (savedOrder as any).id,
            status,
            note: 'Order created from admin dispatch',
            createdByUid: ctx.uid ?? null,
        } as any);
        await tx.getRepository(OrderStatusEvent).save(statusEvent);

        const shipment = tx.getRepository(Shipment).create({
            orderId: (savedOrder as any).id,
            storeId,
            status,
            zoneId: payload.zoneId ? String(payload.zoneId) : null,
            deliveryZoneId: payload.zoneId ? String(payload.zoneId) : null,
            courierId: null,
            courierName: null,
            fromCity: payload.fromCity ?? null,
            toCity: payload.toCity ?? null,
            latitude:
                payload.latitude !== undefined && payload.latitude !== null && payload.latitude !== ''
                    ? Number(payload.latitude)
                    : null,
            longitude:
                payload.longitude !== undefined && payload.longitude !== null && payload.longitude !== ''
                    ? Number(payload.longitude)
                    : null,
        } as any);
        await tx.getRepository(Shipment).save(shipment);

        return savedOrder;
    });

    const fullOrder = await orderRepo.findOneBy({ id: (created as any).id });
    const events = await eventRepo.find({
        where: { orderId: (created as any).id } as any,
        order: { createdAt: 'ASC' as any },
    });
    const shipment = await shipmentRepo.findOne({
        where: { orderId: (created as any).id } as any,
        order: { createdAt: 'DESC' as any },
    });

    return {
        order: fullOrder,
        statusEvents: events,
        shipment,
    };
}