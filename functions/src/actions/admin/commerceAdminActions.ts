import { v4 as uuidv4 } from 'uuid';
import { EntityManager } from 'typeorm';
import { ActionContext } from '../../core/protocol';
import { ShippingMethod } from '../../entities/ShippingMethod';
import { Governorate } from '../../entities/Governorate';
import { DeliveryZone } from '../../entities/DeliveryZone';
import { Coupon } from '../../entities/Coupon';
import { CashbackOffer } from '../../entities/CashbackOffer';
import { TargetedDiscount } from '../../entities/TargetedDiscount';
import { Notification } from '../../entities/Notification';
import { LoyaltySetting } from '../../entities/LoyaltySetting';
import { LoyaltyTier } from '../../entities/LoyaltyTier';
import { LoyaltyTransaction } from '../../entities/LoyaltyTransaction';
import { PostPurchaseFlow } from '../../entities/PostPurchaseFlow';
import { PostPurchaseRun } from '../../entities/PostPurchaseRun';
import { AppError } from '../../core/errors';

async function getById(ctx: ActionContext, entity: any, id: string, msg: string) {
    const r = await ctx.db.getRepository(entity).findOneBy({ id });
    if (!r) throw new AppError('NOT_FOUND', msg);
    return r;
}

const crud = (entity: any, name: string) => ({
    list: async (ctx: ActionContext, p: any) => ({
        items: await ctx.db.getRepository(entity).find({
            where: { storeId: p.storeId },
            order: { id: 'DESC' as any },
        }),
    }),
    get: async (ctx: ActionContext, p: any) => ({
        item: await getById(ctx, entity, p.id, `${name} not found`),
    }),
    create: async (ctx: ActionContext, p: any) => {
        const id = uuidv4();
        await ctx.db.transaction(async (tx: EntityManager) => {
            await tx.getRepository(entity).save(tx.getRepository(entity).create({ id, ...p }));
        });
        return { item: await ctx.db.getRepository(entity).findOneByOrFail({ id }) };
    },
    update: async (ctx: ActionContext, p: any) => {
        await ctx.db.transaction(async (tx: EntityManager) => {
            const r = await tx.getRepository(entity).update({ id: p.id }, p);
            if (!r.affected) throw new AppError('NOT_FOUND', `${name} not found`);
        });
        return { item: await ctx.db.getRepository(entity).findOneByOrFail({ id: p.id }) };
    },
    disable: async (ctx: ActionContext, p: any) => {
        await ctx.db.transaction(async (tx: EntityManager) => {
            const r = await tx.getRepository(entity).update({ id: p.id }, { status: 'disabled' } as any);
            if (!r.affected) throw new AppError('NOT_FOUND', `${name} not found`);
        });
        return { disabled: true };
    },
});

function normalizeCouponPayload(ctx: ActionContext, payload: any, isUpdate = false) {
    const storeId = String(payload?.storeId || ctx.storeId || '').trim();

    if (!storeId && !isUpdate) throw new AppError('VALIDATION_ERROR', 'storeId is required');

    const code = String(payload?.code || '').trim().toUpperCase();
    if (!code) throw new AppError('VALIDATION_ERROR', 'code is required');

    const rawType = String(payload?.discountType || payload?.type || '').trim().toLowerCase();
    const discountType = rawType === 'fixed' ? 'fixed' : rawType === 'percentage' ? 'percentage' : '';
    if (!discountType) throw new AppError('VALIDATION_ERROR', 'discountType is required');

    const numericValue = Number(
        payload?.discountValue !== undefined && payload?.discountValue !== null
            ? payload.discountValue
            : payload?.value
    );

    if (!Number.isFinite(numericValue) || numericValue < 0) {
        throw new AppError('VALIDATION_ERROR', 'discountValue must be a valid non-negative number');
    }

    if (discountType === 'percentage' && numericValue > 100) {
        throw new AppError('VALIDATION_ERROR', 'percentage discount cannot exceed 100');
    }

    const perUserLimit = Number(payload?.perUserLimit ?? 0);
    if (!Number.isFinite(perUserLimit) || perUserLimit < 0) {
        throw new AppError('VALIDATION_ERROR', 'perUserLimit must be a valid non-negative number');
    }

    const normalizeDate = (value: any) => {
        if (!value) return null;
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) throw new AppError('VALIDATION_ERROR', 'Invalid date value');
        return date;
    };

    const startsAt = normalizeDate(payload?.startsAt);
    const endsAt = normalizeDate(payload?.endsAt);

    if (startsAt && endsAt && startsAt.getTime() > endsAt.getTime()) {
        throw new AppError('VALIDATION_ERROR', 'startsAt cannot be after endsAt');
    }

    const status = String(payload?.status || 'active').trim().toLowerCase() === 'disabled'
        ? 'disabled'
        : 'active';

    return {
        ...(isUpdate ? {} : { storeId }),
        code,
        discountType,
        discountValue: String(Math.round(numericValue)),
        startsAt,
        endsAt,
        perUserLimit: Math.floor(perUserLimit),
        status,
    };
}

