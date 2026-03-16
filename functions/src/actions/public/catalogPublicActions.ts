import { ActionContext } from '../../core/protocol';
import { Category } from '../../entities/Category';
import { Product } from '../../entities/Product';
import { SeoSetting } from '../../entities/SeoSetting';
import { LandingPage } from '../../entities/LandingPage';
import { normalizeListQueryInput } from '../../utils/queryNormalization';
import {
    resolveStoreVisibleCategories,
    resolveStoreVisibleProducts,
    resolveStoreVisibleProductById,
    resolveStoreVisibleProductBySlug,
} from '../catalogResolver';

const PUBLIC_PRODUCT_QUERY_CONTRACT = {
    allowedSortFields: ['createdAt', 'updatedAt', 'name', 'slug', 'categoryId', 'status', 'ratingAverage', 'popularityScore', 'price', 'discountPercent'],
    sortAliases: {
        newest: { by: 'createdAt', direction: 'desc' as const },
        oldest: { by: 'createdAt', direction: 'asc' as const },
        recentlyUpdated: { by: 'updatedAt', direction: 'desc' as const },
        nameAsc: { by: 'name', direction: 'asc' as const },
        nameDesc: { by: 'name', direction: 'desc' as const },
        topRated: { by: 'ratingAverage', direction: 'desc' as const },
        mostPopular: { by: 'popularityScore', direction: 'desc' as const },
        priceLowToHigh: { by: 'price', direction: 'asc' as const },
        priceHighToLow: { by: 'price', direction: 'desc' as const },
        discountHighToLow: { by: 'discountPercent', direction: 'desc' as const },
    },
    allowedFilterKeys: ['categoryId', 'status', 'minPrice', 'maxPrice', 'attrs', 'onSale', 'inStock'],
    allowedGroupByKeys: ['categoryId', 'status'],
    allowedColumns: ['id', 'storeId', 'categoryId', 'name', 'slug', 'description', 'status', 'ratingAverage', 'ratingCount', 'favoriteCount', 'completedOrderQty', 'popularityScore', 'createdAt', 'updatedAt'],
};

function listQuery(payload: any) {
    return normalizeListQueryInput(payload, {
        defaultPageSize: 20,
        maxPageSize: 100,
        defaultSort: { by: 'updatedAt', dir: 'desc' },
        contract: PUBLIC_PRODUCT_QUERY_CONTRACT,
    });
}

function buildPagination(total: number, page: number, pageSize: number) {
    return {
        total,
        page,
        pageSize,
        hasMore: page * pageSize < total,
    };
}

export async function publicCatalogGetHome(ctx: ActionContext, payload: any = {}) {
    const q = listQuery(payload);
    const { rows: products, total } = await resolveStoreVisibleProducts(ctx.db, ctx.storeId!, {
        includeDisabled: false,
        minPrice: Number.isFinite(Number(q.filters.minPrice)) ? Number(q.filters.minPrice) : undefined,
        maxPrice: Number.isFinite(Number(q.filters.maxPrice)) ? Number(q.filters.maxPrice) : undefined,
        ...resolveCatalogBooleanFilters(q.filters),
        sortBy: q.sort.by,
        sortDirection: q.sort.direction === 'asc' ? 'ASC' : 'DESC',
        limit: q.limit,
        offset: q.offset,
    });

    return {
        sections: [{ type: 'products', items: products }],
        products,
        total,
        page: q.page,
        pageSize: q.pageSize,
        pagination: buildPagination(total, q.page, q.pageSize),
    };
}

