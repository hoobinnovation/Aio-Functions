import { EntityManager } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { ActionContext } from '../../core/protocol';
import { Category } from '../../entities/Category';
import { Banner } from '../../entities/Banner';
import { FeaturedItem } from '../../entities/FeaturedItem';
import { Product } from '../../entities/Product';
import { ProductImage } from '../../entities/ProductImage';
import { ProductBaseMedia } from '../../entities/ProductBaseMedia';
import { StoreProductMediaOverride } from '../../entities/StoreProductMediaOverride';
import { ProductSpec } from '../../entities/ProductSpec';
import { ProductVariant } from '../../entities/ProductVariant';
import { InventoryAdjustment } from '../../entities/InventoryAdjustment';
import { StockMovement } from '../../entities/StockMovement';
import { HomeSection } from '../../entities/HomeSection';
import { SeoSetting } from '../../entities/SeoSetting';
import { LandingPage } from '../../entities/LandingPage';
import { AppError } from '../../core/errors';
import { normalizeListQueryInput, resolveStoreScopedId } from '../../utils/queryNormalization';
import { normalizeSectionForWrite, publishHomeLayoutForStore } from '../home/homeBuilder';
import { exportStoreSeoArtifacts } from './seoExportArtifacts';
import { recomputeStoreProductsMetrics } from '../productMetrics';
import {
  resolveEffectiveProductMedia,
  resolveProductCategoryIds,
  resolveStoreVisibleProducts,
} from '../catalogResolver';
import { ProductCategory } from '../../entities/ProductCategory';

const ADMIN_PRODUCT_QUERY_CONTRACT = {
  allowedSortFields: [
    'updatedAt',
    'createdAt',
    'name',
    'slug',
    'categoryId',
    'status',
    'ratingAverage',
    'popularityScore',
  ],
  sortAliases: {
    newest: { by: 'createdAt', direction: 'desc' as const },
    recentlyUpdated: { by: 'updatedAt', direction: 'desc' as const },
    topRated: { by: 'ratingAverage', direction: 'desc' as const },
    mostPopular: { by: 'popularityScore', direction: 'desc' as const },
  },
};

async function byIdOrThrow(ctx: ActionContext, repo: any, id: string, msg: string) {
  const row = await ctx.db.getRepository(repo).findOneBy({ id });
  if (!row) throw new AppError('NOT_FOUND', msg);
  return row;
}

export async function adminCategoriesList(ctx: ActionContext, payload: any = {}) {
  try {
    const q = normalizeListQueryInput(payload, {
      defaultPageSize: 50,
      maxPageSize: 200,
    });

    const storeId = resolveStoreScopedId(ctx.storeId, payload.storeId);
    const repo = ctx.db.getRepository(Category);

    const where = [
      { mode: 'global', storeId: null },
      { mode: 'store', storeId },
    ];

    const allowedSortFields = ['name', 'slug', 'status', 'sortOrder', 'createdAt', 'updatedAt'];
    const requestedSortBy =
        typeof q?.sort?.by === 'string' && allowedSortFields.includes(q.sort.by)
            ? q.sort.by
            : 'sortOrder';

    const requestedSortDir =
        q?.sort?.direction === 'asc' || q?.sort?.dir === 'asc' ? 'ASC' : 'DESC';

    const order: Record<string, 'ASC' | 'DESC'> = {
      [requestedSortBy]: requestedSortDir,
    };

    if (requestedSortBy !== 'sortOrder') {
      order.sortOrder = 'ASC';
    }

    if (requestedSortBy !== 'createdAt') {
      order.createdAt = 'DESC';
    }

    const [rows, total] = await repo.findAndCount({
      where,
      order: order as any,
      take: q.limit,
      skip: q.offset,
    });

    return {
      items: rows,
      pageInfo: {
        page: q.page,
        pageSize: q.limit,
        total,
      },
      grouped: [],
      aggregates: {},
      capabilities: {
        canEdit: true,
        canDelete: true,
      },
      availability: {},
    };
  } catch (error: any) {
    ctx.logger.error('adminCategoriesList failed', {
      message: error?.message ?? String(error),
      stack: error?.stack ?? null,
      payload,
      ctxStoreId: ctx.storeId ?? null,
    });
    throw error;
  }
}

