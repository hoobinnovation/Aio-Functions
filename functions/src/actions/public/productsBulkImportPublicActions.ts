import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { EntityManager } from 'typeorm';
import { ActionContext } from '../../core/protocol';
import { AppError } from '../../core/errors';
import { Store } from '../../entities/Store';
import { Category } from '../../entities/Category';
import { Product } from '../../entities/Product';
import { ProductVariant } from '../../entities/ProductVariant';
import { ProductSpec } from '../../entities/ProductSpec';
import { ProductImportReference } from '../../entities/ProductImportReference';
import { ProductImage } from '../../entities/ProductImage';
import { ProductCategory } from '../../entities/ProductCategory';
import { ProductBaseMedia } from '../../entities/ProductBaseMedia';
import { StoreProductMediaOverride } from '../../entities/StoreProductMediaOverride';
import { MediaAsset } from '../../entities/MediaAsset';
import { getBucketName, getStorage } from '../../utils/storage';

const SOURCE_TYPE = 'jsonBulkImport';
const fetchAny: any = (globalThis as any).fetch;

type NormalizedRow = {
    sourceRow: Record<string, any>;
    sourceKey: string;
    sourceRowId: string | null;
    variantKey: string;
    nameAr: string | null;
    nameEn: string | null;
    finalName: string;
    slugAr: string | null;
    slugEn: string | null;
    finalSlugBase: string;
    priceCents: number;
    searchable: boolean;
    mainImageUrl: string | null;
    stockQty: number;
    count: number | null;
    productShapeTypeId: string | null;
    productShapeTypeName: string | null;
    productShapeTypeNameAr: string | null;
    productShapeIconUrl: string | null;
    currencyEn: string | null;
    currencyAr: string | null;
    categoryUrlEn: string | null;
    categoryUrlAr: string | null;
    sourceCategoryName: string | null;
    brandKey: string | null;
    stockLevelId: string | null;
    maxAvailableQuantity: number | null;
    subCategoryKeys: string[];
    headCategoryKeys: string[];
    activeIngredientNames: string[];
};

type ProductSpecInput = {
    specKey: string;
    specValue: string;
    sortOrder: number;
};

function normalizeText(value: unknown): string | null {
    if (value == null) return null;
    const str = String(value).replace(/\s+/g, ' ').trim();
    return str ? str : null;
}

function normalizeNameForCompare(value: string): string {
    return value.replace(/\s+/g, ' ').trim().toLowerCase();
}

function normalizeBoolean(value: unknown): boolean {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') return value !== 0;
    const str = String(value ?? '').trim().toLowerCase();
    return ['1', 'true', 'yes', 'y'].includes(str);
}

function toSlug(input: string): string {
    return input
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '-')
        .replace(/[^\u0600-\u06FFa-z0-9-]/g, '')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 180);
}

function parsePriceCents(value: unknown): number | null {
    if (value == null || value === '') return null;
    const n = Number(String(value).replace(/,/g, '').trim());
    if (!Number.isFinite(n) || n <= 0) return null;
    return Math.round(n * 100);
}

function parseNonNegativeInt(value: unknown, fallback = 0): number {
    if (value == null || value === '') return fallback;
    const n = Number(String(value).trim());
    if (!Number.isFinite(n) || n < 0) return fallback;
    return Math.round(n);
}

function parseNullableNonNegativeInt(value: unknown): number | null {
    if (value == null || value === '') return null;
    const n = Number(String(value).trim());
    if (!Number.isFinite(n) || n < 0) return null;
    return Math.round(n);
}

function sanitizeRow(row: Record<string, any>): Record<string, any> {
    const out: Record<string, any> = {};
    for (const [k, v] of Object.entries(row)) {
        out[k] = typeof v === 'string' ? normalizeText(v) : v;
    }
    return out;
}

function hashPayload(payload: unknown): string {
    return crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex');
}

