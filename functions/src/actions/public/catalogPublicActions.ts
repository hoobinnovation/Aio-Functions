import { ActionContext } from '../../core/protocol';
import { Category } from '../../entities/Category';
import { Product } from '../../entities/Product';
import { ProductVariant } from '../../entities/ProductVariant';
import { SeoSetting } from '../../entities/SeoSetting';
import { LandingPage } from '../../entities/LandingPage';
import { normalizeListQueryInput } from '../../utils/queryNormalization';

function listQuery(payload: any) {
  return normalizeListQueryInput(payload, { defaultPageSize: 20, maxPageSize: 100, defaultSort: { by: 'updatedAt', dir: 'desc' } });
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
  const [products, total] = await ctx.db.getRepository(Product).findAndCount({
    where: { storeId: ctx.storeId, status: 'active' },
    take: q.limit,
    skip: q.offset,
    order: { [q.sort.by]: q.sort.dir.toUpperCase() as any },
  });

  return { sections: [{ type: 'products', items: products }], pagination: buildPagination(total, q.page, q.pageSize) };
}

export async function publicCatalogGetCategories(ctx: ActionContext) {
  const categories = await ctx.db.getRepository(Category).find({ where: { storeId: ctx.storeId, status: 'active' }, order: { sortOrder: 'ASC' as any } });
  return { categories };
}

export async function publicCatalogListProducts(ctx: ActionContext, payload: any = {}) {
  const q = listQuery(payload);
  const where: any = { storeId: ctx.storeId, status: 'active' };
  if (payload?.categoryId) where.categoryId = payload.categoryId;
  const [products, total] = await ctx.db.getRepository(Product).findAndCount({
    where,
    take: q.limit,
    skip: q.offset,
    order: { [q.sort.by]: q.sort.dir.toUpperCase() as any },
  });
  return { products, pagination: buildPagination(total, q.page, q.pageSize) };
}

export async function publicCatalogSearchProducts(ctx: ActionContext, payload: any = {}) {
  const qn = listQuery(payload);
  const q = `%${qn.query || ''}%`;
  const rows = await ctx.db.query('SELECT * FROM products WHERE storeId=? AND status=\'active\' AND (name LIKE ? OR slug LIKE ?) ORDER BY updatedAt DESC LIMIT ? OFFSET ?', [ctx.storeId, q, q, qn.limit, qn.offset]);
  return { products: rows, pagination: { page: qn.page, pageSize: qn.pageSize, hasMore: rows.length === qn.limit }, query: qn.query };
}

export async function publicCatalogGetFilters(ctx: ActionContext) {
  const categories = await ctx.db.getRepository(Category).find({ where: { storeId: ctx.storeId, status: 'active' }, order: { sortOrder: 'ASC' as any } });
  return { filters: { categories } };
}

export async function publicProductGetById(ctx: ActionContext, payload: any) {
  const product = await ctx.db.getRepository(Product).findOneBy({ id: payload.productId, storeId: ctx.storeId, status: 'active' });
  if (!product) return { product: null };
  const variants = await ctx.db.getRepository(ProductVariant).find({ where: { productId: product.id, status: 'active' } });
  return { product, variants };
}

export async function publicProductGetBySlug(ctx: ActionContext, payload: any) {
  const product = await ctx.db.getRepository(Product).findOneBy({ slug: payload.slug, storeId: ctx.storeId, status: 'active' });
  if (!product) return { product: null };
  const variants = await ctx.db.getRepository(ProductVariant).find({ where: { productId: product.id, status: 'active' } });
  return { product, variants };
}

export async function publicCategoryGetById(ctx: ActionContext, payload: any) {
  const category = await ctx.db.getRepository(Category).findOneBy({ id: payload.categoryId, storeId: ctx.storeId, status: 'active' });
  return { category };
}

export async function publicCategoryGetBySlug(ctx: ActionContext, payload: any) {
  const category = await ctx.db.getRepository(Category).findOneBy({ slug: payload.slug, storeId: ctx.storeId, status: 'active' });
  return { category };
}

export async function publicSeoGetPageMeta(ctx: ActionContext, payload: any) {
  const row = await ctx.db.getRepository(SeoSetting).findOneBy({ storeId: ctx.storeId!, pageType: payload.pageType, pageKey: payload.pageKey });
  return { meta: row };
}

export async function publicSeoGetLanding(ctx: ActionContext, payload: any) {
  const page = await ctx.db.getRepository(LandingPage).findOneBy({ storeId: ctx.storeId!, slug: payload.slug, status: 'published' });
  return { landing: page };
}