export async function adminCategoriesGet(ctx: ActionContext, payload: any) {
  return {
    category: await byIdOrThrow(ctx, Category, payload.id, 'Category not found'),
  };
}

export async function adminCategoriesCreate(ctx: ActionContext, payload: any) {
  const id = uuidv4();

  await ctx.db.transaction(async (tx: EntityManager) => {
    const mode = payload.mode === 'global' ? 'global' : 'store';
    const storeId = mode === 'global' ? null : resolveStoreScopedId(ctx.storeId, payload.storeId);

    await tx.getRepository(Category).save(
        tx.getRepository(Category).create({
          id,
          ...payload,
          mode,
          storeId,
        })
    );
  });

  return {
    category: await ctx.db.getRepository(Category).findOneByOrFail({ id }),
  };
}

export async function adminCategoriesUpdate(ctx: ActionContext, payload: any) {
  await ctx.db.transaction(async (tx: EntityManager) => {
    const existing = await tx.getRepository(Category).findOneBy({ id: payload.id });
    if (!existing) {
      throw new AppError('NOT_FOUND', 'Category not found');
    }

    const nextMode =
        payload.mode === 'global'
            ? 'global'
            : payload.mode === 'store'
                ? 'store'
                : existing.mode;

    const nextStoreId =
        nextMode === 'global'
            ? null
            : resolveStoreScopedId(ctx.storeId, payload.storeId ?? existing.storeId);

    const patch = {
      ...payload,
      mode: nextMode,
      storeId: nextStoreId,
    };

    const result = await tx.getRepository(Category).update({ id: payload.id }, patch);
    if (!result.affected) {
      throw new AppError('NOT_FOUND', 'Category not found');
    }
  });

  return adminCategoriesGet(ctx, { id: payload.id });
}

export async function adminCategoriesDisable(ctx: ActionContext, payload: any) {
  return adminCategoriesUpdate(ctx, {
    id: payload.id,
    status: 'disabled',
  });
}

export async function adminBannersList(ctx: ActionContext, payload: any = {}) {
  const q = normalizeListQueryInput(payload, { defaultPageSize: 50, maxPageSize: 200 });
  const storeId = resolveStoreScopedId(ctx.storeId, payload.storeId);

  return {
    banners: await ctx.db.getRepository(Banner).find({
      where: { storeId },
      order: { sortOrder: 'ASC' as any },
      take: q.limit,
      skip: q.offset,
    }),
  };
}

export async function adminBannersGet(ctx: ActionContext, payload: any) {
  return { banner: await byIdOrThrow(ctx, Banner, payload.id, 'Banner not found') };
}

export async function adminBannersCreate(ctx: ActionContext, payload: any) {
  const id = uuidv4();

  await ctx.db.transaction(async (tx: EntityManager) => {
    const storeId = resolveStoreScopedId(ctx.storeId, payload.storeId);

    await tx.getRepository(Banner).save(
        tx.getRepository(Banner).create({
          id,
          ...payload,
          storeId,
        })
    );
  });

  return adminBannersGet(ctx, { id });
}

export async function adminBannersUpdate(ctx: ActionContext, payload: any) {
  await ctx.db.transaction(async (tx: EntityManager) => {
    const r = await tx.getRepository(Banner).update({ id: payload.id }, payload);
    if (!r.affected) throw new AppError('NOT_FOUND', 'Banner not found');
  });
  return adminBannersGet(ctx, { id: payload.id });
}

export async function adminBannersDisable(ctx: ActionContext, payload: any) {
  return adminBannersUpdate(ctx, { id: payload.id, status: 'disabled' });
}

export async function adminFeaturedList(ctx: ActionContext, payload: any) {
  const storeId = resolveStoreScopedId(ctx.storeId, payload.storeId);

  const items = await ctx.db.getRepository(FeaturedItem).find({
    where: { storeId },
    order: { sortOrder: 'ASC' as any },
  });

  const resolved = await resolveStoreVisibleProducts(ctx.db, storeId, {
    includeDisabled: false,
    sortBy: 'updatedAt',
    sortDirection: 'DESC',
    limit: 1000,
    offset: 0,
  });

  const visibleIds = new Set(resolved.rows.map((row) => row.id));
  return { items: items.filter((item: FeaturedItem) => visibleIds.has(item.productId)) };
}