function buildVariantKey(sourceKey: string, sourceRowId: string | null, row: Record<string, any>, priceCents: number): string {
    if (sourceRowId) return sourceRowId.slice(0, 120);

    const shape = normalizeText(row.productShapeTypeName) ?? normalizeText(row.productShapeTypeNameAr) ?? 'variant';
    const count = parseNullableNonNegativeInt(row.count);
    const raw = `${sourceKey}|${shape}|${count ?? ''}|${priceCents}|${normalizeText(row.productUrlEn) ?? normalizeText(row.productUrlAr) ?? ''}`;
    return crypto.createHash('sha1').update(raw).digest('hex').slice(0, 40);
}

function extractSubCategoryKeys(value: unknown): string[] {
    if (!Array.isArray(value)) return [];
    return value
        .map((item) => normalizeText(item?.subCategoryKey))
        .filter((v): v is string => Boolean(v));
}

function extractHeadCategoryKeys(value: unknown): string[] {
    if (!Array.isArray(value)) return [];
    return value
        .map((item) => normalizeText(item))
        .filter((v): v is string => Boolean(v));
}

function extractActiveIngredientNames(value: unknown): string[] {
    if (!Array.isArray(value)) return [];
    const seen = new Set<string>();
    const out: string[] = [];
    for (const item of value) {
        const name = normalizeText(item?.name);
        if (name && !seen.has(name)) {
            seen.add(name);
            out.push(name);
        }
    }
    return out;
}

function uniqueStrings(values: Array<string | null | undefined>): string[] {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const value of values) {
        const normalized = normalizeText(value);
        if (normalized && !seen.has(normalized)) {
            seen.add(normalized);
            out.push(normalized);
        }
    }
    return out;
}

function joinSpecValue(values: string[]): string | null {
    if (!values.length) return null;
    return values.join(' | ').slice(0, 300);
}

function buildVariantDisplayName(row: NormalizedRow): string {
    const parts = [
        row.finalName,
        row.productShapeTypeNameAr ?? row.productShapeTypeName,
        row.count ? `${row.count}` : null,
    ].filter(Boolean);
    return parts.join(' - ').slice(0, 180);
}

async function ensureCategoryHierarchy(
    tx: EntityManager,
    storeId: string | null,
    mode: 'global' | 'store',
    parentCategoryNameRaw: string,
    categoryNameRaw: string,
): Promise<{ parentCategory: Category; childCategory: Category }> {
    const parentCategoryName = normalizeText(parentCategoryNameRaw);
    const categoryName = normalizeText(categoryNameRaw);
    if (!parentCategoryName) throw new AppError('VALIDATION_FAILED', 'parentCategoryName is required');
    if (!categoryName) throw new AppError('VALIDATION_FAILED', 'categoryName is required');

    const categories = await tx.getRepository(Category).find({ where: { storeId, mode } as any });
    const parentNorm = normalizeNameForCompare(parentCategoryName);
    let parentCategory = categories.find((c: Category) => c.parentId == null && normalizeNameForCompare(c.name) === parentNorm);

    if (!parentCategory) {
        const parentSlugBase = toSlug(parentCategoryName) || `category-${uuidv4().slice(0, 6)}`;
        parentCategory = tx.getRepository(Category).create({
            id: uuidv4(),
            mode,
            storeId,
            name: parentCategoryName,
            slug: `${parentSlugBase}-${uuidv4().slice(0, 6)}`,
            parentId: null,
            sortOrder: 0,
            status: 'active',
        });
        await tx.getRepository(Category).save(parentCategory);
    }

    const childNorm = normalizeNameForCompare(categoryName);
    let childCategory = categories.find((c: Category) => c.parentId === parentCategory!.id && normalizeNameForCompare(c.name) === childNorm);

    if (!childCategory) {
        const childSlugBase = toSlug(categoryName) || `category-${uuidv4().slice(0, 6)}`;
        childCategory = tx.getRepository(Category).create({
            id: uuidv4(),
            mode,
            storeId,
            name: categoryName,
            slug: `${childSlugBase}-${uuidv4().slice(0, 6)}`,
            parentId: parentCategory.id,
            sortOrder: 0,
            status: 'active',
        });
        await tx.getRepository(Category).save(childCategory);
    }

    return { parentCategory, childCategory };
}

