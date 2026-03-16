import { v4 as uuidv4 } from 'uuid';
import { ActionContext } from '../../core/protocol';
import { AppError } from '../../core/errors';
import { MediaAsset } from '../../entities/MediaAsset';
import { PriceImportSession } from '../../entities/PriceImportSession';
import { PriceImportRow } from '../../entities/PriceImportRow';
import { Product } from '../../entities/Product';
import { ProductImportMapping } from '../../entities/ProductImportMapping';
import { ProductVariant } from '../../entities/ProductVariant';
import { ProductAlias } from '../../entities/ProductAlias';
import { applyPriceImportSession, persistMapping, preparePriceImportRows, refreshPriceImportSessionState } from '../../core/priceImports';
import { normalizeProductText } from '../../core/productMatching';
import { resolveStoreScopedId } from '../../utils/queryNormalization';

async function ensureSession(ctx: ActionContext, storeId: string, sessionId: string) {
  const session = await ctx.db.getRepository(PriceImportSession).findOneBy({ id: sessionId, storeId });
  if (!session) throw new AppError('NOT_FOUND', 'Price import session not found');
  return session;
}

async function decoratePriceImportRows(ctx: ActionContext, storeId: string, rows: PriceImportRow[]) {
  const productIds = Array.from(new Set(rows.map((row) => row.matchedProductId).filter(Boolean))) as string[];
  const variantIds = Array.from(new Set(rows.map((row) => row.matchedVariantId).filter(Boolean))) as string[];
  const [products, aliases, variants] = await Promise.all([
    productIds.length ? ctx.db.getRepository(Product).findByIds(productIds) : Promise.resolve([] as Product[]),
    productIds.length ? ctx.db.getRepository(ProductAlias).find({ where: productIds.map((productId) => ({ storeId, productId })) as any }) : Promise.resolve([] as ProductAlias[]),
    variantIds.length ? ctx.db.getRepository(ProductVariant).findByIds(variantIds) : Promise.resolve([] as ProductVariant[]),
  ]);
  const productMap = new Map<string, Product>(products.map((product: Product) => [product.id, product]));
  const aliasMap = new Map<string, ProductAlias>(aliases.map((alias: ProductAlias) => [alias.productId, alias]));
  const variantMap = new Map<string, ProductVariant>(variants.map((variant: ProductVariant) => [variant.id, variant]));

  return rows.map((row) => {
    const product = row.matchedProductId ? productMap.get(row.matchedProductId) || null : null;
    const alias = row.matchedProductId ? aliasMap.get(row.matchedProductId) || null : null;
    const variant = row.matchedVariantId ? variantMap.get(row.matchedVariantId) || null : null;
    return {
      id: row.id,
      rowNumber: row.rowNumber,
      sourceName: row.sourceName,
      normalizedSourceName: row.normalizedSourceName,
      sourcePriceCents: row.sourcePriceCents,
      sourcePrice: row.sourcePriceCents != null ? Number(row.sourcePriceCents) / 100 : null,
      sourceUnit: row.sourceUnit,
      sourceBalance: row.sourceBalance != null ? Number(row.sourceBalance) : null,
      matchedProductId: row.matchedProductId,
      matchedVariantId: row.matchedVariantId,
      matchedProductName: alias?.alias || product?.name || null,
      matchedGlobalProductName: product?.name || null,
      matchedVariantSku: variant?.sku || null,
      confidenceScore: row.confidenceScore,
      matchStatus: row.matchStatus,
      mappingSource: row.mappingSource,
      candidateMatches: Array.isArray(row.candidateMatches) ? row.candidateMatches : [],
      issues: Array.isArray(row.issues) ? row.issues : [],
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  });
}

async function buildPreviewPayload(ctx: ActionContext, storeId: string, session: PriceImportSession, maxRows = 200, status?: string) {
  const where: any = { sessionId: session.id };
  if (status) where.matchStatus = status;
  const rows = await ctx.db.getRepository(PriceImportRow).find({
    where,
    order: { rowNumber: 'ASC' as any },
    take: maxRows,
  });
  return {
    session,
    rows: await decoratePriceImportRows(ctx, storeId, rows),
    summary: {
      totalRows: session.totalRows,
      mappedRows: session.mappedRows,
      suggestedRows: session.suggestedRows,
      reviewRows: session.reviewRows,
      invalidRows: session.invalidRows,
      appliedRows: session.appliedRows,
      skippedRows: session.skippedRows,
    },
  };
}

export async function adminPriceImportCreateSession(ctx: ActionContext, payload: any = {}) {
  const storeId = resolveStoreScopedId(ctx.storeId, payload.storeId);
  const session = await ctx.db.getRepository(PriceImportSession).save(
    ctx.db.getRepository(PriceImportSession).create({
      id: uuidv4(),
      storeId,
      fileMediaAssetId: null,
      fileName: null,
      fileType: null,
      status: 'draft',
      createdByAdminUid: ctx.uid || 'unknown',
      errorDetails: null,
      finishedAt: null,
    })
  );
  return { session };
}

export async function adminPriceImportUploadSheet(ctx: ActionContext, payload: any) {
  const storeId = resolveStoreScopedId(ctx.storeId, payload.storeId);
  const session = await ensureSession(ctx, storeId, payload.sessionId);
  if (session.status === 'processing') throw new AppError('VALIDATION_FAILED', 'Session is processing');
  const media = await ctx.db.getRepository(MediaAsset).findOneBy({ id: payload.fileMediaAssetId });
  if (!media) throw new AppError('NOT_FOUND', 'fileMediaAssetId not found');

  const rowsInput = Array.isArray(payload.rows) ? payload.rows : [];
  const preparedRows = await preparePriceImportRows(ctx.db, storeId, rowsInput);

  await ctx.db.transaction(async (tx) => {
    await tx.getRepository(PriceImportRow).delete({ sessionId: session.id });
    await tx.getRepository(PriceImportSession).update({ id: session.id }, {
      fileMediaAssetId: payload.fileMediaAssetId,
      fileName: payload.fileName || media.originalPath || null,
      fileType: payload.fileType || media.contentType || 'excel',
      status: 'processing',
      errorDetails: null,
      finishedAt: null,
    });

    if (preparedRows.length) {
      await tx.getRepository(PriceImportRow).insert(preparedRows.map((row) => ({
        ...row,
        sessionId: session.id,
      })));
    }
  });

  for (const row of preparedRows) {
    if (row.matchStatus === 'auto-matched' && row.mappingSource === 'auto' && row.matchedProductId) {
      await persistMapping(ctx.db, {
        storeId,
        sourceText: row.sourceName,
        productId: row.matchedProductId,
        variantId: row.matchedVariantId || null,
        confidence: Number(row.confidenceScore || 0),
        mappingType: 'auto',
      });
    }
  }

  await refreshPriceImportSessionState(ctx.db, session.id);
  const refreshed = await ensureSession(ctx, storeId, session.id);
  return buildPreviewPayload(ctx, storeId, refreshed, Number(payload.maxRows || 200));
}

export async function adminPriceImportParsePreview(ctx: ActionContext, payload: any) {
  const storeId = resolveStoreScopedId(ctx.storeId, payload.storeId);
  const session = await ensureSession(ctx, storeId, payload.sessionId);
  return buildPreviewPayload(ctx, storeId, session, Number(payload.maxRows || 200), payload.status || undefined);
}

export async function adminPriceImportResolveMatch(ctx: ActionContext, payload: any) {
  const storeId = resolveStoreScopedId(ctx.storeId, payload.storeId);
  const session = await ensureSession(ctx, storeId, payload.sessionId);
  const row = await ctx.db.getRepository(PriceImportRow).findOneBy({ id: payload.rowId, sessionId: session.id });
  if (!row) throw new AppError('NOT_FOUND', 'Price import row not found');

  const product = await ctx.db.getRepository(Product).findOne({
    where: [
      { id: payload.productId, mode: 'global', storeId: null, status: 'active' },
      { id: payload.productId, mode: 'store', storeId, status: 'active' },
    ] as any,
  });
  if (!product) throw new AppError('NOT_FOUND', 'Product not found');

  let variant = null;
  if (payload.variantId) {
    variant = await ctx.db.getRepository(ProductVariant).findOneBy({ id: payload.variantId, productId: product.id, status: 'active' });
  } else {
    variant = await ctx.db.getRepository(ProductVariant).findOne({ where: { productId: product.id, status: 'active' } as any, order: { createdAt: 'ASC' as any } });
  }
  if (!variant) throw new AppError('NOT_FOUND', 'Variant not found');

  const nextConfidence = Number(payload.confidenceScore || row.confidenceScore || 100);
  await ctx.db.getRepository(PriceImportRow).update({ id: row.id }, {
    matchedProductId: product.id,
    matchedVariantId: variant.id,
    confidenceScore: nextConfidence,
    matchStatus: 'manually-confirmed',
    mappingSource: payload.saveMapping === false ? row.mappingSource : 'manual',
    issues: Array.isArray(row.issues) ? row.issues.filter((entry: string) => entry !== 'manual-review-required' && entry !== 'no-candidate-match') : [],
  });

  if (payload.saveMapping !== false) {
    await persistMapping(ctx.db, {
      storeId,
      sourceText: row.sourceName,
      productId: product.id,
      variantId: variant.id,
      confidence: nextConfidence,
      mappingType: 'manual',
    });
  }

  await refreshPriceImportSessionState(ctx.db, session.id);
  return adminPriceImportParsePreview(ctx, { storeId, sessionId: session.id, maxRows: Number(payload.maxRows || 200) });
}

export async function adminPriceImportApply(ctx: ActionContext, payload: any) {
  const storeId = resolveStoreScopedId(ctx.storeId, payload.storeId);
  const session = await ensureSession(ctx, storeId, payload.sessionId);
  if (!['ready_to_apply', 'review'].includes(session.status)) {
    throw new AppError('VALIDATION_FAILED', 'Price import session is not ready for apply');
  }
  await ctx.db.getRepository(PriceImportSession).update({ id: session.id }, { status: 'processing', errorDetails: null });
  try {
    await applyPriceImportSession(ctx.db, session);
  } catch (error: any) {
    await ctx.db.getRepository(PriceImportSession).update({ id: session.id }, {
      status: 'review',
      errorDetails: error?.message || String(error),
    });
    throw error;
  }
  const refreshed = await ensureSession(ctx, storeId, session.id);
  return buildPreviewPayload(ctx, storeId, refreshed, Number(payload.maxRows || 200));
}

export async function adminPriceImportListMappings(ctx: ActionContext, payload: any = {}) {
  const storeId = resolveStoreScopedId(ctx.storeId, payload.storeId);
  const query = String(payload.query || '').trim();
  const where: any = { storeId };
  const mappings = await ctx.db.getRepository(ProductImportMapping).find({
    where,
    order: { updatedAt: 'DESC' as any },
    take: Number(payload.limit || 100),
  });
  const filtered = query
    ? mappings.filter((mapping: ProductImportMapping) => {
      const haystack = [mapping.sourceText, mapping.normalizedSourceText].join(' ').toLowerCase();
      return haystack.includes(query.toLowerCase()) || normalizeProductText(query) === mapping.normalizedSourceText;
    })
    : mappings;
  return { mappings: filtered };
}

export async function adminPriceImportUpsertMapping(ctx: ActionContext, payload: any) {
  const storeId = resolveStoreScopedId(ctx.storeId, payload.storeId);
  const product = await ctx.db.getRepository(Product).findOne({
    where: [
      { id: payload.productId, mode: 'global', storeId: null, status: 'active' },
      { id: payload.productId, mode: 'store', storeId, status: 'active' },
    ] as any,
  });
  if (!product) throw new AppError('NOT_FOUND', 'Product not found');
  let variantId = payload.variantId || null;
  if (variantId) {
    const variant = await ctx.db.getRepository(ProductVariant).findOneBy({ id: variantId, productId: product.id, status: 'active' });
    if (!variant) throw new AppError('NOT_FOUND', 'Variant not found');
  }
  const mapping = await persistMapping(ctx.db, {
    storeId,
    sourceText: payload.sourceText,
    productId: product.id,
    variantId,
    confidence: Number(payload.confidence || 100),
    mappingType: payload.mappingType || 'manual',
  });
  return { mapping };
}

export async function adminPriceImportDeleteMapping(ctx: ActionContext, payload: any) {
  const storeId = resolveStoreScopedId(ctx.storeId, payload.storeId);
  if (payload.id) {
    await ctx.db.getRepository(ProductImportMapping).delete({ id: payload.id, storeId });
  } else if (payload.sourceText) {
    await ctx.db.getRepository(ProductImportMapping).delete({ storeId, normalizedSourceText: normalizeProductText(payload.sourceText) });
  } else {
    throw new AppError('VALIDATION_FAILED', 'id or sourceText is required');
  }
  return { deleted: true };
}