function normalizeCashbackPayload(ctx: ActionContext, payload: any, isUpdate = false) {
    const storeId = String(payload?.storeId || ctx.storeId || '').trim();
    if (!storeId && !isUpdate) throw new AppError('VALIDATION_ERROR', 'storeId is required');

    const name = String(payload?.name || '').trim();
    if (!name) throw new AppError('VALIDATION_ERROR', 'name is required');

    const percent = Number(payload?.percent ?? 0);
    if (!Number.isFinite(percent) || percent < 0 || percent > 100) {
        throw new AppError('VALIDATION_ERROR', 'percent must be between 0 and 100');
    }

    const status = String(payload?.status || 'active').trim().toLowerCase() === 'disabled'
        ? 'disabled'
        : 'active';

    return {
        ...(isUpdate ? {} : { storeId }),
        name,
        percent: Math.round(percent),
        rules: payload?.rules ?? null,
        status,
    };
}

function normalizeDiscountPayload(ctx: ActionContext, payload: any, isUpdate = false) {
    const storeId = String(payload?.storeId || ctx.storeId || '').trim();
    if (!storeId && !isUpdate) throw new AppError('VALIDATION_ERROR', 'storeId is required');

    const name = String(payload?.name || '').trim();
    if (!name) throw new AppError('VALIDATION_ERROR', 'name is required');

    const percent = Number(payload?.percent ?? payload?.discountPercent ?? 0);
    if (!Number.isFinite(percent) || percent < 0 || percent > 100) {
        throw new AppError('VALIDATION_ERROR', 'percent must be between 0 and 100');
    }

    const status = String(payload?.status || 'active').trim().toLowerCase() === 'disabled'
        ? 'disabled'
        : 'active';

    return {
        ...(isUpdate ? {} : { storeId }),
        name,
        percent: Math.round(percent),
        audience: payload?.audience ?? null,
        status,
    };
}

async function resolveGovernorate(ctx: ActionContext, input: any) {
    const value = String(input || '').trim();
    if (!value) {
        throw new AppError('VALIDATION_ERROR', 'governorate is required');
    }

    const repo = ctx.db.getRepository(Governorate);

    const found = await repo
        .createQueryBuilder('g')
        .where('g.id = :value', { value })
        .orWhere('g.name = :value', { value })
        .getOne();

    if (!found) {
        throw new AppError('VALIDATION_ERROR', 'Governorate not found');
    }

    return found;
}

function priceToCents(value: any) {
    const num = Number(value ?? 0);
    if (!Number.isFinite(num) || num < 0) {
        throw new AppError('VALIDATION_ERROR', 'price must be a valid non-negative number');
    }
    return String(Math.round(num * 100));
}

function normalizeCoordinate(value: any, type: 'lat' | 'lng') {
    const num = Number(value);
    if (!Number.isFinite(num)) {
        throw new AppError('VALIDATION_ERROR', `${type} must be a valid number`);
    }

    if (type === 'lat' && (num < -90 || num > 90)) {
        throw new AppError('VALIDATION_ERROR', 'lat must be between -90 and 90');
    }

    if (type === 'lng' && (num < -180 || num > 180)) {
        throw new AppError('VALIDATION_ERROR', 'lng must be between -180 and 180');
    }

    return String(num);
}