function normalizeRow(row: unknown): { value: NormalizedRow | null; error: string | null } {
    if (!row || typeof row !== 'object' || Array.isArray(row)) {
        return { value: null, error: 'row is not a valid object' };
    }

    const sourceRow = sanitizeRow(row as Record<string, any>);
    const sourceKey = normalizeText(sourceRow.productKey);
    if (!sourceKey) return { value: null, error: 'productKey is required' };

    const nameAr = normalizeText(sourceRow.productNameAr);
    const nameEn = normalizeText(sourceRow.productNameEn);
    const finalName = nameAr ?? nameEn ?? '';
    if (!finalName) return { value: null, error: 'productNameAr or productNameEn is required' };

    const priceCents = parsePriceCents(sourceRow.newPrice);
    if (!priceCents || priceCents <= 0) return { value: null, error: 'newPrice must be a positive number' };

    const slugAr = normalizeText(sourceRow.productUrlAr);
    const slugEn = normalizeText(sourceRow.productUrlEn);
    const finalSlugBase = toSlug(slugAr ?? slugEn ?? finalName);
    if (!finalSlugBase) return { value: null, error: 'could not build slug' };

    const sourceRowId = normalizeText(sourceRow.id);
    const imageUrl = normalizeText(sourceRow.mainImageUrl);
    const variantKey = buildVariantKey(sourceKey, sourceRowId, sourceRow, priceCents);

    return {
        value: {
            sourceRow,
            sourceKey,
            sourceRowId,
            variantKey,
            nameAr,
            nameEn,
            finalName,
            slugAr,
            slugEn,
            finalSlugBase,
            priceCents,
            searchable: normalizeBoolean(sourceRow.searchable),
            mainImageUrl: imageUrl,
            stockQty: parseNonNegativeInt(sourceRow.stockQuantity, 0),
            count: parseNullableNonNegativeInt(sourceRow.count),
            productShapeTypeId: normalizeText(sourceRow.productShapeTypeId),
            productShapeTypeName: normalizeText(sourceRow.productShapeTypeName),
            productShapeTypeNameAr: normalizeText(sourceRow.productShapeTypeNameAr),
            productShapeIconUrl: normalizeText(sourceRow.productShapeIconUrl),
            currencyEn: normalizeText(sourceRow.currencyEn),
            currencyAr: normalizeText(sourceRow.currencyAr),
            categoryUrlEn: normalizeText(sourceRow.categoryUrlEn),
            categoryUrlAr: normalizeText(sourceRow.categoryUrlAr),
            sourceCategoryName: normalizeText(sourceRow.category),
            brandKey: normalizeText(sourceRow.brandKey),
            stockLevelId: normalizeText(sourceRow.stockLevelId),
            maxAvailableQuantity: parseNullableNonNegativeInt(sourceRow.maxAvailableQuantity),
            subCategoryKeys: extractSubCategoryKeys(sourceRow.productSubCategories),
            headCategoryKeys: extractHeadCategoryKeys(sourceRow.headCategoryKeys),
            activeIngredientNames: extractActiveIngredientNames(sourceRow.activeIngrediant),
        },
        error: null,
    };
}

async function buildUniqueProductSlugByScope(
    tx: EntityManager,
    mode: 'global' | 'store',
    storeId: string | null,
    base: string,
    productId: string
): Promise<string> {
    const candidate = `${base}-${productId.slice(0, 6)}`.slice(0, 200);
    const existing = await tx.getRepository(Product).findOneBy({ mode, storeId, slug: candidate } as any);
    if (!existing || existing.id === productId) return candidate;
    return `${base}-${productId.slice(0, 10)}`.slice(0, 200);
}

function isValidImageUrl(url: string | null): boolean {
    if (!url) return false;
    try {
        return /^https?:\/\//i.test(url);
    } catch {
        return false;
    }
}

function guessImageExt(contentType: string | null, url: string): string {
    if (contentType) {
        if (contentType.includes('png')) return 'png';
        if (contentType.includes('webp')) return 'webp';
        if (contentType.includes('jpeg') || contentType.includes('jpg')) return 'jpg';
    }
    const lower = url.toLowerCase();
    if (lower.includes('.png')) return 'png';
    if (lower.includes('.webp')) return 'webp';
    return 'jpg';
}

