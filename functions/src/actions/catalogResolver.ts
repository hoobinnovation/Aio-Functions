import { DataSource } from 'typeorm';
import { resolveMediaPublicUrl } from '../utils/mediaPublicUrl';
import { normalizeProductText } from '../core/productMatching';

export interface CatalogResolvedVariantOption {
    label: string;
    value: string;
}

export interface CatalogResolvedVariant {
    id: string;
    sku: string;
    priceCents: number;
    price: number;
    globalPriceCents: number;
    globalPrice: number;
    stockQty: number;
    status: string;
    attributes: any;
    displayName: string;
    options: CatalogResolvedVariantOption[];
}

export interface CatalogResolvedProduct {
    id: string;
    mode: string;
    storeId: string | null;
    categoryId: string | null;
    name: string;
    globalName: string;
    alias: string | null;
    slug: string;
    description: string | null;
    status: string;
    ratingAverage: string;
    ratingAvg: number;
    ratingCount: number;
    favoriteCount: number;
    completedOrderQty: number;
    popularityScore: number;
    createdAt: Date;
    updatedAt: Date;
    category: null | {
        id: string;
        name: string;
        slug: string;
    };
    specs: Array<{
        specKey: string;
        specValue: string;
        sortOrder: number;
    }>;
    variants: CatalogResolvedVariant[];
    defaultVariantId: string | null;
    priceCents: number;
    price: number;
    compareAtPrice: number | null;
    currency: string;
    stockQty: number;
    isOnSale: boolean;
    discountPercent: number;
    imageUrl: string;
    thumbnailUrl: string;
    imageDownloadUrl: string;
    thumbnailDownloadUrl: string;
    image: string;
    images: string[];
    originalPath: string | null;
    thumbnailPath: string | null;
    brand: string | null;
    brandName: string | null;
}

function safeParseJson(value: any) {
    if (typeof value !== 'string') return null;
    const text = value.trim();
    if (!text || !text.startsWith('{')) return null;
    try {
        return JSON.parse(text);
    } catch {
        return null;
    }
}

function centsToMoney(value: any): number {
    const cents = Number(value || 0);
    if (!Number.isFinite(cents)) return 0;
    return Number((cents / 100).toFixed(2));
}

function uniqueStrings(values: Array<string | null | undefined>): string[] {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const value of values) {
        const text = String(value || '').trim();
        if (text && !seen.has(text)) {
            seen.add(text);
            out.push(text);
        }
    }
    return out;
}

function normalizeMediaPath(value: any): string {
    return String(value || '').trim();
}

function buildVariantOptions(attributes: any): CatalogResolvedVariantOption[] {
    const options: CatalogResolvedVariantOption[] = [];
    const shape = String(attributes?.productShapeTypeNameAr || attributes?.productShapeTypeName || '').trim();
    const count = attributes?.count != null && attributes?.count !== '' ? String(attributes.count).trim() : '';

    if (shape) options.push({ label: 'الشكل', value: shape });
    if (count) options.push({ label: 'العدد', value: count });

    return options;
}