export async function adminFeaturedSearchProducts(ctx: ActionContext, payload: any) {
  const storeId = resolveStoreScopedId(ctx.storeId, payload.storeId);
  const q = `%${payload.query || ''}%`;

  const rows = await ctx.db.query(
      `
        SELECT *
        FROM products
        WHERE
          ((mode='global' AND storeId IS NULL) OR (mode='store' AND storeId=?))
          AND
          (name LIKE ? OR slug LIKE ?)
          LIMIT ?
      `,
      [storeId, q, q, payload.limit || 20]
  );

  return { products: rows };
}

export async function adminFeaturedSet(ctx: ActionContext, payload: any) {
  const storeId = resolveStoreScopedId(ctx.storeId, payload.storeId);

  await ctx.db.transaction(async (tx: EntityManager) => {
    await tx.getRepository(FeaturedItem).delete({ storeId });

    for (let i = 0; i < payload.productIds.length; i += 1) {
      await tx.getRepository(FeaturedItem).save(
          tx.getRepository(FeaturedItem).create({
            id: uuidv4(),
            storeId,
            productId: payload.productIds[i],
            sortOrder: i,
          })
      );
    }
  });

  return adminFeaturedList(ctx, { storeId });
}

export async function adminProductsList(ctx: ActionContext, payload: any = {}) {
  const q = normalizeListQueryInput(payload, {
    defaultPageSize: 50,
    maxPageSize: 200,
    defaultSort: { by: 'updatedAt', dir: 'desc' },
    contract: ADMIN_PRODUCT_QUERY_CONTRACT,
  });

  const storeId = resolveStoreScopedId(ctx.storeId, payload.storeId);

  const resolved = await resolveStoreVisibleProducts(ctx.db, storeId, {
    includeDisabled: true,
    categoryId: typeof payload.categoryId === 'string' ? payload.categoryId : undefined,
    sortBy: q.sort.by,
    sortDirection: q.sort.direction === 'asc' ? 'ASC' : 'DESC',
    limit: q.limit,
    offset: q.offset,
  });

  const catMap = await resolveProductCategoryIds(
      ctx.db,
      resolved.rows.map((row) => row.id)
  );

  return {
    products: resolved.rows.map((row) => ({
      ...row,
      categoryIds: catMap.get(row.id) ?? (row.categoryId ? [row.categoryId] : []),
    })),
  };
}

export async function adminProductsGet(ctx: ActionContext, payload: any) {
  const product = await byIdOrThrow(ctx, Product, payload.id, 'Product not found');
  const categoryMap = await resolveProductCategoryIds(ctx.db, [product.id]);

  return {
    product: {
      ...product,
      categoryIds: categoryMap.get(product.id) ?? (product.categoryId ? [product.categoryId] : []),
    },
  };
}

export async function adminProductsCreate(ctx: ActionContext, payload: any) {
  const id = uuidv4();

  await ctx.db.transaction(async (tx: EntityManager) => {
    const mode = payload.mode === 'global' ? 'global' : 'store';
    const storeId = mode === 'global' ? null : resolveStoreScopedId(ctx.storeId, payload.storeId);
    const categoryId = payload.categoryId ?? null;

    await tx.getRepository(Product).save(
        tx.getRepository(Product).create({
          id,
          ...payload,
          mode,
          storeId,
          categoryId,
        })
    );

    if (categoryId) {
      await tx.getRepository(ProductCategory).insert({
        id: uuidv4(),
        productId: id,
        categoryId,
        isPrimary: true,
      });
    }
  });

  return adminProductsGet(ctx, { id });
}

