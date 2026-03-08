import { EntityManager } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { ActionContext } from '../../core/protocol';
import { Category } from '../../entities/Category';
import { Banner } from '../../entities/Banner';
import { FeaturedItem } from '../../entities/FeaturedItem';
import { Product } from '../../entities/Product';
import { ProductImage } from '../../entities/ProductImage';
import { ProductSpec } from '../../entities/ProductSpec';
import { ProductVariant } from '../../entities/ProductVariant';
import { InventoryAdjustment } from '../../entities/InventoryAdjustment';
import { HomeSection } from '../../entities/HomeSection';
import { SeoSetting } from '../../entities/SeoSetting';
import { LandingPage } from '../../entities/LandingPage';
import { SitemapRun } from '../../entities/SitemapRun';
import { AppError } from '../../core/errors';
import { normalizeListQueryInput, resolveStoreScopedId } from '../../utils/queryNormalization';
import { normalizeSectionForWrite, publishHomeLayoutForStore } from '../home/homeBuilder';

async function byIdOrThrow(ctx: ActionContext, repo: any, id: string, msg: string) {
  const row = await ctx.db.getRepository(repo).findOneBy({ id });
  if (!row) throw new AppError('NOT_FOUND', msg);
  return row;
}

export async function adminCategoriesList(ctx: ActionContext, payload: any = {}) {
  const q = normalizeListQueryInput(payload, { defaultPageSize: 50, maxPageSize: 200 });
  const storeId = resolveStoreScopedId(ctx.storeId, payload.storeId);
  const rows = await ctx.db.getRepository(Category).find({ where: { storeId }, order: { sortOrder: 'ASC' as any }, take: q.limit, skip: q.offset });
  return { categories: rows };
}
export async function adminCategoriesGet(ctx: ActionContext, payload: any) { return { category: await byIdOrThrow(ctx, Category, payload.id, 'Category not found') }; }
export async function adminCategoriesCreate(ctx: ActionContext, payload: any) {
  const id = uuidv4();
  await ctx.db.transaction(async (tx: EntityManager) => { await tx.getRepository(Category).save(tx.getRepository(Category).create({ id, ...payload })); });
  return { category: await ctx.db.getRepository(Category).findOneByOrFail({ id }) };
}
export async function adminCategoriesUpdate(ctx: ActionContext, payload: any) {
  await ctx.db.transaction(async (tx: EntityManager) => { const r=await tx.getRepository(Category).update({ id: payload.id }, payload); if(!r.affected) throw new AppError('NOT_FOUND','Category not found'); });
  return adminCategoriesGet(ctx, { id: payload.id });
}
export async function adminCategoriesDisable(ctx: ActionContext, payload: any) { return adminCategoriesUpdate(ctx, { id: payload.id, status: 'disabled' }); }

export async function adminBannersList(ctx: ActionContext, payload: any = {}) { const q = normalizeListQueryInput(payload, { defaultPageSize: 50, maxPageSize: 200 }); const storeId = resolveStoreScopedId(ctx.storeId, payload.storeId); return { banners: await ctx.db.getRepository(Banner).find({ where: { storeId }, order: { sortOrder: 'ASC' as any }, take: q.limit, skip: q.offset }) }; }
export async function adminBannersGet(ctx: ActionContext, payload: any) { return { banner: await byIdOrThrow(ctx, Banner, payload.id, 'Banner not found') }; }
export async function adminBannersCreate(ctx: ActionContext, payload: any) { const id=uuidv4(); await ctx.db.transaction(async (tx: EntityManager)=>{ await tx.getRepository(Banner).save(tx.getRepository(Banner).create({ id, ...payload }));}); return adminBannersGet(ctx,{id}); }
export async function adminBannersUpdate(ctx: ActionContext, payload: any) { await ctx.db.transaction(async (tx: EntityManager)=>{ const r=await tx.getRepository(Banner).update({id:payload.id},payload); if(!r.affected) throw new AppError('NOT_FOUND','Banner not found');}); return adminBannersGet(ctx,{id:payload.id}); }
export async function adminBannersDisable(ctx: ActionContext, payload: any) { return adminBannersUpdate(ctx,{id:payload.id,status:'disabled'}); }

