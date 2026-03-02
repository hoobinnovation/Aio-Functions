import { ActionContext } from '../../core/protocol';
import { Category } from '../../entities/Category';
import { Product } from '../../entities/Product';
import { ProductVariant } from '../../entities/ProductVariant';
import { SeoSetting } from '../../entities/SeoSetting';
import { LandingPage } from '../../entities/LandingPage';

function page(payload: any) {
  const limit = Math.min(Math.max(Number(payload?.limit || 20), 1), 100);
  const offset = Math.max(Number(payload?.offset || 0), 0);
  return { limit, offset };
}

export async function publicCatalogGetHome(ctx: ActionContext, payload: any) {
  const { limit, offset } = page(payload);
  const products = await ctx.db.getRepository(Product).find({ where: { storeId: ctx.storeId, status: 'active' }, take: limit, skip: offset, order: { updatedAt: 'DESC' as any } });
  return { sections: [{ type: 'products', items: products }], pagination: { limit, offset } };
}

export async function publicCatalogGetCategories(ctx: ActionContext) {
  const categories = await ctx.db.getRepository(Category).find({ where: { storeId: ctx.storeId, status: 'active' }, order: { sortOrder: 'ASC' as any } });
  return { categories };
}

export async function publicCatalogListProducts(ctx: ActionContext, payload: any) {
  const { limit, offset } = page(payload);
  const where: any = { storeId: ctx.storeId, status: 'active' };
  if (payload?.categoryId) where.categoryId = payload.categoryId;
  const products = await ctx.db.getRepository(Product).find({ where, take: limit, skip: offset, order: { updatedAt: 'DESC' as any } });
  return { products, pagination: { limit, offset } };
}

export async function publicCatalogSearchProducts(ctx: ActionContext, payload: any) {
  const { limit, offset } = page(payload);
  const q = `%${payload?.query || ''}%`;
  const rows = await ctx.db.query('SELECT * FROM products WHERE storeId=? AND status=\'active\' AND (name LIKE ? OR slug LIKE ?) ORDER BY updatedAt DESC LIMIT ? OFFSET ?', [ctx.storeId, q, q, limit, offset]);
  return { products: rows, pagination: { limit, offset } };
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