export async function adminProductsUpdate(ctx: ActionContext, payload: any) {
  await ctx.db.transaction(async (tx: EntityManager) => {
    const existing = await tx.getRepository(Product).findOneBy({ id: payload.id });
    if (!existing) throw new AppError('NOT_FOUND', 'Product not found');

    const nextMode = payload.mode === undefined ? existing.mode : payload.mode;
    const nextStoreId =
        nextMode === 'global'
            ? null
            : resolveStoreScopedId(ctx.storeId, payload.storeId ?? existing.storeId);

    const patch: any = {
      ...payload,
      mode: nextMode,
      storeId: nextStoreId,
    };

    if (payload.categoryId !== undefined) {
      patch.categoryId = payload.categoryId ?? null;
    }

    const r = await tx.getRepository(Product).update({ id: payload.id }, patch);
    if (!r.affected) throw new AppError('NOT_FOUND', 'Product not found');

    if (payload.categoryIds && Array.isArray(payload.categoryIds)) {
      await tx.getRepository(ProductCategory).delete({ productId: payload.id });

      for (let i = 0; i < payload.categoryIds.length; i += 1) {
        const cid = payload.categoryIds[i];
        if (typeof cid === 'string' && cid) {
          await tx.getRepository(ProductCategory).insert({
            id: uuidv4(),
            productId: payload.id,
            categoryId: cid,
            isPrimary: i === 0,
          });
        }
      }

      if (payload.categoryIds.length) {
        await tx.getRepository(Product).update(
            { id: payload.id },
            { categoryId: payload.categoryIds[0] }
        );
      }
    } else if (payload.categoryId !== undefined) {
      await tx.getRepository(ProductCategory).delete({
        productId: payload.id,
        isPrimary: true,
      });

      if (payload.categoryId) {
        await tx.getRepository(ProductCategory).insert({
          id: uuidv4(),
          productId: payload.id,
          categoryId: payload.categoryId,
          isPrimary: true,
        });
      }
    }
  });

  return adminProductsGet(ctx, { id: payload.id });
}

export async function adminProductsDisable(ctx: ActionContext, payload: any) {
  return adminProductsUpdate(ctx, { id: payload.id, status: 'disabled' });
}

export async function adminCatalogRebuildProductMetrics(ctx: ActionContext, payload: any) {
  const storeId = resolveStoreScopedId(ctx.storeId, payload.storeId);
  return ctx.db.transaction(async (tx: EntityManager) => recomputeStoreProductsMetrics(tx, storeId));
}

export async function adminProductImagesList(ctx: ActionContext, payload: any) {
  const scope =
      payload.scope === 'storeOverride'
          ? 'storeOverride'
          : payload.scope === 'base'
              ? 'base'
              : 'legacy';

  if (scope === 'base') {
    return {
      images: await ctx.db.getRepository(ProductBaseMedia).find({
        where: { productId: payload.productId },
        order: { sortOrder: 'ASC' as any },
      }),
    };
  }

  if (scope === 'storeOverride') {
    const storeId = resolveStoreScopedId(ctx.storeId, payload.storeId);
    return {
      images: await ctx.db.getRepository(StoreProductMediaOverride).find({
        where: { storeId, productId: payload.productId },
        order: { sortOrder: 'ASC' as any },
      }),
    };
  }

  const mediaMap = await resolveEffectiveProductMedia(
      ctx.db,
      resolveStoreScopedId(ctx.storeId, payload.storeId),
      [payload.productId]
  );

  const legacy = await ctx.db.getRepository(ProductImage).find({
    where: { productId: payload.productId },
    order: { sortOrder: 'ASC' as any },
  });

  return {
    images: legacy,
    effectiveMediaAssetId: mediaMap.get(payload.productId) ?? null,
  };
}

export async function adminProductImagesAdd(ctx: ActionContext, payload: any) {
  const id = uuidv4();

  await ctx.db.transaction(async (tx: EntityManager) => {
    const scope =
        payload.scope === 'storeOverride'
            ? 'storeOverride'
            : payload.scope === 'base'
                ? 'base'
                : 'legacy';

    if (scope === 'base') {
      await tx.getRepository(ProductBaseMedia).save(
          tx.getRepository(ProductBaseMedia).create({
            id,
            productId: payload.productId,
            mediaAssetId: payload.mediaAssetId,
            sortOrder: payload.sortOrder ?? 0,
          })
      );
    } else if (scope === 'storeOverride') {
      const storeId = resolveStoreScopedId(ctx.storeId, payload.storeId);
      await tx.getRepository(StoreProductMediaOverride).save(
          tx.getRepository(StoreProductMediaOverride).create({
            id,
            storeId,
            productId: payload.productId,
            mediaAssetId: payload.mediaAssetId,
            sortOrder: payload.sortOrder ?? 0,
          })
      );
    } else {
      await tx.getRepository(ProductImage).save(
          tx.getRepository(ProductImage).create({
            id,
            ...payload,
          })
      );
    }
  });

  return adminProductImagesList(ctx, {
    productId: payload.productId,
    scope: payload.scope,
    storeId: payload.storeId,
  });
}