function buildVariantDisplayName(productName: string, attributes: any): string {
    const parts = [
        productName,
        attributes?.productShapeTypeNameAr || attributes?.productShapeTypeName || '',
        attributes?.count != null && attributes?.count !== '' ? String(attributes.count) : '',
    ].filter(Boolean);

    return parts.join(' - ').slice(0, 180);
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

export async function hydrateCatalogProducts(db: DataSource, baseRows: any[], options: { storeId?: string | null } = {}): Promise<CatalogResolvedProduct[]> {
    if (!Array.isArray(baseRows) || !baseRows.length) return [];

    const productIds = uniqueStrings(baseRows.map((row) => row.id));
    const categoryIds = uniqueStrings(baseRows.map((row) => row.categoryResolvedId || row.categoryId));
    const storeId = String(options.storeId || '').trim();

    const variants = productIds.length
        ? await db.query(
            `SELECT *
             FROM product_variants
             WHERE status='active' AND productId IN (${productIds.map(() => '?').join(',')})
             ORDER BY productId ASC, createdAt ASC, updatedAt ASC`,
            productIds,
        )
        : [];

    const aliasRows = storeId && productIds.length
        ? await db.query(
            `SELECT productId, alias
             FROM product_aliases
             WHERE storeId=? AND productId IN (${productIds.map(() => '?').join(',')})`,
            [storeId, ...productIds],
        )
        : [];

    const priceOverrideRows = storeId && variants.length
        ? await db.query(
            `SELECT variantId, priceCents
             FROM store_variant_price_overrides
             WHERE storeId=? AND variantId IN (${variants.map(() => '?').join(',')})`,
            [storeId, ...variants.map((variant: any) => variant.id)],
        )
        : [];

    const productImages = productIds.length
        ? await db.query(
            `SELECT 
    pi.productId, pi.sortOrder, ma.originalPath, ma.thumbnailPath
             FROM product_images pi
                      INNER JOIN media_assets ma ON ma.id = pi.mediaAssetId
             WHERE pi.productId IN (${productIds.map(() => '?').join(',')})
             ORDER BY pi.productId ASC, pi.sortOrder ASC, pi.createdAt ASC`,
            productIds,
        )
        : [];

    const specs = productIds.length
        ? await db.query(
            `SELECT productId, specKey, specValue, sortOrder
             FROM product_specs
             WHERE productId IN (${productIds.map(() => '?').join(',')})
             ORDER BY productId ASC, sortOrder ASC, createdAt ASC`,
            productIds,
        )
        : [];

    const categories = categoryIds.length
        ? await db.query(
            `SELECT id, name, slug
             FROM categories
             WHERE id IN (${categoryIds.map(() => '?').join(',')})`,
            categoryIds,
        )
        : [];

    const variantsByProductId = new Map<string, any[]>();
    for (const row of variants) {
        const list = variantsByProductId.get(row.productId) || [];
        list.push(row);
        variantsByProductId.set(row.productId, list);
    }

    const imagesByProductId = new Map<string, {
        originalPath: string;
        thumbnailPath: string;
        imageUrl: string;
        thumbnailUrl: string;
        imageDownloadUrl: string;
        thumbnailDownloadUrl: string;
        images: string[];
    }>();
    for (const row of productImages) {
        const thumbnailPath = normalizeMediaPath(row.thumbnailPath);
        const originalPath = normalizeMediaPath(row.originalPath);
        const thumbnailDownloadUrl = resolveMediaPublicUrl(thumbnailPath) || '';
        const imageDownloadUrl = resolveMediaPublicUrl(originalPath) || thumbnailDownloadUrl || '';
        const thumbnailUrl = thumbnailPath || thumbnailDownloadUrl || '';
        const imageUrl = originalPath || imageDownloadUrl || thumbnailUrl || '';
        const existing = imagesByProductId.get(row.productId) || {
            originalPath: '',
            thumbnailPath: '',
            imageUrl: '',
            thumbnailUrl: '',
            imageDownloadUrl: '',
            thumbnailDownloadUrl: '',
            images: [],
        };

        if (!existing.thumbnailPath && thumbnailPath) existing.thumbnailPath = thumbnailPath;
        if (!existing.originalPath && originalPath) existing.originalPath = originalPath;
        if (!existing.thumbnailUrl && thumbnailUrl) existing.thumbnailUrl = thumbnailUrl;
        if (!existing.imageUrl && imageUrl) existing.imageUrl = imageUrl;
        if (!existing.thumbnailDownloadUrl && thumbnailDownloadUrl) existing.thumbnailDownloadUrl = thumbnailDownloadUrl;
        if (!existing.imageDownloadUrl && imageDownloadUrl) existing.imageDownloadUrl = imageDownloadUrl;

        if (thumbnailPath) existing.images.push(thumbnailPath);
        if (originalPath) existing.images.push(originalPath);
        if (!thumbnailPath && thumbnailDownloadUrl) existing.images.push(thumbnailDownloadUrl);
        if (!originalPath && imageDownloadUrl) existing.images.push(imageDownloadUrl);

        imagesByProductId.set(row.productId, existing);
    }

    const specsByProductId = new Map<string, Array<{ specKey: string; specValue: string; sortOrder: number }>>();
    for (const row of specs) {
        const list = specsByProductId.get(row.productId) || [];
        list.push({
            specKey: row.specKey,
            specValue: row.specValue,
            sortOrder: Number(row.sortOrder || 0),
        });
        specsByProductId.set(row.productId, list);
    }

    const categoryById = new Map<string, { id: string; name: string; slug: string }>();
    for (const row of categories) {
        categoryById.set(row.id, {
            id: row.id,
            name: row.name,
            slug: row.slug,
        });
    }

    const aliasByProductId = new Map<string, string>();
    for (const row of aliasRows) {
        aliasByProductId.set(String(row.productId), String(row.alias || '').trim());
    }

    const priceOverrideByVariantId = new Map<string, number>();
    for (const row of priceOverrideRows) {
        const priceCents = Number(row.priceCents || 0);
        if (Number.isFinite(priceCents)) {
            priceOverrideByVariantId.set(String(row.variantId), priceCents);
        }
    }

    return baseRows.map((row) => {
        const metadata = safeParseJson(row.description) || {};
        const alias = aliasByProductId.get(String(row.id)) || null;
        const effectiveName = alias || row.name;
        const rowVariants = (variantsByProductId.get(row.id) || []).map((variant: any) => {
            const attributes = variant.attributes || {};
            const globalPriceCents = Number(variant.priceCents || 0);
            const priceCents = Number(priceOverrideByVariantId.get(String(variant.id)) ?? globalPriceCents);

            return {
                id: variant.id,
                sku: variant.sku,
                priceCents,
                price: centsToMoney(priceCents),
                globalPriceCents,
                globalPrice: centsToMoney(globalPriceCents),
                stockQty: Number(variant.stockQty || 0),
                status: variant.status,
                attributes,
                displayName: buildVariantDisplayName(effectiveName, attributes),
                options: buildVariantOptions(attributes),
            };
        });

        const defaultVariant = rowVariants[0] || null;
        const imageMeta = imagesByProductId.get(row.id) || {
            originalPath: '',
            thumbnailPath: '',
            imageUrl: '',
            thumbnailUrl: '',
            imageDownloadUrl: '',
            thumbnailDownloadUrl: '',
            images: [],
        };
        const specsList = specsByProductId.get(row.id) || [];
        const categoryId = row.categoryResolvedId || row.categoryId || null;
        const category = categoryId ? categoryById.get(categoryId) || null : null;
        const uniqueImages = uniqueStrings(imageMeta.images);

        const parsedDescription =
            typeof metadata?.descriptionText === 'string'
                ? metadata.descriptionText
                : (typeof row.description === 'string' && !row.description.trim().startsWith('{') ? row.description : '');

        const brandKeyFromSpecs = specsList.find((item) => item.specKey === 'brand_keys')?.specValue || null;
        const brandKey = metadata?.brandKey || brandKeyFromSpecs || null;
        const compareAtPriceCents = Number(defaultVariant?.attributes?.compareAtPriceCents ?? NaN);
        const compareAtPrice = Number.isFinite(compareAtPriceCents) && compareAtPriceCents > Number(defaultVariant?.priceCents || 0)
            ? centsToMoney(compareAtPriceCents)
            : null;
        const discountPercent = compareAtPriceCents > Number(defaultVariant?.priceCents || 0)
            ? Math.max(0, Math.round(((compareAtPriceCents - Number(defaultVariant?.priceCents || 0)) * 100) / compareAtPriceCents))
            : 0;

        return {
            id: row.id,
            mode: row.mode,
            storeId: row.storeId ?? null,
            categoryId,
            name: effectiveName,
            globalName: row.name,
            alias,
            slug: row.slug,
            description: parsedDescription || '',
            status: row.status,
            ratingAverage: row.ratingAverage,
            ratingAvg: Number(row.ratingAverage || 0),
            ratingCount: Number(row.ratingCount || 0),
            favoriteCount: Number(row.favoriteCount || 0),
            completedOrderQty: Number(row.completedOrderQty || 0),
            popularityScore: Number(row.popularityScore || 0),
            createdAt: row.createdAt,
            updatedAt: row.updatedAt,

            category: category ? { ...category } : null,
            specs: specsList,
            variants: rowVariants,
            defaultVariantId: defaultVariant?.id || null,

            priceCents: defaultVariant?.priceCents || 0,
            price: defaultVariant?.price || 0,
            compareAtPrice,
            currency: 'EGP',
            stockQty: defaultVariant?.stockQty || 0,
            isOnSale: discountPercent > 0,
            discountPercent,

            imageUrl: imageMeta.imageUrl || imageMeta.thumbnailUrl || '',
            thumbnailUrl: imageMeta.thumbnailUrl || imageMeta.imageUrl || '',
            imageDownloadUrl: imageMeta.imageDownloadUrl || imageMeta.thumbnailDownloadUrl || '',
            thumbnailDownloadUrl: imageMeta.thumbnailDownloadUrl || imageMeta.imageDownloadUrl || '',
            image: imageMeta.thumbnailUrl || imageMeta.imageUrl || '',
            images: uniqueImages,
            originalPath: imageMeta.originalPath || null,
            thumbnailPath: imageMeta.thumbnailPath || null,

            brand: brandKey,
            brandName: brandKey,
        } satisfies CatalogResolvedProduct;
    });
}

export async function resolveStoreVisibleProducts(
    db: DataSource,
    storeId: string,
    options: {
        includeDisabled?: boolean;
        categoryId?: string;
        searchTerm?: string;
        minPrice?: number;
        maxPrice?: number;
        onSale?: boolean;
        inStock?: boolean;
        sortBy: string;
        sortDirection: 'ASC' | 'DESC';
        limit: number;
        offset: number;
    }
): Promise<{ rows: CatalogResolvedProduct[]; total: number }> {
    const params: any[] = [storeId];
    const whereParts = ["((p.mode='global' AND p.storeId IS NULL) OR (p.mode='store' AND p.storeId=?))"];
    const normalizedSearchTerm = options.searchTerm ? normalizeProductText(options.searchTerm) : '';
    const sortBy =
        options.sortBy === 'price'
            ? 'sortPriceCents'
            : options.sortBy === 'discountPercent'
                ? 'sortDiscountPercent'
                : options.sortBy;

    if (!options.includeDisabled) whereParts.push("p.status='active'");

    if (options.categoryId) {
        whereParts.push('(p.categoryId=? OR EXISTS (SELECT 1 FROM product_categories pc WHERE pc.productId=p.id AND pc.categoryId=?))');
        params.push(options.categoryId, options.categoryId);
    }

    if (options.searchTerm) {
        whereParts.push(`(
            p.name LIKE ?
            OR p.slug LIKE ?
            OR EXISTS (
                SELECT 1
                FROM product_aliases pa
                WHERE pa.storeId=?
                  AND pa.productId=p.id
                  AND (pa.alias LIKE ? OR pa.normalizedAlias LIKE ?)
            )
        )`);
        const q = `%${options.searchTerm}%`;
        const normalizedQuery = `%${normalizedSearchTerm}%`;
        params.push(q, q, storeId, q, normalizedQuery);
    }

    if (Number.isFinite(options.minPrice)) {
        whereParts.push(`EXISTS (
            SELECT 1 FROM product_variants pv
            LEFT JOIN store_variant_price_overrides sp ON sp.storeId=? AND sp.variantId=pv.id
            WHERE pv.productId = p.id
              AND pv.status='active'
              AND CAST(COALESCE(sp.priceCents, pv.priceCents) AS SIGNED) >= ?
        )`);
        params.push(storeId, Math.round(Number(options.minPrice) * 100));
    }

    if (Number.isFinite(options.maxPrice)) {
        whereParts.push(`EXISTS (
            SELECT 1 FROM product_variants pv
            LEFT JOIN store_variant_price_overrides sp ON sp.storeId=? AND sp.variantId=pv.id
            WHERE pv.productId = p.id
              AND pv.status='active'
              AND CAST(COALESCE(sp.priceCents, pv.priceCents) AS SIGNED) <= ?
        )`);
        params.push(storeId, Math.round(Number(options.maxPrice) * 100));
    }

    if (options.inStock === true) {
        whereParts.push(`EXISTS (
            SELECT 1 FROM product_variants pv
            WHERE pv.productId = p.id
              AND pv.status='active'
              AND pv.stockQty > 0
        )`);
    }

    if (options.onSale === true) {
        whereParts.push(`EXISTS (
            SELECT 1 FROM product_variants pv
            LEFT JOIN store_variant_price_overrides sp ON sp.storeId=? AND sp.variantId=pv.id
            WHERE pv.productId = p.id
              AND pv.status='active'
              AND CAST(JSON_UNQUOTE(JSON_EXTRACT(pv.attributes, '$.compareAtPriceCents')) AS SIGNED) > CAST(COALESCE(sp.priceCents, pv.priceCents) AS SIGNED)
        )`);
        params.push(storeId);
    }

    const whereSql = whereParts.join(' AND ');

    const totalRows = await db.query(`SELECT COUNT(*) total FROM products p WHERE ${whereSql}`, params);
    const total = Number(totalRows[0]?.total ?? 0);

    const listParams = [storeId, storeId, ...params, options.limit, options.offset];
    const rows = await db.query(
        `SELECT p.*,
                COALESCE(primary_cat.categoryId, fallback_cat.categoryId, p.categoryId) categoryResolvedId,
                COALESCE(price_meta.sortPriceCents, 0) sortPriceCents,
                COALESCE(discount_meta.sortDiscountPercent, 0) sortDiscountPercent
         FROM products p
                  LEFT JOIN (
             SELECT pv.productId, MIN(CAST(COALESCE(sp.priceCents, pv.priceCents) AS SIGNED)) sortPriceCents
             FROM product_variants pv
             LEFT JOIN store_variant_price_overrides sp ON sp.storeId=? AND sp.variantId=pv.id
             WHERE pv.status='active'
             GROUP BY pv.productId
         ) price_meta ON price_meta.productId=p.id
                  LEFT JOIN (
             SELECT pv.productId,
                    MAX(
                        CASE
                            WHEN CAST(JSON_UNQUOTE(JSON_EXTRACT(pv.attributes, '$.compareAtPriceCents')) AS SIGNED) > CAST(COALESCE(sp.priceCents, pv.priceCents) AS SIGNED)
                            THEN ROUND(
                                (
                                    CAST(JSON_UNQUOTE(JSON_EXTRACT(pv.attributes, '$.compareAtPriceCents')) AS SIGNED) - CAST(COALESCE(sp.priceCents, pv.priceCents) AS SIGNED)
                                ) * 100 / CAST(JSON_UNQUOTE(JSON_EXTRACT(pv.attributes, '$.compareAtPriceCents')) AS SIGNED)
                            )
                            ELSE 0
                        END
                    ) sortDiscountPercent
             FROM product_variants pv
             LEFT JOIN store_variant_price_overrides sp ON sp.storeId=? AND sp.variantId=pv.id
             WHERE pv.status='active'
             GROUP BY pv.productId
         ) discount_meta ON discount_meta.productId=p.id
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
        ORDER BY ${sortBy === 'sortPriceCents' || sortBy === 'sortDiscountPercent' ? sortBy : `p.${sortBy}`} ${options.sortDirection}
     LIMIT ? OFFSET ?`,
        listParams,
    );

    const normalizedRows = await hydrateCatalogProducts(db, rows, { storeId });
    return { rows: normalizedRows, total };
}

export async function resolveStoreVisibleProductById(
    db: DataSource,
    storeId: string,
    productId: string,
    includeDisabled = false,
): Promise<CatalogResolvedProduct | null> {
    const statusSql = includeDisabled ? '' : " AND p.status='active'";
    const rows = await db.query(
        `SELECT p.*,
                COALESCE(primary_cat.categoryId, fallback_cat.categoryId, p.categoryId) categoryResolvedId
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
         WHERE ((p.mode='global' AND p.storeId IS NULL) OR (p.mode='store' AND p.storeId=?))
           AND p.id=?${statusSql}
         ORDER BY CASE WHEN p.mode='store' THEN 0 ELSE 1 END
         LIMIT 1`,
        [storeId, productId],
    );
    const [product] = await hydrateCatalogProducts(db, rows, { storeId });
    return product || null;
}

export async function resolveStoreVisibleProductBySlug(
    db: DataSource,
    storeId: string,
    slug: string,
    includeDisabled = false,
): Promise<CatalogResolvedProduct | null> {
    const statusSql = includeDisabled ? '' : " AND p.status='active'";
    const rows = await db.query(
        `SELECT p.*,
                COALESCE(primary_cat.categoryId, fallback_cat.categoryId, p.categoryId) categoryResolvedId
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
         WHERE ((p.mode='global' AND p.storeId IS NULL) OR (p.mode='store' AND p.storeId=?))
           AND p.slug=?${statusSql}
         ORDER BY CASE WHEN p.mode='store' THEN 0 ELSE 1 END
         LIMIT 1`,
        [storeId, slug],
    );
    const [product] = await hydrateCatalogProducts(db, rows, { storeId });
    return product || null;
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