async function refreshProductImage(
    tx: EntityManager,
    ctx: ActionContext,
    storeId: string,
    productId: string,
    imageUrl: string,
    mediaScope: 'base' | 'storeOverride',
): Promise<{ uploaded: boolean; warning?: string }> {
    if (!isValidImageUrl(imageUrl)) {
        return { uploaded: false, warning: 'invalid image URL' };
    }

    const bucketName = getBucketName();
    if (!bucketName) {
        return { uploaded: false, warning: 'storage bucket is not configured' };
    }

    try {
        if (!fetchAny) return { uploaded: false, warning: 'fetch runtime is unavailable' };
        const response = await fetchAny(imageUrl);
        if (!response.ok) return { uploaded: false, warning: `image download failed (${response.status})` };

        const contentType = normalizeText(response.headers.get('content-type'));
        if (!contentType || !contentType.startsWith('image/')) {
            return { uploaded: false, warning: 'image content-type is not image/*' };
        }

        const bytes = Buffer.from(await response.arrayBuffer());
        if (!bytes.length) return { uploaded: false, warning: 'empty image payload' };

        const ext = guessImageExt(contentType, imageUrl);
        const assetId = uuidv4();
        const path = `stores/${storeId}/products/${productId}/${assetId}.${ext}`;

        await getStorage().bucket(bucketName).file(path).save(bytes, { contentType });

        const media = tx.getRepository(MediaAsset).create({
            id: assetId,
            storeId,
            ownerType: 'product',
            ownerId: productId,
            kind: 'image',
            originalPath: path,
            thumbnailPath: null,
            contentType,
            sizeBytes: String(bytes.length),
            status: 'processing',
            createdByUid: ctx.uid ?? 'system:bulk-import',
        });
        await tx.getRepository(MediaAsset).save(media);

        const productImageRepo = tx.getRepository(ProductImage);
        const baseMediaRepo = tx.getRepository(ProductBaseMedia);
        const storeOverrideRepo = tx.getRepository(StoreProductMediaOverride);
        const existing = await productImageRepo.find({ where: { productId }, order: { sortOrder: 'ASC' as any } });

        if (existing.length) {
            await productImageRepo.update({ id: existing[0].id }, { mediaAssetId: assetId, sortOrder: 0 });
            for (let i = 1; i < existing.length; i += 1) {
                await productImageRepo.update({ id: existing[i].id }, { sortOrder: i });
            }
        } else {
            await productImageRepo.save(productImageRepo.create({ id: uuidv4(), productId, mediaAssetId: assetId, sortOrder: 0 }));
        }

        if (mediaScope === 'base') {
            const existingBase = await baseMediaRepo.find({ where: { productId }, order: { sortOrder: 'ASC' as any } });
            if (existingBase.length) {
                await baseMediaRepo.update({ id: existingBase[0].id }, { mediaAssetId: assetId, sortOrder: 0 });
            } else {
                await baseMediaRepo.insert({ id: uuidv4(), productId, mediaAssetId: assetId, sortOrder: 0 });
            }
        } else {
            const existingOverride = await storeOverrideRepo.find({ where: { storeId, productId }, order: { sortOrder: 'ASC' as any } });
            if (existingOverride.length) {
                await storeOverrideRepo.update({ id: existingOverride[0].id }, { mediaAssetId: assetId, sortOrder: 0 });
            } else {
                await storeOverrideRepo.insert({ id: uuidv4(), storeId, productId, mediaAssetId: assetId, sortOrder: 0 });
            }
        }

        return { uploaded: true };
    } catch (error: any) {
        return { uploaded: false, warning: `image pipeline failed: ${error?.message ?? String(error)}` };
    }
}