export async function adminFeaturedList(ctx: ActionContext, payload: any) { return { items: await ctx.db.getRepository(FeaturedItem).find({ where: { storeId: payload.storeId }, order: { sortOrder: 'ASC' as any } }) }; }
export async function adminFeaturedSearchProducts(ctx: ActionContext, payload: any) { const q=`%${payload.query||''}%`; const rows=await ctx.db.query('SELECT * FROM products WHERE storeId=? AND (name LIKE ? OR slug LIKE ?) LIMIT ?', [payload.storeId,q,q,payload.limit||20]); return { products: rows }; }
export async function adminFeaturedSet(ctx: ActionContext, payload: any) {
  await ctx.db.transaction(async (tx: EntityManager) => {
    await tx.getRepository(FeaturedItem).delete({ storeId: payload.storeId });
    for (let i = 0; i < payload.productIds.length; i += 1) {
      await tx.getRepository(FeaturedItem).save(tx.getRepository(FeaturedItem).create({ id: uuidv4(), storeId: payload.storeId, productId: payload.productIds[i], sortOrder: i }));
    }
  });
  return adminFeaturedList(ctx, { storeId: payload.storeId });
}

export async function adminProductsList(ctx: ActionContext, payload: any = {}) { const q = normalizeListQueryInput(payload, { defaultPageSize: 50, maxPageSize: 200 }); const storeId = resolveStoreScopedId(ctx.storeId, payload.storeId); return { products: await ctx.db.getRepository(Product).find({ where: { storeId }, order: { updatedAt: 'DESC' as any }, take: q.limit, skip: q.offset }) }; }
export async function adminProductsGet(ctx: ActionContext, payload: any) { return { product: await byIdOrThrow(ctx, Product, payload.id, 'Product not found') }; }
export async function adminProductsCreate(ctx: ActionContext, payload: any) { const id=uuidv4(); await ctx.db.transaction(async (tx: EntityManager)=>{ await tx.getRepository(Product).save(tx.getRepository(Product).create({ id, ...payload }));}); return adminProductsGet(ctx,{id}); }
export async function adminProductsUpdate(ctx: ActionContext, payload: any) { await ctx.db.transaction(async (tx: EntityManager)=>{ const r=await tx.getRepository(Product).update({id:payload.id},payload); if(!r.affected) throw new AppError('NOT_FOUND','Product not found');}); return adminProductsGet(ctx,{id:payload.id}); }
export async function adminProductsDisable(ctx: ActionContext, payload: any) { return adminProductsUpdate(ctx,{id:payload.id,status:'disabled'}); }

export async function adminProductImagesList(ctx: ActionContext, payload: any) { return { images: await ctx.db.getRepository(ProductImage).find({ where: { productId: payload.productId }, order: { sortOrder: 'ASC' as any } }) }; }
export async function adminProductImagesAdd(ctx: ActionContext, payload: any) { const id=uuidv4(); await ctx.db.transaction(async (tx: EntityManager)=>{ await tx.getRepository(ProductImage).save(tx.getRepository(ProductImage).create({ id, ...payload }));}); return adminProductImagesList(ctx,{productId:payload.productId}); }
export async function adminProductImagesRemove(ctx: ActionContext, payload: any) { await ctx.db.transaction(async (tx: EntityManager)=>{ await tx.getRepository(ProductImage).delete({id:payload.id});}); return { removed:true }; }
export async function adminProductImagesReorder(ctx: ActionContext, payload: any) { await ctx.db.transaction(async (tx: EntityManager)=>{ for (let i=0;i<payload.items.length;i+=1){ await tx.getRepository(ProductImage).update({id:payload.items[i]}, { sortOrder:i }); }}); return adminProductImagesList(ctx,{productId:payload.productId}); }

export async function adminProductSpecsList(ctx: ActionContext, payload: any) { return { specs: await ctx.db.getRepository(ProductSpec).find({ where: { productId: payload.productId }, order: { sortOrder: 'ASC' as any } }) }; }
export async function adminProductSpecsCreate(ctx: ActionContext, payload: any) { const id=uuidv4(); await ctx.db.transaction(async (tx: EntityManager)=>{ await tx.getRepository(ProductSpec).save(tx.getRepository(ProductSpec).create({ id, ...payload }));}); return adminProductSpecsList(ctx,{productId:payload.productId}); }
export async function adminProductSpecsUpdate(ctx: ActionContext, payload: any) { await ctx.db.transaction(async (tx: EntityManager)=>{ await tx.getRepository(ProductSpec).update({id:payload.id},payload);}); return adminProductSpecsList(ctx,{productId:payload.productId}); }
export async function adminProductSpecsDelete(ctx: ActionContext, payload: any) { await ctx.db.transaction(async (tx: EntityManager)=>{ await tx.getRepository(ProductSpec).delete({id:payload.id});}); return { deleted:true }; }

