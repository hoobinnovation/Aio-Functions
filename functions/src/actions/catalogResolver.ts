import { DataSource } from 'typeorm';

export interface CatalogResolvedProduct {
  id: string;
  mode: string;
  storeId: string | null;
  categoryId: string | null;
  name: string;
  slug: string;
  description: string | null;
  status: string;
  ratingAverage: string;
  ratingCount: number;
  favoriteCount: number;
  completedOrderQty: number;
  popularityScore: number;
  createdAt: Date;
  updatedAt: Date;
}

export async function resolveStoreVisibleCategories(db: DataSource, storeId: string, includeDisabled = false) {
  const statusFilter = includeDisabled ? '' : " AND c.status='active'";
  return db.query(
    `SELECT c.* FROM categories c
     WHERE (c.mode='global' AND c.storeId IS NULL) OR (c.mode='store' AND c.storeId=?)${statusFilter}
     ORDER BY c.sortOrder ASC`,
    [storeId],
  );
}

export async function resolveStoreVisibleProducts(
  db: DataSource,
  storeId: string,
  options: { includeDisabled?: boolean; categoryId?: string; sortBy: string; sortDirection: 'ASC' | 'DESC'; limit: number; offset: number }
): Promise<{ rows: CatalogResolvedProduct[]; total: number }> {
  const params: any[] = [storeId];
  const whereParts = ["((p.mode='global' AND p.storeId IS NULL) OR (p.mode='store' AND p.storeId=?))"];
  if (!options.includeDisabled) whereParts.push("p.status='active'");
  if (options.categoryId) {
    whereParts.push('(p.categoryId=? OR EXISTS (SELECT 1 FROM product_categories pc WHERE pc.productId=p.id AND pc.categoryId=?))');
    params.push(options.categoryId, options.categoryId);
  }

  const whereSql = whereParts.join(' AND ');

  const totalRows = await db.query(`SELECT COUNT(*) total FROM products p WHERE ${whereSql}`, params);
  const total = Number(totalRows[0]?.total ?? 0);

  const listParams = [...params, options.limit, options.offset];
  const rows = await db.query(
    `SELECT p.*, COALESCE(primary_cat.categoryId, fallback_cat.categoryId, p.categoryId) categoryResolvedId
     FROM products p
     LEFT JOIN (
       SELECT pc.productId, pc.categoryId
       FROM product_categories pc
       INNER JOIN (
         SELECT productId, MIN(createdAt) createdAt
         FROM product_categories
         WHERE isPrimary=1
         GROUP BY productId
       ) pmin ON pmin.productId=pc.productId AND pmin.createdAt=pc.createdAt
       WHERE pc.isPrimary=1
     ) primary_cat ON primary_cat.productId=p.id
     LEFT JOIN (
       SELECT pc.productId, pc.categoryId
       FROM product_categories pc
       INNER JOIN (
         SELECT productId, MIN(createdAt) createdAt
         FROM product_categories
         GROUP BY productId
       ) amin ON amin.productId=pc.productId AND amin.createdAt=pc.createdAt
     ) fallback_cat ON fallback_cat.productId=p.id
     WHERE ${whereSql}
     ORDER BY p.${options.sortBy} ${options.sortDirection}
     LIMIT ? OFFSET ?`,
    listParams,
  );

  const normalizedRows = rows.map((row: any) => ({ ...row, categoryId: row.categoryResolvedId ?? row.categoryId }));

  return { rows: normalizedRows, total };
}

export async function resolvePrimaryCategoryIds(db: DataSource, productIds: string[]): Promise<Map<string, string | null>> {
  const out = new Map<string, string | null>();
  if (!productIds.length) return out;
  const placeholders = productIds.map(() => '?').join(',');
  const rows = await db.query(
    `SELECT p.id productId,
            COALESCE(primary_pc.categoryId, fallback_pc.categoryId, p.categoryId) primaryCategoryId
     FROM products p
     LEFT JOIN (
       SELECT pc.productId, pc.categoryId
       FROM product_categories pc
       INNER JOIN (
         SELECT productId, MIN(createdAt) createdAt
         FROM product_categories
         WHERE isPrimary=1
         GROUP BY productId
       ) first_primary ON first_primary.productId=pc.productId AND first_primary.createdAt=pc.createdAt
       WHERE pc.isPrimary=1
     ) primary_pc ON primary_pc.productId=p.id
     LEFT JOIN (
       SELECT pc.productId, pc.categoryId
       FROM product_categories pc
       INNER JOIN (
         SELECT productId, MIN(createdAt) createdAt
         FROM product_categories
         GROUP BY productId
       ) first_any ON first_any.productId=pc.productId AND first_any.createdAt=pc.createdAt
     ) fallback_pc ON fallback_pc.productId=p.id
     WHERE p.id IN (${placeholders})`,
    productIds,
  );

  for (const row of rows) out.set(row.productId, row.primaryCategoryId ?? null);
  return out;
}

export async function resolveEffectiveProductMedia(db: DataSource, storeId: string, productIds: string[]) {
  if (!productIds.length) return new Map<string, string>();

  const placeholders = productIds.map(() => '?').join(',');
  const storeRows = await db.query(
    `SELECT productId, mediaAssetId FROM store_product_media_overrides
     WHERE storeId=? AND productId IN (${placeholders})
     ORDER BY sortOrder ASC`,
    [storeId, ...productIds],
  );

  const baseRows = await db.query(
    `SELECT productId, mediaAssetId FROM product_base_media
     WHERE productId IN (${placeholders})
     ORDER BY sortOrder ASC`,
    productIds,
  );

  const legacyRows = await db.query(
    `SELECT productId, mediaAssetId FROM product_images
     WHERE productId IN (${placeholders})
     ORDER BY sortOrder ASC`,
    productIds,
  );

  const out = new Map<string, string>();
  for (const row of storeRows) if (!out.has(row.productId)) out.set(row.productId, row.mediaAssetId);
  for (const row of baseRows) if (!out.has(row.productId)) out.set(row.productId, row.mediaAssetId);
  for (const row of legacyRows) if (!out.has(row.productId)) out.set(row.productId, row.mediaAssetId);

  return out;
}

export async function resolveProductCategoryIds(db: DataSource, productIds: string[]): Promise<Map<string, string[]>> {
  const out = new Map<string, string[]>();
  if (!productIds.length) return out;
  const placeholders = productIds.map(() => '?').join(',');
  const rows = await db.query(
    `SELECT productId, categoryId FROM product_categories WHERE productId IN (${placeholders}) ORDER BY isPrimary DESC, createdAt ASC`,
    productIds,
  );
  for (const row of rows) {
    const current = out.get(row.productId) ?? [];
    if (!current.includes(row.categoryId)) current.push(row.categoryId);
    out.set(row.productId, current);
  }
  return out;
}