async function normalizeZonePayload(ctx: ActionContext, payload: any, isUpdate = false) {
    const storeId = String(payload?.storeId || ctx.storeId || '').trim();
    if (!storeId && !isUpdate) {
        throw new AppError('VALIDATION_ERROR', 'storeId is required');
    }

    const governorate = await resolveGovernorate(
        ctx,
        payload?.governorateId ?? payload?.governorate ?? payload?.name,
    );

    const lat = normalizeCoordinate(payload?.lat, 'lat');
    const lng = normalizeCoordinate(payload?.lng, 'lng');
    const priceCents = priceToCents(payload?.price);

    const status = String(payload?.status || 'active').trim().toLowerCase() === 'disabled'
        ? 'disabled'
        : 'active';

    return {
        ...(isUpdate ? {} : { storeId }),
        governorateId: governorate.id,
        name: governorate.name,
        lat,
        lng,
        priceCents,
        status,
    };
}

function serializeZone(zone: any) {
    return {
        id: zone.id,
        governorateId: zone.governorateId,
        governorate: zone.name,
        name: zone.name,
        lat: Number(zone.lat),
        lng: Number(zone.lng),
        priceCents: zone.priceCents,
        price: Number(zone.priceCents || 0) / 100,
        status: zone.status,
    };
}

const ship = crud(ShippingMethod, 'Shipping method');
export const adminShippingMethodsList = ship.list;
export const adminShippingMethodsGet = ship.get;
export const adminShippingMethodsCreate = ship.create;
export const adminShippingMethodsUpdate = ship.update;
export const adminShippingMethodsDisable = ship.disable;

export async function adminDeliveryZonesList(ctx: ActionContext, p: any) {
    const zones = await ctx.db.getRepository(DeliveryZone).find({
        where: { storeId: p.storeId },
        order: { id: 'DESC' as any },
    });

    const governorates = await ctx.db.getRepository(Governorate).find();

    return {
        zones: zones.map(serializeZone),
        governorates,
    };
}

export async function adminDeliveryZonesGet(ctx: ActionContext, p: any) {
    const item = await getById(ctx, DeliveryZone, p.id, 'Delivery zone not found');
    return { item: serializeZone(item) };
}

export async function adminDeliveryZonesCreate(ctx: ActionContext, p: any) {
    const normalized = await normalizeZonePayload(ctx, p, false);
    const id = uuidv4();

    await ctx.db.transaction(async (tx: EntityManager) => {
        await tx.getRepository(DeliveryZone).save(
            tx.getRepository(DeliveryZone).create({
                id,
                ...normalized,
            }),
        );
    });

    const saved = await ctx.db.getRepository(DeliveryZone).findOneByOrFail({ id });
    return { item: serializeZone(saved) };
}

export async function adminDeliveryZonesUpdate(ctx: ActionContext, p: any) {
    const id = String(p?.id || '').trim();
    if (!id) throw new AppError('VALIDATION_ERROR', 'id is required');

    const existing = await ctx.db.getRepository(DeliveryZone).findOneBy({ id });
    if (!existing) throw new AppError('NOT_FOUND', 'Delivery zone not found');

    const normalized = await normalizeZonePayload(
        { ...ctx, storeId: existing.storeId },
        { ...p, storeId: existing.storeId },
        true,
    );

    await ctx.db.transaction(async (tx: EntityManager) => {
        const r = await tx.getRepository(DeliveryZone).update(
            { id },
            {
                governorateId: normalized.governorateId,
                name: normalized.name,
                lat: normalized.lat,
                lng: normalized.lng,
                priceCents: normalized.priceCents,
                status: normalized.status,
            },
        );

        if (!r.affected) throw new AppError('NOT_FOUND', 'Delivery zone not found');
    });

    const saved = await ctx.db.getRepository(DeliveryZone).findOneByOrFail({ id });
    return { item: serializeZone(saved) };
}

export async function adminDeliveryZonesDisable(ctx: ActionContext, p: any) {
    const id = String(p?.id || '').trim();
    if (!id) throw new AppError('VALIDATION_ERROR', 'id is required');

    await ctx.db.transaction(async (tx: EntityManager) => {
        const r = await tx.getRepository(DeliveryZone).update({ id }, { status: 'disabled' } as any);
        if (!r.affected) throw new AppError('NOT_FOUND', 'Delivery zone not found');
    });

    return { disabled: true };
}