export async function publicCatalogGetCategories(ctx: ActionContext, payload: any = {}) {
    const categories = await resolveStoreVisibleCategories(ctx.db, ctx.storeId!, false);
    const requestedParentId = typeof payload?.parentId === 'string' && payload.parentId.trim() ? payload.parentId.trim() : null;
    const requestedSlug = typeof payload?.slug === 'string' && payload.slug.trim() ? payload.slug.trim() : null;

    let parentCategory = null;
    if (requestedSlug) {
        parentCategory = categories.find((category: any) => category.slug === requestedSlug) || null;
    } else if (requestedParentId) {
        parentCategory = categories.find((category: any) => category.id === requestedParentId) || null;
    }

    const targetParentId = parentCategory?.id || requestedParentId || null;
    const filteredCategories = targetParentId
        ? categories.filter((category: any) => String(category.parentId || '') === String(targetParentId))
        : categories;

    const countRows = await ctx.db.query(
        `SELECT categoryId, COUNT(*) total
         FROM (
            SELECT p.categoryId categoryId
            FROM products p
            WHERE ((p.mode='global' AND p.storeId IS NULL) OR (p.mode='store' AND p.storeId=?))
              AND p.status='active'
              AND p.categoryId IS NOT NULL
            UNION ALL
            SELECT pc.categoryId categoryId
            FROM product_categories pc
            INNER JOIN products p ON p.id = pc.productId
            WHERE ((p.mode='global' AND p.storeId IS NULL) OR (p.mode='store' AND p.storeId=?))
              AND p.status='active'
         ) x
         GROUP BY categoryId`,
        [ctx.storeId!, ctx.storeId!],
    );
    const productsCountByCategoryId = new Map<string, number>(
        countRows.map((row: any) => [String(row.categoryId), Number(row.total || 0)] as const),
    );

    const childCountByParentId = new Map<string, number>();
    for (const category of categories as any[]) {
        const parentId = String(category.parentId || '').trim();
        if (!parentId) continue;
        childCountByParentId.set(parentId, Number(childCountByParentId.get(parentId) || 0) + 1);
    }

    return {
        categories: filteredCategories.map((category: any) => ({
            ...category,
            productsCount: Number(productsCountByCategoryId.get(String(category.id)) || 0),
            childrenCount: Number(childCountByParentId.get(String(category.id)) || 0),
            parent: category.parentId
                ? categories.find((entry: any) => entry.id === category.parentId) || null
                : null,
        })),
        parentCategory,
    };
}

function parseBooleanFilter(value: any): boolean | undefined {
    if (value === true || value === false) return value;
    if (typeof value === 'number') return value === 1 ? true : value === 0 ? false : undefined;
    if (typeof value !== 'string') return undefined;
    const normalized = value.trim().toLowerCase();
    if (['true', '1', 'yes', 'on'].includes(normalized)) return true;
    if (['false', '0', 'no', 'off'].includes(normalized)) return false;
    return undefined;
}

function resolveCatalogBooleanFilters(filters: Record<string, any> = {}) {
    const attrs = (filters?.attrs && typeof filters.attrs === 'object') ? filters.attrs : {};
    const onSale = parseBooleanFilter(filters.onSale ?? attrs.onSale?.[0] ?? attrs.sale?.[0] ?? attrs.offers?.[0]);
    const inStock = parseBooleanFilter(filters.inStock ?? attrs.inStock?.[0] ?? attrs.availability?.[0]);
    return { onSale, inStock };
}

export async function publicCatalogListProducts(ctx: ActionContext, payload: any = {}) {
    const q = listQuery(payload);
    const categoryId = payload?.categoryId ?? q.filters.categoryId;

    const { rows: products, total } = await resolveStoreVisibleProducts(ctx.db, ctx.storeId!, {
        includeDisabled: false,
        categoryId: typeof categoryId === 'string' && categoryId.trim() ? categoryId.trim() : undefined,
        minPrice: Number.isFinite(Number(q.filters.minPrice)) ? Number(q.filters.minPrice) : undefined,
        maxPrice: Number.isFinite(Number(q.filters.maxPrice)) ? Number(q.filters.maxPrice) : undefined,
        ...resolveCatalogBooleanFilters(q.filters),
        sortBy: q.sort.by,
        sortDirection: q.sort.direction === 'asc' ? 'ASC' : 'DESC',
        limit: q.limit,
        offset: q.offset,
    });

    return {
        products,
        total,
        page: q.page,
        pageSize: q.pageSize,
        pagination: buildPagination(total, q.page, q.pageSize),
        query: q,
    };
}

export async function publicCatalogSearchProducts(ctx: ActionContext, payload: any = {}) {
    const q = listQuery(payload);
    const queryTerm = String(q.search.term || '').trim();

    const { rows: products, total } = await resolveStoreVisibleProducts(ctx.db, ctx.storeId!, {
        includeDisabled: false,
        searchTerm: queryTerm || undefined,
        minPrice: Number.isFinite(Number(q.filters.minPrice)) ? Number(q.filters.minPrice) : undefined,
        maxPrice: Number.isFinite(Number(q.filters.maxPrice)) ? Number(q.filters.maxPrice) : undefined,
        ...resolveCatalogBooleanFilters(q.filters),
        sortBy: q.sort.by,
        sortDirection: q.sort.direction === 'asc' ? 'ASC' : 'DESC',
        limit: q.limit,
        offset: q.offset,
    });

    return {
        products,
        total,
        page: q.page,
        pageSize: q.pageSize,
        pagination: buildPagination(total, q.page, q.pageSize),
        query: queryTerm,
        search: q.search,
    };
}