export async function adminProductImagesRemove(ctx: ActionContext, payload: any) {
  await ctx.db.transaction(async (tx: EntityManager) => {
    const scope =
        payload.scope === 'storeOverride'
            ? 'storeOverride'
            : payload.scope === 'base'
                ? 'base'
                : 'legacy';

    if (scope === 'base') {
      await tx.getRepository(ProductBaseMedia).delete({ id: payload.id });
    } else if (scope === 'storeOverride') {
      await tx.getRepository(StoreProductMediaOverride).delete({ id: payload.id });
    } else {
      await tx.getRepository(ProductImage).delete({ id: payload.id });
    }
  });

  return { removed: true };
}

export async function adminProductImagesReorder(ctx: ActionContext, payload: any) {
  await ctx.db.transaction(async (tx: EntityManager) => {
    const scope =
        payload.scope === 'storeOverride'
            ? 'storeOverride'
            : payload.scope === 'base'
                ? 'base'
                : 'legacy';

    for (let i = 0; i < payload.items.length; i += 1) {
      const id = payload.items[i];

      if (scope === 'base') {
        await tx.getRepository(ProductBaseMedia).update({ id }, { sortOrder: i });
      } else if (scope === 'storeOverride') {
        await tx.getRepository(StoreProductMediaOverride).update({ id }, { sortOrder: i });
      } else {
        await tx.getRepository(ProductImage).update({ id }, { sortOrder: i });
      }
    }
  });

  return adminProductImagesList(ctx, {
    productId: payload.productId,
    scope: payload.scope,
    storeId: payload.storeId,
  });
}

export async function adminProductSpecsList(ctx: ActionContext, payload: any) {
  return {
    specs: await ctx.db.getRepository(ProductSpec).find({
      where: { productId: payload.productId },
      order: { sortOrder: 'ASC' as any },
    }),
  };
}

export async function adminProductSpecsCreate(ctx: ActionContext, payload: any) {
  const id = uuidv4();

  await ctx.db.transaction(async (tx: EntityManager) => {
    await tx.getRepository(ProductSpec).save(
        tx.getRepository(ProductSpec).create({
          id,
          ...payload,
        })
    );
  });

  return adminProductSpecsList(ctx, { productId: payload.productId });
}

export async function adminProductSpecsUpdate(ctx: ActionContext, payload: any) {
  await ctx.db.transaction(async (tx: EntityManager) => {
    await tx.getRepository(ProductSpec).update({ id: payload.id }, payload);
  });

  return adminProductSpecsList(ctx, { productId: payload.productId });
}

export async function adminProductSpecsDelete(ctx: ActionContext, payload: any) {
  await ctx.db.transaction(async (tx: EntityManager) => {
    await tx.getRepository(ProductSpec).delete({ id: payload.id });
  });

  return { deleted: true };
}

export async function adminProductVariantsList(ctx: ActionContext, payload: any) {
  return {
    variants: await ctx.db.getRepository(ProductVariant).find({
      where: { productId: payload.productId },
      order: { updatedAt: 'DESC' as any },
    }),
  };
}

export async function adminProductVariantsCreate(ctx: ActionContext, payload: any) {
  const id = uuidv4();

  await ctx.db.transaction(async (tx: EntityManager) => {
    await tx.getRepository(ProductVariant).save(
        tx.getRepository(ProductVariant).create({
          id,
          ...payload,
        })
    );
  });

  return adminProductVariantsList(ctx, { productId: payload.productId });
}

export async function adminProductVariantsUpdate(ctx: ActionContext, payload: any) {
  await ctx.db.transaction(async (tx: EntityManager) => {
    await tx.getRepository(ProductVariant).update({ id: payload.id }, payload);
  });

  return adminProductVariantsList(ctx, { productId: payload.productId });
}

export async function adminProductVariantsDelete(ctx: ActionContext, payload: any) {
  await ctx.db.transaction(async (tx: EntityManager) => {
    await tx.getRepository(ProductVariant).delete({ id: payload.id });
  });

  return { deleted: true };
}

export async function adminProductVariantsBulkStockUpdate(ctx: ActionContext, payload: any) {
  await ctx.db.transaction(async (tx: EntityManager) => {
    for (const item of payload.items) {
      await tx.getRepository(ProductVariant).update(
          { id: item.id },
          { stockQty: item.stockQty }
      );
    }
  });

  return { updated: payload.items.length };
}