export async function adminProductVariantsList(ctx: ActionContext, payload: any) { return { variants: await ctx.db.getRepository(ProductVariant).find({ where: { productId: payload.productId }, order: { updatedAt: 'DESC' as any } }) }; }
export async function adminProductVariantsCreate(ctx: ActionContext, payload: any) { const id=uuidv4(); await ctx.db.transaction(async (tx: EntityManager)=>{ await tx.getRepository(ProductVariant).save(tx.getRepository(ProductVariant).create({ id, ...payload }));}); return adminProductVariantsList(ctx,{productId:payload.productId}); }
export async function adminProductVariantsUpdate(ctx: ActionContext, payload: any) { await ctx.db.transaction(async (tx: EntityManager)=>{ await tx.getRepository(ProductVariant).update({id:payload.id},payload);}); return adminProductVariantsList(ctx,{productId:payload.productId}); }
export async function adminProductVariantsDelete(ctx: ActionContext, payload: any) { await ctx.db.transaction(async (tx: EntityManager)=>{ await tx.getRepository(ProductVariant).delete({id:payload.id});}); return { deleted:true }; }
export async function adminProductVariantsBulkStockUpdate(ctx: ActionContext, payload: any) {
  await ctx.db.transaction(async (tx: EntityManager) => {
    for (const item of payload.items) await tx.getRepository(ProductVariant).update({ id: item.id }, { stockQty: item.stockQty });
  });
  return { updated: payload.items.length };
}

export async function adminInventoryAdjust(ctx: ActionContext, payload: any) {
  await ctx.db.transaction(async (tx: EntityManager) => {
    await tx.getRepository(ProductVariant).increment({ id: payload.variantId }, 'stockQty', payload.deltaQty);
    await tx.getRepository(InventoryAdjustment).save(tx.getRepository(InventoryAdjustment).create({ id: uuidv4(), variantId: payload.variantId, deltaQty: payload.deltaQty, reason: payload.reason ?? null, performedByUid: ctx.uid! }));
  });
  return { adjusted: true };
}
export async function adminInventoryHistory(ctx: ActionContext, payload: any) { return { rows: await ctx.db.getRepository(InventoryAdjustment).find({ where: { variantId: payload.variantId }, order: { createdAt: 'DESC' as any } }) }; }
export async function adminInventoryLowStockReport(ctx: ActionContext, payload: any) { const t=payload.threshold ?? 5; const rows=await ctx.db.query('SELECT * FROM product_variants pv JOIN products p ON p.id=pv.productId WHERE p.storeId=? AND pv.stockQty <= ? ORDER BY pv.stockQty ASC', [payload.storeId, t]); return { threshold:t, rows }; }

export async function adminHomeSectionsList(ctx: ActionContext, payload: any) { return { sections: await ctx.db.getRepository(HomeSection).find({ where: { storeId: payload.storeId }, order: { sortOrder: 'ASC' as any } }) }; }
export async function adminHomeSectionsGet(ctx: ActionContext, payload: any) { return { section: await byIdOrThrow(ctx, HomeSection, payload.id, 'Home section not found') }; }
export async function adminHomeSectionsCreate(ctx: ActionContext, payload: any) {
  const normalized = normalizeSectionForWrite(payload);
  const id=uuidv4();
  await ctx.db.transaction(async (tx: EntityManager)=>{
    await tx.getRepository(HomeSection).save(tx.getRepository(HomeSection).create({ id, ...payload, ...normalized }));
  });
  try {
    await publishHomeLayoutForStore(ctx, payload.storeId, 'live');
  } catch (error: any) {
    ctx.logger.error('home publish failed after section create', { storeId: payload.storeId, error: error?.message ?? String(error) });
  }
  return adminHomeSectionsGet(ctx,{id});
}
export async function adminHomeSectionsUpdate(ctx: ActionContext, payload: any) {
  const existing = await byIdOrThrow(ctx, HomeSection, payload.id, 'Home section not found');
  const next = {
    ...existing,
    ...payload,
    type: payload.type ?? existing.type,
    config: { ...(existing.config ?? {}), ...(payload.config ?? {}) },
  };
  const normalized = normalizeSectionForWrite(next);
  await ctx.db.transaction(async (tx: EntityManager)=>{
    await tx.getRepository(HomeSection).update({id:payload.id},{ ...payload, ...normalized });
  });
  try {
    await publishHomeLayoutForStore(ctx, existing.storeId, 'live');
  } catch (error: any) {
    ctx.logger.error('home publish failed after section update', { storeId: existing.storeId, error: error?.message ?? String(error) });
  }
  return adminHomeSectionsGet(ctx,{id:payload.id});
}
export async function adminHomeSectionsDisable(ctx: ActionContext, payload: any) { return adminHomeSectionsUpdate(ctx,{id:payload.id,enabled:false}); }
export async function adminHomeSectionsReorder(ctx: ActionContext, payload: any) {
  await ctx.db.transaction(async (tx: EntityManager)=>{ for (let i=0;i<payload.items.length;i+=1){ await tx.getRepository(HomeSection).update({id:payload.items[i]}, { sortOrder:i }); }});
  try {
    await publishHomeLayoutForStore(ctx, payload.storeId, 'live');
  } catch (error: any) {
    ctx.logger.error('home publish failed after section reorder', { storeId: payload.storeId, error: error?.message ?? String(error) });
  }
  return adminHomeSectionsList(ctx,{storeId:payload.storeId});
}