export async function adminCouponsList(ctx: ActionContext, p: any) {
    const items = await ctx.db.getRepository(Coupon).find({
        where: { storeId: p.storeId },
        order: { code: 'ASC' as any },
    });
    return { items };
}

export async function adminCouponsGet(ctx: ActionContext, p: any) {
    return { item: await getById(ctx, Coupon, p.id, 'Coupon not found') };
}

export async function adminCouponsCreate(ctx: ActionContext, p: any) {
    const normalized = normalizeCouponPayload(ctx, p, false);

    const existing = await ctx.db.getRepository(Coupon).findOneBy({
        storeId: normalized.storeId,
        code: normalized.code,
    });

    if (existing) throw new AppError('CONFLICT', 'Coupon code already exists');

    const id = uuidv4();

    await ctx.db.transaction(async (tx: EntityManager) => {
        await tx.getRepository(Coupon).save(tx.getRepository(Coupon).create({ id, ...normalized }));
    });

    return { item: await ctx.db.getRepository(Coupon).findOneByOrFail({ id }) };
}

export async function adminCouponsUpdate(ctx: ActionContext, p: any) {
    const id = String(p?.id || '').trim();
    if (!id) throw new AppError('VALIDATION_ERROR', 'id is required');

    const existing = await ctx.db.getRepository(Coupon).findOneBy({ id });
    if (!existing) throw new AppError('NOT_FOUND', 'Coupon not found');

    const normalized = normalizeCouponPayload(
        { ...ctx, storeId: existing.storeId },
        { ...p, storeId: existing.storeId },
        true,
    );

    const duplicate = await ctx.db.getRepository(Coupon).findOneBy({
        storeId: existing.storeId,
        code: normalized.code,
    });

    if (duplicate && duplicate.id !== id) {
        throw new AppError('CONFLICT', 'Coupon code already exists');
    }

    await ctx.db.transaction(async (tx: EntityManager) => {
        const r = await tx.getRepository(Coupon).update(
            { id },
            {
                code: normalized.code,
                discountType: normalized.discountType,
                discountValue: normalized.discountValue,
                startsAt: normalized.startsAt,
                endsAt: normalized.endsAt,
                perUserLimit: normalized.perUserLimit,
                status: normalized.status,
            },
        );

        if (!r.affected) throw new AppError('NOT_FOUND', 'Coupon not found');
    });

    return { item: await ctx.db.getRepository(Coupon).findOneByOrFail({ id }) };
}

export async function adminCouponsDisable(ctx: ActionContext, p: any) {
    const id = String(p?.id || '').trim();
    if (!id) throw new AppError('VALIDATION_ERROR', 'id is required');

    await ctx.db.transaction(async (tx: EntityManager) => {
        const r = await tx.getRepository(Coupon).update({ id }, { status: 'disabled' });
        if (!r.affected) throw new AppError('NOT_FOUND', 'Coupon not found');
    });

    return { disabled: true };
}

export async function adminCashbackList(ctx: ActionContext, p: any) {
    const items = await ctx.db.getRepository(CashbackOffer).find({
        where: { storeId: p.storeId },
        order: { name: 'ASC' as any },
    });
    return { items };
}

export async function adminCashbackGet(ctx: ActionContext, p: any) {
    return { item: await getById(ctx, CashbackOffer, p.id, 'Cashback rule not found') };
}

export async function adminCashbackCreate(ctx: ActionContext, p: any) {
    const normalized = normalizeCashbackPayload(ctx, p, false);
    const id = uuidv4();

    await ctx.db.transaction(async (tx: EntityManager) => {
        await tx.getRepository(CashbackOffer).save(tx.getRepository(CashbackOffer).create({ id, ...normalized }));
    });

    return { item: await ctx.db.getRepository(CashbackOffer).findOneByOrFail({ id }) };
}