function buildVariantAttributes(row: NormalizedRow) {
    return {
        sourceType: SOURCE_TYPE,
        sourceKey: row.sourceKey,
        sourceRowId: row.sourceRowId,
        displayName: buildVariantDisplayName(row),
        nameAr: row.nameAr,
        nameEn: row.nameEn,
        count: row.count,
        searchable: row.searchable,
        currencyEn: row.currencyEn,
        currencyAr: row.currencyAr,
        productShapeTypeId: row.productShapeTypeId,
        productShapeTypeName: row.productShapeTypeName,
        productShapeTypeNameAr: row.productShapeTypeNameAr,
        productShapeIconUrl: row.productShapeIconUrl,
        sourceCategoryName: row.sourceCategoryName,
        categoryUrlEn: row.categoryUrlEn,
        categoryUrlAr: row.categoryUrlAr,
        brandKey: row.brandKey,
        stockLevelId: row.stockLevelId,
        maxAvailableQuantity: row.maxAvailableQuantity,
        subCategoryKeys: row.subCategoryKeys,
        headCategoryKeys: row.headCategoryKeys,
        activeIngredientNames: row.activeIngredientNames,
        mainImageUrl: row.mainImageUrl,
    };
}

function buildProductSpecs(rows: NormalizedRow[]): ProductSpecInput[] {
    const primaryRow = rows[0];
    const shapeNames = uniqueStrings(rows.flatMap((row) => [row.productShapeTypeNameAr, row.productShapeTypeName]));
    const brandKeys = uniqueStrings(rows.map((row) => row.brandKey));
    const subCategoryKeys = uniqueStrings(rows.flatMap((row) => row.subCategoryKeys));
    const headCategoryKeys = uniqueStrings(rows.flatMap((row) => row.headCategoryKeys));
    const activeIngredients = uniqueStrings(rows.flatMap((row) => row.activeIngredientNames));
    const categoryNames = uniqueStrings(rows.map((row) => row.sourceCategoryName));
    const categoryUrlsAr = uniqueStrings(rows.map((row) => row.categoryUrlAr));
    const categoryUrlsEn = uniqueStrings(rows.map((row) => row.categoryUrlEn));
    const stockLevels = uniqueStrings(rows.map((row) => row.stockLevelId));

    const specs: Array<ProductSpecInput | null> = [
        primaryRow.nameAr ? { specKey: 'import_name_ar', specValue: primaryRow.nameAr.slice(0, 300), sortOrder: 10 } : null,
        primaryRow.nameEn ? { specKey: 'import_name_en', specValue: primaryRow.nameEn.slice(0, 300), sortOrder: 20 } : null,
        joinSpecValue(categoryNames) ? { specKey: 'source_category', specValue: joinSpecValue(categoryNames)!, sortOrder: 30 } : null,
        joinSpecValue(categoryUrlsAr) ? { specKey: 'source_category_url_ar', specValue: joinSpecValue(categoryUrlsAr)!, sortOrder: 40 } : null,
        joinSpecValue(categoryUrlsEn) ? { specKey: 'source_category_url_en', specValue: joinSpecValue(categoryUrlsEn)!, sortOrder: 50 } : null,
        joinSpecValue(shapeNames) ? { specKey: 'shape_types', specValue: joinSpecValue(shapeNames)!, sortOrder: 60 } : null,
        joinSpecValue(brandKeys) ? { specKey: 'brand_keys', specValue: joinSpecValue(brandKeys)!, sortOrder: 70 } : null,
        joinSpecValue(subCategoryKeys) ? { specKey: 'sub_category_keys', specValue: joinSpecValue(subCategoryKeys)!, sortOrder: 80 } : null,
        joinSpecValue(headCategoryKeys) ? { specKey: 'head_category_keys', specValue: joinSpecValue(headCategoryKeys)!, sortOrder: 90 } : null,
        joinSpecValue(activeIngredients) ? { specKey: 'active_ingredients', specValue: joinSpecValue(activeIngredients)!, sortOrder: 100 } : null,
        joinSpecValue(stockLevels) ? { specKey: 'stock_levels', specValue: joinSpecValue(stockLevels)!, sortOrder: 110 } : null,
        { specKey: 'variants_count', specValue: String(rows.length).slice(0, 300), sortOrder: 120 },
    ];

    return specs.filter((item): item is ProductSpecInput => Boolean(item));
}