export async function adminSeoGet(ctx: ActionContext, payload: any) { const row=await ctx.db.getRepository(SeoSetting).findOneBy({ storeId: payload.storeId, pageType: payload.pageType, pageKey: payload.pageKey }); return { seo: row }; }
export async function adminSeoUpdate(ctx: ActionContext, payload: any) { await ctx.db.transaction(async (tx: EntityManager)=>{ await tx.getRepository(SeoSetting).upsert({ id: payload.id || uuidv4(), ...payload }, ['id']);}); return adminSeoGet(ctx,payload); }

export async function adminLandingPagesList(ctx: ActionContext, payload: any = {}) { const q = normalizeListQueryInput(payload, { defaultPageSize: 50, maxPageSize: 200 }); const storeId = resolveStoreScopedId(ctx.storeId, payload.storeId); return { pages: await ctx.db.getRepository(LandingPage).find({ where: { storeId }, order: { updatedAt: 'DESC' as any }, take: q.limit, skip: q.offset }) }; }
export async function adminLandingPagesGet(ctx: ActionContext, payload: any) { return { page: await byIdOrThrow(ctx, LandingPage, payload.id, 'Landing page not found') }; }
export async function adminLandingPagesCreate(ctx: ActionContext, payload: any) { const id=uuidv4(); await ctx.db.transaction(async (tx: EntityManager)=>{ await tx.getRepository(LandingPage).save(tx.getRepository(LandingPage).create({ id, ...payload, status: 'draft' }));}); return adminLandingPagesGet(ctx,{id}); }
export async function adminLandingPagesUpdate(ctx: ActionContext, payload: any) { await ctx.db.transaction(async (tx: EntityManager)=>{ await tx.getRepository(LandingPage).update({id:payload.id},payload);}); return adminLandingPagesGet(ctx,{id:payload.id}); }
export async function adminLandingPagesPublish(ctx: ActionContext, payload: any) { return adminLandingPagesUpdate(ctx,{id:payload.id,status:'published'}); }
export async function adminLandingPagesUnpublish(ctx: ActionContext, payload: any) { return adminLandingPagesUpdate(ctx,{id:payload.id,status:'draft'}); }
export async function adminLandingPagesDisable(ctx: ActionContext, payload: any) { return adminLandingPagesUpdate(ctx,{id:payload.id,status:'disabled'}); }

export async function adminSitemapRegenerate(ctx: ActionContext, payload: any) {
  const id = uuidv4();
  const countRows = await ctx.db.query('SELECT COUNT(*) as c FROM products WHERE storeId=? AND status=\'active\'', [payload.storeId]);
  const urlsCount = Number(countRows[0]?.c || 0);
  await ctx.db.transaction(async (tx: EntityManager) => {
    await tx.getRepository(SitemapRun).save(tx.getRepository(SitemapRun).create({ id, storeId: payload.storeId, status: 'completed', urlsCount }));
  });
  return { run: await ctx.db.getRepository(SitemapRun).findOneByOrFail({ id }) };
}