export async function adminCashbackUpdate(ctx: ActionContext, p: any) {
    const id = String(p?.id || '').trim();
    if (!id) throw new AppError('VALIDATION_ERROR', 'id is required');

    const existing = await ctx.db.getRepository(CashbackOffer).findOneBy({ id });
    if (!existing) throw new AppError('NOT_FOUND', 'Cashback rule not found');

    const normalized = normalizeCashbackPayload(
        { ...ctx, storeId: existing.storeId },
        { ...p, storeId: existing.storeId },
        true,
    );

    await ctx.db.transaction(async (tx: EntityManager) => {
        const r = await tx.getRepository(CashbackOffer).update(
            { id },
            {
                name: normalized.name,
                percent: normalized.percent,
                rules: normalized.rules,
                status: normalized.status,
            } as any,
        );

        if (!r.affected) throw new AppError('NOT_FOUND', 'Cashback rule not found');
    });

    return { item: await ctx.db.getRepository(CashbackOffer).findOneByOrFail({ id }) };
}

export async function adminCashbackDisable(ctx: ActionContext, p: any) {
    const id = String(p?.id || '').trim();
    if (!id) throw new AppError('VALIDATION_ERROR', 'id is required');

    await ctx.db.transaction(async (tx: EntityManager) => {
        const r = await tx.getRepository(CashbackOffer).update({ id }, { status: 'disabled' } as any);
        if (!r.affected) throw new AppError('NOT_FOUND', 'Cashback rule not found');
    });

    return { disabled: true };
}

export async function adminDiscountsList(ctx: ActionContext, p: any) {
    const items = await ctx.db.getRepository(TargetedDiscount).find({
        where: { storeId: p.storeId },
        order: { name: 'ASC' as any },
    });
    return { items };
}

export async function adminDiscountsGet(ctx: ActionContext, p: any) {
    return { item: await getById(ctx, TargetedDiscount, p.id, 'Discount not found') };
}

export async function adminDiscountsCreate(ctx: ActionContext, p: any) {
    const normalized = normalizeDiscountPayload(ctx, p, false);
    const id = uuidv4();

    await ctx.db.transaction(async (tx: EntityManager) => {
        await tx.getRepository(TargetedDiscount).save(
            tx.getRepository(TargetedDiscount).create({
                id,
                ...normalized,
            } as any),
        );
    });

    return { item: await ctx.db.getRepository(TargetedDiscount).findOneByOrFail({ id }) };
}

export async function adminDiscountsUpdate(ctx: ActionContext, p: any) {
    const id = String(p?.id || '').trim();
    if (!id) throw new AppError('VALIDATION_ERROR', 'id is required');

    const existing = await ctx.db.getRepository(TargetedDiscount).findOneBy({ id });
    if (!existing) throw new AppError('NOT_FOUND', 'Discount not found');

    const normalized = normalizeDiscountPayload(
        { ...ctx, storeId: existing.storeId },
        { ...p, storeId: existing.storeId },
        true,
    );

    await ctx.db.transaction(async (tx: EntityManager) => {
        const r = await tx.getRepository(TargetedDiscount).update(
            { id },
            {
                name: normalized.name,
                percent: normalized.percent,
                audience: normalized.audience,
                status: normalized.status,
            } as any,
        );

        if (!r.affected) throw new AppError('NOT_FOUND', 'Discount not found');
    });

    return { item: await ctx.db.getRepository(TargetedDiscount).findOneByOrFail({ id }) };
}

export async function adminDiscountsDisable(ctx: ActionContext, p: any) {
    const id = String(p?.id || '').trim();
    if (!id) throw new AppError('VALIDATION_ERROR', 'id is required');

    await ctx.db.transaction(async (tx: EntityManager) => {
        const r = await tx.getRepository(TargetedDiscount).update({ id }, { status: 'disabled' } as any);
        if (!r.affected) throw new AppError('NOT_FOUND', 'Discount not found');
    });

    return { disabled: true };
}

export async function adminDiscountsPreviewAudienceCount(_ctx: ActionContext, p: any) {
    const audience = p?.audience ?? {};
    const count =
        Array.isArray(audience?.userIds) ? audience.userIds.length :
            Array.isArray(audience?.segments) ? audience.segments.length * 100 :
                Object.keys(audience || {}).length ? 1000 : 0;

    return {
        count,
        estimatedAudience: count,
    };
}

