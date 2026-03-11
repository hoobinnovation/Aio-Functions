import { ActionContext } from '../../core/protocol';
import { Category } from '../../entities/Category';
import { Product } from '../../entities/Product';
import { ProductVariant } from '../../entities/ProductVariant';
import { SeoSetting } from '../../entities/SeoSetting';
import { LandingPage } from '../../entities/LandingPage';
import { normalizeListQueryInput } from '../../utils/queryNormalization';
import { resolveStoreVisibleCategories, resolveStoreVisibleProducts } from '../catalogResolver';

const PUBLIC_PRODUCT_QUERY_CONTRACT = {
  allowedSortFields: ['createdAt', 'updatedAt', 'name', 'slug', 'categoryId', 'status', 'ratingAverage', 'popularityScore'],
  sortAliases: {
    newest: { by: 'createdAt', direction: 'desc' as const },
    oldest: { by: 'createdAt', direction: 'asc' as const },
    recentlyUpdated: { by: 'updatedAt', direction: 'desc' as const },
    nameAsc: { by: 'name', direction: 'asc' as const },
    nameDesc: { by: 'name', direction: 'desc' as const },
    topRated: { by: 'ratingAverage', direction: 'desc' as const },
    mostPopular: { by: 'popularityScore', direction: 'desc' as const },
    priceLowToHigh: { by: 'updatedAt', direction: 'asc' as const },
    priceHighToLow: { by: 'updatedAt', direction: 'desc' as const },
  },
  allowedFilterKeys: ['categoryId', 'status'],
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
    sortBy: q.sort.by,
    sortDirection: q.sort.direction === 'asc' ? 'ASC' : 'DESC',
    limit: q.limit,
    offset: q.offset,
  });

  return { sections: [{ type: 'products', items: products }], pagination: buildPagination(total, q.page, q.pageSize) };
}

export async function publicCatalogGetCategories(ctx: ActionContext) {
  const categories = await resolveStoreVisibleCategories(ctx.db, ctx.storeId!, false);
  return { categories };
}

export async function publicCatalogListProducts(ctx: ActionContext, payload: any = {}) {
  const q = listQuery(payload);
  const categoryId = payload?.categoryId ?? q.filters.categoryId;
  const { rows: products, total } = await resolveStoreVisibleProducts(ctx.db, ctx.storeId!, {
    includeDisabled: false,
    categoryId: typeof categoryId === 'string' && categoryId.trim() ? categoryId.trim() : undefined,
    sortBy: q.sort.by,
    sortDirection: q.sort.direction === 'asc' ? 'ASC' : 'DESC',
    limit: q.limit,
    offset: q.offset,
  });
  return { products, pagination: buildPagination(total, q.page, q.pageSize), query: q };
}

export async function publicCatalogSearchProducts(ctx: ActionContext, payload: any = {}) {
  const qn = listQuery(payload);
  const queryTerm = qn.search.term;
  const q = `%${queryTerm}%`;
  const sortBy = qn.sort.by;
  const sortDirection = qn.sort.direction === 'asc' ? 'ASC' : 'DESC';
  const rows = await ctx.db.query(
    `SELECT p.* FROM products p
     WHERE (((p.mode='global' AND p.storeId IS NULL) OR (p.mode='store' AND p.storeId=?))) AND p.status='active' AND (p.name LIKE ? OR p.slug LIKE ?)
     ORDER BY ${sortBy} ${sortDirection}
     LIMIT ? OFFSET ?`,
    [ctx.storeId, q, q, qn.limit, qn.offset],
  );
  return { products: rows, pagination: { page: qn.page, pageSize: qn.pageSize, hasMore: rows.length === qn.limit }, query: queryTerm, search: qn.search };
}

export async function publicCatalogGetFilters(ctx: ActionContext, payload: any = {}) {
  const q = listQuery(payload);
  const categories = await resolveStoreVisibleCategories(ctx.db, ctx.storeId!, false);
  return { filters: { categories }, query: { groupBy: q.groupBy, columns: q.columns, flags: q.flags } };
}

export async function publicProductGetById(ctx: ActionContext, payload: any) {
  const product = await ctx.db.getRepository(Product).findOne({ where: [{ id: payload.productId, mode: 'global', storeId: null, status: 'active' }, { id: payload.productId, mode: 'store', storeId: ctx.storeId, status: 'active' }] as any });
  if (!product) return { product: null };
  const variants = await ctx.db.getRepository(ProductVariant).find({ where: { productId: product.id, status: 'active' } });
  return { product, variants };
}

export async function publicProductGetBySlug(ctx: ActionContext, payload: any) {
  const product = await ctx.db.getRepository(Product).findOne({ where: [{ slug: payload.slug, mode: 'global', storeId: null, status: 'active' }, { slug: payload.slug, mode: 'store', storeId: ctx.storeId, status: 'active' }] as any });
  if (!product) return { product: null };
  const variants = await ctx.db.getRepository(ProductVariant).find({ where: { productId: product.id, status: 'active' } });
  return { product, variants };
}

export async function publicCategoryGetById(ctx: ActionContext, payload: any) {
  const category = await ctx.db.getRepository(Category).findOne({ where: [{ id: payload.categoryId, mode: 'global', storeId: null, status: 'active' }, { id: payload.categoryId, mode: 'store', storeId: ctx.storeId, status: 'active' }] as any });
  return { category };
}

export async function publicCategoryGetBySlug(ctx: ActionContext, payload: any) {
  const category = await ctx.db.getRepository(Category).findOne({ where: [{ slug: payload.slug, mode: 'global', storeId: null, status: 'active' }, { slug: payload.slug, mode: 'store', storeId: ctx.storeId, status: 'active' }] as any });
  return { category };
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