export async function adminInventoryAdjust(ctx: ActionContext, payload: any) {
  await ctx.db.transaction(async (tx: EntityManager) => {
    const variant = await tx.getRepository(ProductVariant).findOneBy({ id: payload.variantId });
    if (!variant) throw new AppError('NOT_FOUND', 'Variant not found');

    const beforeQty = Number(variant.stockQty);
    const deltaQty = Number(payload.deltaQty);
    const afterQty = beforeQty + deltaQty;

    await tx.getRepository(ProductVariant).update(
        { id: payload.variantId },
        { stockQty: Math.round(afterQty) }
    );

    const adjustmentId = uuidv4();

    await tx.getRepository(InventoryAdjustment).save(
        tx.getRepository(InventoryAdjustment).create({
          id: adjustmentId,
          variantId: payload.variantId,
          deltaQty: payload.deltaQty,
          beforeQty: beforeQty.toFixed(3),
          afterQty: afterQty.toFixed(3),
          reason: payload.reason ?? null,
          performedByUid: ctx.uid!,
        })
    );

    await tx.getRepository(StockMovement).save(
        tx.getRepository(StockMovement).create({
          id: uuidv4(),
          storeId: payload.storeId ?? ctx.storeId,
          variantId: payload.variantId,
          warehouseId: payload.warehouseId ?? null,
          warehouseLocationId: payload.warehouseLocationId ?? null,
          lotId: null,
          movementType: 'adjustment',
          qtyDelta: deltaQty.toFixed(3),
          beforeQty: beforeQty.toFixed(3),
          afterQty: afterQty.toFixed(3),
          unitCostCents: null,
          sourceDocumentType: 'inventory_adjustment',
          sourceDocumentId: adjustmentId,
          sourceEventType: 'admin_adjustment',
          metadata: { reason: payload.reason ?? null },
          createdByUid: ctx.uid ?? null,
        })
    );
  });

  return { adjusted: true };
}

export async function adminInventoryHistory(ctx: ActionContext, payload: any) {
  return {
    rows: await ctx.db.getRepository(InventoryAdjustment).find({
      where: { variantId: payload.variantId },
      order: { createdAt: 'DESC' as any },
    }),
  };
}

export async function adminInventoryLowStockReport(ctx: ActionContext, payload: any) {
  const threshold = payload.threshold ?? 5;
  const storeId = resolveStoreScopedId(ctx.storeId, payload.storeId);

  const rows = await ctx.db.query(
      `
        SELECT *
        FROM product_variants pv
               JOIN products p ON p.id = pv.productId
        WHERE
          ((p.mode='global' AND p.storeId IS NULL) OR (p.mode='store' AND p.storeId=?))
          AND pv.stockQty <= ?
        ORDER BY pv.stockQty ASC
      `,
      [storeId, threshold]
  );

  return { threshold, rows };
}

export async function adminHomeSectionsList(ctx: ActionContext, payload: any) {
  const storeId = resolveStoreScopedId(ctx.storeId, payload.storeId);

  return {
    sections: await ctx.db.getRepository(HomeSection).find({
      where: { storeId },
      order: { sortOrder: 'ASC' as any },
    }),
  };
}

export async function adminHomeSectionsGet(ctx: ActionContext, payload: any) {
  return { section: await byIdOrThrow(ctx, HomeSection, payload.id, 'Home section not found') };
}

export async function adminHomeSectionsCreate(ctx: ActionContext, payload: any) {
  const normalized = normalizeSectionForWrite(payload);
  const id = uuidv4();
  const storeId = resolveStoreScopedId(ctx.storeId, payload.storeId);

  await ctx.db.transaction(async (tx: EntityManager) => {
    await tx.getRepository(HomeSection).save(
        tx.getRepository(HomeSection).create({
          id,
          ...payload,
          storeId,
          ...normalized,
        })
    );
  });

  try {
    await publishHomeLayoutForStore(ctx, storeId, 'live');
  } catch (error: any) {
    ctx.logger.error('home publish failed after section create', {
      storeId,
      error: error?.message ?? String(error),
    });
  }

  return adminHomeSectionsGet(ctx, { id });
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

  await ctx.db.transaction(async (tx: EntityManager) => {
    await tx.getRepository(HomeSection).update(
        { id: payload.id },
        { ...payload, ...normalized }
    );
  });

  try {
    await publishHomeLayoutForStore(ctx, existing.storeId, 'live');
  } catch (error: any) {
    ctx.logger.error('home publish failed after section update', {
      storeId: existing.storeId,
      error: error?.message ?? String(error),
    });
  }

  return adminHomeSectionsGet(ctx, { id: payload.id });
}