export async function adminNotificationsSend(ctx: ActionContext, p: any) {
    const users: Array<{ uid: string }> = await ctx.db.query(
        "SELECT uid FROM user_profiles WHERE status='active' LIMIT ?",
        [p.limit || 100],
    );

    await ctx.db.transaction(async (tx: EntityManager) => {
        for (const u of users) {
            await tx.getRepository(Notification).save(
                tx.getRepository(Notification).create({
                    id: uuidv4(),
                    uid: u.uid,
                    title: p.title,
                    body: p.body,
                    isRead: false,
                }),
            );
        }
    });

    return { sent: true };
}

export async function adminNotificationsList(ctx: ActionContext, p: any) {
    return {
        notifications: await ctx.db.query(
            "SELECT * FROM notifications ORDER BY createdAt DESC LIMIT ?",
            [p.limit || 100],
        ),
    };
}

export async function adminLoyaltyGetSettings(ctx: ActionContext, p: any) {
    let s = await ctx.db.getRepository(LoyaltySetting).findOneBy({ storeId: p.storeId });
    if (!s) {
        s = ctx.db.getRepository(LoyaltySetting).create({
            storeId: p.storeId,
            pointsPerCurrencyUnit: 1,
            redeemStepPoints: 100,
            redeemStepValueCents: '100',
        });
    }
    return { settings: s };
}

export async function adminLoyaltyUpdateSettings(ctx: ActionContext, p: any) {
    await ctx.db.transaction(async (tx: EntityManager) => {
        await tx.getRepository(LoyaltySetting).upsert(
            {
                storeId: p.storeId,
                pointsPerCurrencyUnit: p.pointsPerCurrencyUnit,
                redeemStepPoints: p.redeemStepPoints,
                redeemStepValueCents: String(p.redeemStepValueCents),
            },
            ['storeId'],
        );
    });
    return adminLoyaltyGetSettings(ctx, p);
}

export async function adminLoyaltyAdjustUserPoints(ctx: ActionContext, p: any) {
    await ctx.db.transaction(async (tx: EntityManager) => {
        await tx.getRepository(LoyaltyTransaction).save(
            tx.getRepository(LoyaltyTransaction).create({
                id: uuidv4(),
                uid: p.uid,
                storeId: p.storeId,
                pointsDelta: p.pointsDelta,
                type: 'admin_adjust',
            }),
        );
    });
    return { adjusted: true };
}

const tier = crud(LoyaltyTier, 'Loyalty tier');
export const adminLoyaltyTiersList = tier.list;
export const adminLoyaltyTiersCreate = tier.create;
export const adminLoyaltyTiersUpdate = tier.update;
export const adminLoyaltyTiersDisable = tier.disable;

export async function adminReportsAttributionOverview(ctx: ActionContext, p: any) {
    const rows = await ctx.db.query(
        'SELECT source, COUNT(*) c FROM marketing_attribution_events WHERE storeId=? GROUP BY source ORDER BY c DESC',
        [p.storeId],
    );
    return { overview: rows };
}

export async function adminReportsTopCampaigns(ctx: ActionContext, p: any) {
    const rows = await ctx.db.query(
        'SELECT campaign, COUNT(*) c FROM marketing_attribution_events WHERE storeId=? GROUP BY campaign ORDER BY c DESC LIMIT ?',
        [p.storeId, p.limit || 20],
    );
    return { campaigns: rows };
}

const flow = crud(PostPurchaseFlow, 'Post purchase flow');
export const adminPostPurchaseFlowsList = flow.list;
export const adminPostPurchaseFlowsGet = flow.get;
export const adminPostPurchaseFlowsCreate = flow.create;
export const adminPostPurchaseFlowsUpdate = flow.update;
export const adminPostPurchaseFlowsDisable = flow.disable;

export async function adminPostPurchaseRunsList(ctx: ActionContext, p: any) {
    const rows = await ctx.db.getRepository(PostPurchaseRun).find({
        order: { createdAt: 'DESC' as any },
        take: p.limit || 50,
    });
    return { runs: rows };
}