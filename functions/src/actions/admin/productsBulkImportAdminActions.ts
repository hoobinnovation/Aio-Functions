import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { EntityManager } from 'typeorm';
import { ActionContext } from '../../core/protocol';
import { AppError } from '../../core/errors';
import { Store } from '../../entities/Store';
import { Category } from '../../entities/Category';
import { Product } from '../../entities/Product';
import { ProductImportReference } from '../../entities/ProductImportReference';
import { ProductImage } from '../../entities/ProductImage';
import { MediaAsset } from '../../entities/MediaAsset';
import { getBucketName, getStorage } from '../../utils/storage';

const SOURCE_TYPE = 'jsonBulkImport';
const fetchAny: any = (globalThis as any).fetch;

type NormalizedRow = {
  sourceRow: Record<string, any>;
  sourceKey: string;
  sourceRowId: string | null;
  nameAr: string | null;
  nameEn: string | null;
  finalName: string;
  slugAr: string | null;
  slugEn: string | null;
  finalSlugBase: string;
  priceCents: number;
  searchable: boolean;
  mainImageUrl: string | null;
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

async function ensureCategoryHierarchy(
  tx: EntityManager,
  storeId: string,
  parentCategoryNameRaw: string,
  categoryNameRaw: string,
): Promise<{ parentCategory: Category; childCategory: Category }> {
  const parentCategoryName = normalizeText(parentCategoryNameRaw);
  const categoryName = normalizeText(categoryNameRaw);
  if (!parentCategoryName) throw new AppError('VALIDATION_FAILED', 'parentCategoryName is required');
  if (!categoryName) throw new AppError('VALIDATION_FAILED', 'categoryName is required');

  const categories = await tx.getRepository(Category).find({ where: { storeId } });
  const parentNorm = normalizeNameForCompare(parentCategoryName);
  let parentCategory = categories.find((c: Category) => c.parentId == null && normalizeNameForCompare(c.name) === parentNorm);

  if (!parentCategory) {
    const parentSlugBase = toSlug(parentCategoryName) || `category-${uuidv4().slice(0, 6)}`;
    parentCategory = tx.getRepository(Category).create({
      id: uuidv4(),
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

  return {
    value: {
      sourceRow,
      sourceKey,
      sourceRowId,
      nameAr,
      nameEn,
      finalName,
      slugAr,
      slugEn,
      finalSlugBase,
      priceCents,
      searchable: normalizeBoolean(sourceRow.searchable),
      mainImageUrl: imageUrl,
    },
    error: null,
  };
}

async function buildUniqueProductSlug(tx: EntityManager, storeId: string, base: string, productId: string): Promise<string> {
  const candidate = `${base}-${productId.slice(0, 6)}`.slice(0, 200);
  const existing = await tx.getRepository(Product).findOneBy({ storeId, slug: candidate });
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
    const existing = await productImageRepo.find({ where: { productId }, order: { sortOrder: 'ASC' as any } });

    if (existing.length) {
      await productImageRepo.update({ id: existing[0].id }, { mediaAssetId: assetId, sortOrder: 0 });
      for (let i = 1; i < existing.length; i += 1) {
        await productImageRepo.update({ id: existing[i].id }, { sortOrder: i });
      }
    } else {
      await productImageRepo.save(productImageRepo.create({ id: uuidv4(), productId, mediaAssetId: assetId, sortOrder: 0 }));
    }

    return { uploaded: true };
  } catch (error: any) {
    return { uploaded: false, warning: `image pipeline failed: ${error?.message ?? String(error)}` };
  }
}

export async function adminProductsBulkImportFromJson(ctx: ActionContext, payload: any) {
  const normalizedStoreIdRaw = normalizeText(payload?.storeId);
  const storeId = normalizedStoreIdRaw && /^\d+$/.test(normalizedStoreIdRaw) ? String(Number(normalizedStoreIdRaw)) : normalizedStoreIdRaw;
  if (!storeId) throw new AppError('VALIDATION_FAILED', 'storeId is required');

  const parentCategoryName = normalizeText(payload?.parentCategoryName);
  const categoryName = normalizeText(payload?.categoryName);
  if (!parentCategoryName) throw new AppError('VALIDATION_FAILED', 'parentCategoryName is required');
  if (!categoryName) throw new AppError('VALIDATION_FAILED', 'categoryName is required');
  if (!Array.isArray(payload?.data) || payload.data.length === 0) throw new AppError('VALIDATION_FAILED', 'data must be a non-empty array');

  const store = await ctx.db.getRepository(Store).findOneBy({ id: storeId });
  if (!store) throw new AppError('NOT_FOUND', 'Store not found');

  const report = {
    storeId,
    parentCategoryId: null as string | null,
    categoryId: null as string | null,
    totalRowsReceived: payload.data.length,
    totalRowsNormalized: 0,
    invalidRowsSkipped: 0,
    duplicateRowsCollapsed: 0,
    productsCreated: 0,
    productsUpdated: 0,
    referencesCreated: 0,
    referencesUpdated: 0,
    imagesAttempted: 0,
    imagesUploaded: 0,
    imageFailures: 0,
    warnings: [] as string[],
    errors: [] as Array<{ sourceKey?: string | null; message: string }>,
  };

  const dedup = new Map<string, NormalizedRow>();
  for (const row of payload.data) {
    const normalized = normalizeRow(row);
    if (!normalized.value) {
      report.invalidRowsSkipped += 1;
      report.errors.push({ sourceKey: null, message: normalized.error ?? 'invalid row' });
      continue;
    }

    if (dedup.has(normalized.value.sourceKey)) {
      report.duplicateRowsCollapsed += 1;
      report.warnings.push(`duplicate productKey collapsed: ${normalized.value.sourceKey}`);
    }

    dedup.set(normalized.value.sourceKey, normalized.value);
  }

  report.totalRowsNormalized = dedup.size;

  await ctx.db.transaction(async (tx: EntityManager) => {
    const { parentCategory, childCategory } = await ensureCategoryHierarchy(tx, storeId, parentCategoryName, categoryName);
    report.parentCategoryId = parentCategory.id;
    report.categoryId = childCategory.id;

    for (const row of dedup.values()) {
      try {
        let reference = await tx.getRepository(ProductImportReference).findOneBy({
          storeId,
          sourceType: SOURCE_TYPE,
          sourceKey: row.sourceKey,
        });

        let productId = reference?.productId;
        let product = productId ? await tx.getRepository(Product).findOneBy({ id: productId, storeId }) : null;

        if (!product) {
          productId = uuidv4();
          const slug = await buildUniqueProductSlug(tx, storeId, row.finalSlugBase, productId);
          product = tx.getRepository(Product).create({
            id: productId,
            storeId,
            categoryId: childCategory.id,
            name: row.finalName,
            slug,
            description: JSON.stringify({
              nameAr: row.nameAr,
              nameEn: row.nameEn,
              searchable: row.searchable,
              priceCents: row.priceCents,
            }),
            status: 'active',
          });
          await tx.getRepository(Product).save(product);
          report.productsCreated += 1;
        } else {
          const slug = await buildUniqueProductSlug(tx, storeId, row.finalSlugBase, product.id);
          await tx.getRepository(Product).update(
            { id: product.id },
            {
              categoryId: childCategory.id,
              name: row.finalName,
              slug,
              description: JSON.stringify({
                nameAr: row.nameAr,
                nameEn: row.nameEn,
                searchable: row.searchable,
                priceCents: row.priceCents,
              }),
              status: 'active',
            }
          );
          report.productsUpdated += 1;
        }

        const sourcePayloadHash = hashPayload(row.sourceRow);
        if (!reference) {
          reference = tx.getRepository(ProductImportReference).create({
            id: uuidv4(),
            storeId,
            productId: product.id,
            sourceType: SOURCE_TYPE,
            sourceKey: row.sourceKey,
            sourceRowId: row.sourceRowId,
            parentCategoryName,
            categoryName,
            sourceImageUrl: row.mainImageUrl,
            sourcePayloadJson: row.sourceRow,
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
              sourceRowId: row.sourceRowId,
              parentCategoryName,
              categoryName,
              sourceImageUrl: row.mainImageUrl,
              sourcePayloadJson: row.sourceRow,
              sourcePayloadHash,
              lastImportedAt: new Date(),
            }
          );
          report.referencesUpdated += 1;
        }

        if (row.mainImageUrl) {
          report.imagesAttempted += 1;
          const imageResult = await refreshProductImage(tx, ctx, storeId, product.id, row.mainImageUrl);
          if (imageResult.uploaded) {
            report.imagesUploaded += 1;
          } else {
            report.imageFailures += 1;
            if (imageResult.warning) report.warnings.push(`${row.sourceKey}: ${imageResult.warning}`);
          }
        }
      } catch (error: any) {
        report.errors.push({ sourceKey: row.sourceKey, message: error?.message ?? 'row import failed' });
      }
    }
  });

  return report;
}