export async function adminHomeSectionsDisable(ctx: ActionContext, payload: any) {
  return adminHomeSectionsUpdate(ctx, { id: payload.id, enabled: false });
}

export async function adminHomeSectionsReorder(ctx: ActionContext, payload: any) {
  const storeId = resolveStoreScopedId(ctx.storeId, payload.storeId);

  await ctx.db.transaction(async (tx: EntityManager) => {
    for (let i = 0; i < payload.items.length; i += 1) {
      await tx.getRepository(HomeSection).update(
          { id: payload.items[i] },
          { sortOrder: i }
      );
    }
  });

  try {
    await publishHomeLayoutForStore(ctx, storeId, 'live');
  } catch (error: any) {
    ctx.logger.error('home publish failed after section reorder', {
      storeId,
      error: error?.message ?? String(error),
    });
  }

  return adminHomeSectionsList(ctx, { storeId });
}

export async function adminSeoGet(ctx: ActionContext, payload: any) {
  const storeId = resolveStoreScopedId(ctx.storeId, payload.storeId);

  const row = await ctx.db.getRepository(SeoSetting).findOneBy({
    storeId,
    pageType: payload.pageType,
    pageKey: payload.pageKey,
  });

  return { seo: row };
}

export async function adminSeoUpdate(ctx: ActionContext, payload: any) {
  const storeId = resolveStoreScopedId(ctx.storeId, payload.storeId);

  await ctx.db.transaction(async (tx: EntityManager) => {
    await tx.getRepository(SeoSetting).upsert(
        {
          id: payload.id || uuidv4(),
          ...payload,
          storeId,
        },
        ['id']
    );
  });

  return adminSeoGet(ctx, { ...payload, storeId });
}

export async function adminLandingPagesList(ctx: ActionContext, payload: any = {}) {
  const q = normalizeListQueryInput(payload, { defaultPageSize: 50, maxPageSize: 200 });
  const storeId = resolveStoreScopedId(ctx.storeId, payload.storeId);

  return {
    pages: await ctx.db.getRepository(LandingPage).find({
      where: { storeId },
      order: { updatedAt: 'DESC' as any },
      take: q.limit,
      skip: q.offset,
    }),
  };
}

export async function adminLandingPagesGet(ctx: ActionContext, payload: any) {
  return { page: await byIdOrThrow(ctx, LandingPage, payload.id, 'Landing page not found') };
}

export async function adminLandingPagesCreate(ctx: ActionContext, payload: any) {
  const id = uuidv4();
  const storeId = resolveStoreScopedId(ctx.storeId, payload.storeId);

  await ctx.db.transaction(async (tx: EntityManager) => {
    await tx.getRepository(LandingPage).save(
        tx.getRepository(LandingPage).create({
          id,
          ...payload,
          storeId,
          status: 'draft',
        })
    );
  });

  return adminLandingPagesGet(ctx, { id });
}

export async function adminLandingPagesUpdate(ctx: ActionContext, payload: any) {
  await ctx.db.transaction(async (tx: EntityManager) => {
    await tx.getRepository(LandingPage).update({ id: payload.id }, payload);
  });

  return adminLandingPagesGet(ctx, { id: payload.id });
}

export async function adminLandingPagesPublish(ctx: ActionContext, payload: any) {
  return adminLandingPagesUpdate(ctx, { id: payload.id, status: 'published' });
}

export async function adminLandingPagesUnpublish(ctx: ActionContext, payload: any) {
  return adminLandingPagesUpdate(ctx, { id: payload.id, status: 'draft' });
}

export async function adminLandingPagesDisable(ctx: ActionContext, payload: any) {
  return adminLandingPagesUpdate(ctx, { id: payload.id, status: 'disabled' });
}

export async function adminSitemapRegenerate(ctx: ActionContext, payload: any) {
  return exportStoreSeoArtifacts(ctx, payload);
}