async function syncProductSpecs(tx: EntityManager, productId: string, specs: ProductSpecInput[]): Promise<void> {
    const repo = tx.getRepository(ProductSpec);
    const existing = await repo.find({ where: { productId } as any });
    //@ts-ignore
    const existingByKey = new Map(existing.map((item) => [item.specKey, item]));
    const desiredKeys = new Set(specs.map((item) => item.specKey));

    for (const spec of specs) {
        const current = existingByKey.get(spec.specKey);
        if (!current) {
            await repo.insert({
                id: uuidv4(),
                productId,
                specKey: spec.specKey,
                specValue: spec.specValue,
                sortOrder: spec.sortOrder,
            });
            continue;
        }
        //@ts-ignore
        if (current.specValue !== spec.specValue || current.sortOrder !== spec.sortOrder) {
            await repo.update(
                //@ts-ignore
                { id: current.id },
                {
                    specValue: spec.specValue,
                    sortOrder: spec.sortOrder,
                }
            );
        }
    }

    for (const current of existing) {
        if (!desiredKeys.has(current.specKey)) {
            await repo.delete({ id: current.id });
        }
    }
}

export async function publicProductsBulkImportFromJson(ctx: ActionContext, payload: any) {
    const normalizedStoreIdRaw = normalizeText(payload?.storeId);
    const storeId = normalizedStoreIdRaw && /^\d+$/.test(normalizedStoreIdRaw) ? String(Number(normalizedStoreIdRaw)) : normalizedStoreIdRaw;
    const productMode = payload?.productMode === 'global' ? 'global' : 'store';
    const categoryMode = payload?.categoryMode === 'global' ? 'global' : 'store';
    const importStoreId = productMode === 'global' ? null : storeId;
    const categoryStoreId = categoryMode === 'global' ? null : storeId;
    const referenceStoreId = storeId ?? 'global';

    if ((productMode === 'store' || categoryMode === 'store') && !storeId) {
        throw new AppError('VALIDATION_FAILED', 'storeId is required for store-scoped imports');
    }

    const mediaScope = payload?.mediaScope === 'storeOverride' ? 'storeOverride' : 'base';
    if (mediaScope === 'storeOverride' && !storeId) {
        throw new AppError('VALIDATION_FAILED', 'storeId is required for store media overrides');
    }

    const parentCategoryName = normalizeText(payload?.parentCategoryName);
    const categoryName = normalizeText(payload?.categoryName);

    if (!parentCategoryName) throw new AppError('VALIDATION_FAILED', 'parentCategoryName is required');
    if (!categoryName) throw new AppError('VALIDATION_FAILED', 'categoryName is required');
    if (!Array.isArray(payload?.data) || payload.data.length === 0) {
        throw new AppError('VALIDATION_FAILED', 'data must be a non-empty array');
    }

    if (storeId) {
        const store = await ctx.db.getRepository(Store).findOneBy({ id: storeId });
        if (!store) throw new AppError('NOT_FOUND', 'Store not found');
    }

    const report = {
        storeId,
        parentCategoryId: null as string | null,
        categoryId: null as string | null,
        totalRowsReceived: payload.data.length,
        totalRowsNormalized: 0,
        totalProductsGrouped: 0,
        invalidRowsSkipped: 0,
        duplicateRowsCollapsed: 0,
        duplicateVariantsCollapsed: 0,
        productsCreated: 0,
        productsUpdated: 0,
        variantsCreated: 0,
        variantsUpdated: 0,
        variantsDeactivated: 0,
        specsSynced: 0,
        referencesCreated: 0,
        referencesUpdated: 0,
        imagesAttempted: 0,
        imagesUploaded: 0,
        imageFailures: 0,
        warnings: [] as string[],
        errors: [] as Array<{ sourceKey?: string | null; variantKey?: string | null; message: string }>,
    };

    const normalizedRows: NormalizedRow[] = [];
    for (const row of payload.data) {
        const normalized = normalizeRow(row);
        if (!normalized.value) {
            report.invalidRowsSkipped += 1;
            report.errors.push({ sourceKey: null, variantKey: null, message: normalized.error ?? 'invalid row' });
            continue;
        }
        normalizedRows.push(normalized.value);
    }

    report.totalRowsNormalized = normalizedRows.length;

    const grouped = new Map<string, NormalizedRow[]>();
    for (const row of normalizedRows) {
        const list = grouped.get(row.sourceKey) ?? [];
        list.push(row);
        grouped.set(row.sourceKey, list);
    }
    report.totalProductsGrouped = grouped.size;

    await ctx.db.transaction(async (tx: EntityManager) => {
        const { parentCategory, childCategory } = await ensureCategoryHierarchy(tx, categoryStoreId, categoryMode, parentCategoryName, categoryName);
        report.parentCategoryId = parentCategory.id;
        report.categoryId = childCategory.id;

        for (const [sourceKey, groupRows] of grouped.entries()) {
            try {
                const primaryRow = groupRows[0];

                let reference = await tx.getRepository(ProductImportReference).findOneBy({
                    storeId: referenceStoreId,
                    sourceType: SOURCE_TYPE,
                    sourceKey,
                });

                let productId = reference?.productId;
                let product = productId
                    ? await tx.getRepository(Product).findOneBy({ id: productId, mode: productMode, storeId: importStoreId } as any)
                    : null;

                const mergedActiveIngredients = Array.from(new Set(groupRows.flatMap((row) => row.activeIngredientNames)));
                const mergedSubCategoryKeys = Array.from(new Set(groupRows.flatMap((row) => row.subCategoryKeys)));
                const mergedHeadCategoryKeys = Array.from(new Set(groupRows.flatMap((row) => row.headCategoryKeys)));

                const productDescriptionPayload = {
                    sourceType: SOURCE_TYPE,
                    sourceKey,
                    nameAr: primaryRow.nameAr,
                    nameEn: primaryRow.nameEn,
                    searchable: primaryRow.searchable,
                    category: primaryRow.sourceCategoryName,
                    categoryUrlEn: primaryRow.categoryUrlEn,
                    categoryUrlAr: primaryRow.categoryUrlAr,
                    brandKey: primaryRow.brandKey,
                    activeIngredientNames: mergedActiveIngredients,
                    subCategoryKeys: mergedSubCategoryKeys,
                    headCategoryKeys: mergedHeadCategoryKeys,
                    variantsCount: groupRows.length,
                };

                if (!product) {
                    productId = uuidv4();
                    const slug = await buildUniqueProductSlugByScope(tx, productMode, importStoreId, primaryRow.finalSlugBase, productId);
                    product = tx.getRepository(Product).create({
                        id: productId,
                        mode: productMode,
                        storeId: importStoreId,
                        categoryId: childCategory.id,
                        name: primaryRow.finalName,
                        slug,
                        description: JSON.stringify(productDescriptionPayload),
                        status: 'active',
                    });
                    await tx.getRepository(Product).save(product);
                    report.productsCreated += 1;
                } else {
                    const slug = await buildUniqueProductSlugByScope(tx, productMode, importStoreId, primaryRow.finalSlugBase, product.id);
                    await tx.getRepository(Product).update(
                        { id: product.id },
                        {
                            mode: productMode,
                            storeId: importStoreId,
                            categoryId: childCategory.id,
                            name: primaryRow.finalName,
                            slug,
                            description: JSON.stringify(productDescriptionPayload),
                            status: 'active',
                        }
                    );
                    report.productsUpdated += 1;
                }

                const existingPrimary = await tx.getRepository(ProductCategory).findOneBy({
                    productId: product.id,
                    categoryId: childCategory.id,
                });

                if (!existingPrimary) {
                    await tx.getRepository(ProductCategory).insert({
                        id: uuidv4(),
                        productId: product.id,
                        categoryId: childCategory.id,
                        isPrimary: true,
                    });
                }

                const specs = buildProductSpecs(groupRows);
                await syncProductSpecs(tx, product.id, specs);
                report.specsSynced += specs.length;

                const existingVariants = await tx.getRepository(ProductVariant).find({
                    where: { productId: product.id } as any,
                });

                const variantsBySku = new Map<string, ProductVariant>();
                for (const existingVariant of existingVariants) {
                    variantsBySku.set(existingVariant.sku, existingVariant);
                }

                const dedupVariants = new Map<string, NormalizedRow>();
                for (const row of groupRows) {
                    if (dedupVariants.has(row.variantKey)) {
                        report.duplicateVariantsCollapsed += 1;
                        report.warnings.push(`duplicate variant collapsed for productKey=${sourceKey}, variantKey=${row.variantKey}`);
                    }
                    dedupVariants.set(row.variantKey, row);
                }

                const importedVariantKeys = new Set<string>();

                for (const row of dedupVariants.values()) {
                    importedVariantKeys.add(row.variantKey);

                    const variantAttributes = buildVariantAttributes(row);
                    const existingVariant = variantsBySku.get(row.variantKey);

                    if (!existingVariant) {
                        await tx.getRepository(ProductVariant).save(
                            tx.getRepository(ProductVariant).create({
                                id: uuidv4(),
                                productId: product.id,
                                sku: row.variantKey,
                                priceCents: String(row.priceCents),
                                stockQty: row.stockQty,
                                attributes: variantAttributes,
                                status: 'active',
                            })
                        );
                        report.variantsCreated += 1;
                    } else {
                        await tx.getRepository(ProductVariant).update(
                            { id: existingVariant.id },
                            {
                                priceCents: String(row.priceCents),
                                stockQty: row.stockQty,
                                attributes: variantAttributes,
                                status: 'active',
                            }
                        );
                        report.variantsUpdated += 1;
                    }
                }

                for (const existingVariant of existingVariants) {
                    if (!importedVariantKeys.has(existingVariant.sku) && existingVariant.status !== 'inactive') {
                        await tx.getRepository(ProductVariant).update(
                            { id: existingVariant.id },
                            {
                                status: 'inactive',
                                stockQty: 0,
                            }
                        );
                        report.variantsDeactivated += 1;
                    }
                }

                const sourcePayloadHash = hashPayload(groupRows.map((row) => row.sourceRow));
                if (!reference) {
                    reference = tx.getRepository(ProductImportReference).create({
                        id: uuidv4(),
                        storeId: referenceStoreId,
                        productId: product.id,
                        sourceType: SOURCE_TYPE,
                        sourceKey,
                        sourceRowId: primaryRow.sourceRowId,
                        parentCategoryName,
                        categoryName,
                        sourceImageUrl: primaryRow.mainImageUrl,
                        sourcePayloadJson: groupRows.map((row) => row.sourceRow),
                        sourcePayloadHash,
                        lastImportedAt: new Date(),
                    });
                    await tx.getRepository(ProductImportReference).save(reference);
                    report.referencesCreated += 1;
                } else {
                    await tx.getRepository(ProductImportReference).update(
                        { id: reference.id },
                        {
                            productId: product.id,
                            sourceRowId: primaryRow.sourceRowId,
                            parentCategoryName,
                            categoryName,
                            sourceImageUrl: primaryRow.mainImageUrl,
                            sourcePayloadJson: groupRows.map((row) => row.sourceRow),
                            sourcePayloadHash,
                            lastImportedAt: new Date(),
                        }
                    );
                    report.referencesUpdated += 1;
                }

                const imageRow = groupRows.find((row) => row.mainImageUrl);
                if (imageRow?.mainImageUrl) {
                    report.imagesAttempted += 1;
                    const imageResult = await refreshProductImage(tx, ctx, storeId ?? 'global', product.id, imageRow.mainImageUrl, mediaScope);
                    if (imageResult.uploaded) {
                        report.imagesUploaded += 1;
                    } else {
                        report.imageFailures += 1;
                        if (imageResult.warning) {
                            report.warnings.push(`${sourceKey}: ${imageResult.warning}`);
                        }
                    }
                }
            } catch (error: any) {
                report.errors.push({
                    sourceKey,
                    variantKey: null,
                    message: error?.message ?? 'product import failed',
                });
            }
        }
    });

    return report;
}
