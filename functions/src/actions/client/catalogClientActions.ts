import { v4 as uuidv4 } from 'uuid';
import { EntityManager } from 'typeorm';
import { ActionContext } from '../../core/protocol';
import { UserProductFavorite } from '../../entities/UserProductFavorite';
import { UserStoreFavorite } from '../../entities/UserStoreFavorite';
import { normalizeListQueryInput } from '../../utils/queryNormalization';
import { buildHomeLayout } from '../home/homeBuilder';
import { Category } from '../../entities/Category';
import { Product } from '../../entities/Product';
import { requireAccountIdentity } from '../../core/identity';

const CLIENT_PRODUCT_QUERY_CONTRACT = {
    allowedSortFields: ['sort.by','createdAt', 'updatedAt', 'name', 'slug', 'categoryId'],
    sortAliases: {
        newest: { by: 'createdAt', direction: 'desc' as const },
        oldest: { by: 'createdAt', direction: 'asc' as const },
        recentlyUpdated: { by: 'updatedAt', direction: 'desc' as const },
        nameAsc: { by: 'name', direction: 'asc' as const },
        nameDesc: { by: 'name', direction: 'desc' as const },
    },
    allowedFilterKeys: ['categoryId'],
    allowedGroupByKeys: ['categoryId'],
    allowedColumns: ['id', 'storeId', 'categoryId', 'name', 'slug', 'description', 'createdAt', 'updatedAt'],
};

export async function homeGetLayout(ctx: ActionContext, payload: any = {}) {
    return buildHomeLayout(ctx, payload);
}

export async function catalogGetCategories(ctx: ActionContext) {
    const repo = ctx.db.getRepository(Category);

    const categories = await repo.find({
        where: {
            storeId: ctx.storeId,
            isActive: true,
        } as any,
        order: {
            sortOrder: 'ASC' as any,
        },
    });

    return {
        categories,
    };
}

export async function catalogListProducts(ctx: ActionContext, payload: any = {}) {
    const q = normalizeListQueryInput(payload, {
        defaultPageSize: 20,
        maxPageSize: 200,
        defaultSort: { by: 'updatedAt', dir: 'desc' },
        contract: CLIENT_PRODUCT_QUERY_CONTRACT,
    });

    const repo = ctx.db.getRepository(Product);

    const where: any = {
        storeId: ctx.storeId,
        isActive: true,
    };

    if (payload.categoryId) {
        where.categoryId = payload.categoryId;
    }

    const [products, total] = await repo.findAndCount({
        where,
        order: {
            [q.sort.by]: q.sort.direction.toUpperCase() as any,
        },
        skip: q.offset,
        take: q.limit,
    });

    return {
        products,
        total,
        page: q.page,
        pageSize: q.pageSize,
        pagination: {
            page: q.page,
            pageSize: q.pageSize,
            total,
            hasMore: q.offset + products.length < total,
        },
    };
}

export async function productFavoritesList(ctx: ActionContext, payload: any = {}) {
    const uid = requireAccountIdentity(ctx);
    const q = normalizeListQueryInput(payload, { defaultPageSize: 20, maxPageSize: 200 });
    const rows = await ctx.db.getRepository(UserProductFavorite).find({
        where: { uid },
        order: { createdAt: 'DESC' as any },
        take: q.limit,
        skip: q.offset,
    });

    return { favorites: rows };
}

export async function productFavoritesToggle(ctx: ActionContext, payload: any) {
    const repo = ctx.db.getRepository(UserProductFavorite);
    const uid = requireAccountIdentity(ctx);
    const existing = await repo.findOneBy({ uid, productId: payload.productId });

    if (existing) {
        await ctx.db.transaction(async (tx: EntityManager) => {
            await tx.getRepository(UserProductFavorite).delete({ id: existing.id });
        });
        return { favorited: false };
    }

    await ctx.db.transaction(async (tx: EntityManager) => {
        await tx.getRepository(UserProductFavorite).save(
            tx.getRepository(UserProductFavorite).create({
                id: uuidv4(),
                uid,
                productId: payload.productId,
            })
        );
    });

    return { favorited: true };
}

export async function storeFavoritesList(ctx: ActionContext, payload: any = {}) {
    const uid = requireAccountIdentity(ctx);
    const q = normalizeListQueryInput(payload, { defaultPageSize: 20, maxPageSize: 200 });
    const rows = await ctx.db.getRepository(UserStoreFavorite).find({
        where: { uid },
        order: { createdAt: 'DESC' as any },
        take: q.limit,
        skip: q.offset,
    });

    return { favorites: rows };
}

export async function storeFavoritesToggle(ctx: ActionContext, payload: any) {
    const repo = ctx.db.getRepository(UserStoreFavorite);
    const uid = requireAccountIdentity(ctx);
    const existing = await repo.findOneBy({ uid, storeId: payload.storeId });

    if (existing) {
        await ctx.db.transaction(async (tx: EntityManager) => {
            await tx.getRepository(UserStoreFavorite).delete({ id: existing.id });
        });
        return { favorited: false };
    }

    await ctx.db.transaction(async (tx: EntityManager) => {
        await tx.getRepository(UserStoreFavorite).save(
            tx.getRepository(UserStoreFavorite).create({
                id: uuidv4(),
                uid,
                storeId: payload.storeId,
            })
        );
    });

    return { favorited: true };
}