export async function publicCatalogGetFilters(ctx: ActionContext, payload: any = {}) {
    const q = listQuery(payload);
    const categories = await resolveStoreVisibleCategories(ctx.db, ctx.storeId!, false);
    return {
        filters: {
            categories,
            groups: [
                {
                    key: 'onSale',
                    label: 'العروض',
                    type: 'checkbox',
                    options: [{ value: 'true', label: 'المنتجات المخفضة' }],
                },
                {
                    key: 'inStock',
                    label: 'التوفر',
                    type: 'checkbox',
                    options: [{ value: 'true', label: 'المتوفر فقط' }],
                },
            ],
        },
        query: { groupBy: q.groupBy, columns: q.columns, flags: q.flags },
    };
}

export async function publicProductGetById(ctx: ActionContext, payload: any) {
    return resolveStoreVisibleProductById(ctx.db, ctx.storeId!, payload.productId, false);
}

export async function publicProductGetBySlug(ctx: ActionContext, payload: any) {
    return resolveStoreVisibleProductBySlug(ctx.db, ctx.storeId!, payload.slug, false);
}

export async function publicCategoryGetById(ctx: ActionContext, payload: any) {
    const category = await ctx.db.getRepository(Category).findOne({ where: [{ id: payload.categoryId, mode: 'global', storeId: null, status: 'active' }, { id: payload.categoryId, mode: 'store', storeId: ctx.storeId, status: 'active' }] as any });
    if (!category) return { category: null };
    const categories = await resolveStoreVisibleCategories(ctx.db, ctx.storeId!, false);
    const productsCountRows = await ctx.db.query(
        `SELECT COUNT(*) total
         FROM (
            SELECT p.id
            FROM products p
            WHERE ((p.mode='global' AND p.storeId IS NULL) OR (p.mode='store' AND p.storeId=?))
              AND p.status='active'
              AND (p.categoryId=? OR EXISTS (SELECT 1 FROM product_categories pc WHERE pc.productId=p.id AND pc.categoryId=?))
         ) x`,
        [ctx.storeId!, category.id, category.id],
    );
    const parent = category.parentId ? categories.find((entry: any) => entry.id === category.parentId) || null : null;
    return { category: { ...category, productsCount: Number(productsCountRows[0]?.total || 0), parent } };
}

export async function publicCategoryGetBySlug(ctx: ActionContext, payload: any) {
    const category = await ctx.db.getRepository(Category).findOne({ where: [{ slug: payload.slug, mode: 'global', storeId: null, status: 'active' }, { slug: payload.slug, mode: 'store', storeId: ctx.storeId, status: 'active' }] as any });
    if (!category) return { category: null };
    const categories = await resolveStoreVisibleCategories(ctx.db, ctx.storeId!, false);
    const productsCountRows = await ctx.db.query(
        `SELECT COUNT(*) total
         FROM (
            SELECT p.id
            FROM products p
            WHERE ((p.mode='global' AND p.storeId IS NULL) OR (p.mode='store' AND p.storeId=?))
              AND p.status='active'
              AND (p.categoryId=? OR EXISTS (SELECT 1 FROM product_categories pc WHERE pc.productId=p.id AND pc.categoryId=?))
         ) x`,
        [ctx.storeId!, category.id, category.id],
    );
    const parent = category.parentId ? categories.find((entry: any) => entry.id === category.parentId) || null : null;
    return { category: { ...category, productsCount: Number(productsCountRows[0]?.total || 0), parent } };
}

export async function publicSeoGetPageMeta(ctx: ActionContext, payload: any) {
    const row = await ctx.db.getRepository(SeoSetting).findOneBy({ storeId: ctx.storeId!, pageType: payload.pageType, pageKey: payload.pageKey });
    return { meta: row };
}

export async function publicSeoGetPageSettings(ctx: ActionContext, payload: any) {
    return publicSeoGetPageMeta(ctx, payload);
}

export async function publicSeoSettingsGet(ctx: ActionContext, payload: any) {
    return publicSeoGetPageMeta(ctx, payload);
}

export async function publicSeoGetLanding(ctx: ActionContext, payload: any) {
    const page = await ctx.db.getRepository(LandingPage).findOneBy({ storeId: ctx.storeId!, slug: payload.slug, status: 'published' });
    return { landing: page };
}
