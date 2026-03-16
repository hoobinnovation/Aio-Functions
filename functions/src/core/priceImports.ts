import { DataSource } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { AppError } from './errors';
import { Product } from '../entities/Product';
import { ProductAlias } from '../entities/ProductAlias';
import { ProductImportMapping } from '../entities/ProductImportMapping';
import { ProductVariant } from '../entities/ProductVariant';
import { PriceImportRow } from '../entities/PriceImportRow';
import { PriceImportSession } from '../entities/PriceImportSession';
import { StoreVariantPriceOverride } from '../entities/StoreVariantPriceOverride';
import { normalizeProductText, normalizeUnitText, computeProductNameScore } from './productMatching';

type RawImportRow = {
  rowNumber?: number;
  sourceName?: string;
  sourcePrice?: string | number | null;
  sourceUnit?: string | null;
  sourceBalance?: string | number | null;
};

type CandidateVariant = {
  variantId: string;
  sku: string;
  variantHint: string;
};

type CandidateProduct = {
  productId: string;
  globalName: string;
  alias: string | null;
  displayName: string;
  variants: CandidateVariant[];
};

function toPriceCents(value: any): string | null {
  if (value == null || value === '') return null;
  const normalized = Number(String(value).replace(/[^0-9.,-]/g, '').replace(/,/g, '.'));
  if (!Number.isFinite(normalized)) return null;
  return String(Math.round(normalized * 100));
}

function toBalanceValue(value: any): string | null {
  if (value == null || value === '') return null;
  const normalized = Number(String(value).replace(/[^0-9.,-]/g, '').replace(/,/g, '.'));
  if (!Number.isFinite(normalized)) return null;
  return normalized.toFixed(3);
}

function normalizeVariantHint(variant: any): string {
  const attributes = variant?.attributes || {};
  return [
    variant?.sku,
    attributes?.productShapeTypeNameAr,
    attributes?.productShapeTypeName,
    attributes?.count != null ? String(attributes.count) : '',
  ].filter(Boolean).join(' ');
}

async function loadCandidateProducts(db: DataSource, storeId: string): Promise<CandidateProduct[]> {
  const productRows = await db.query(
    `SELECT p.id productId, p.name globalName, pa.alias alias
     FROM products p
     LEFT JOIN product_aliases pa ON pa.storeId=? AND pa.productId=p.id
     WHERE ((p.mode='global' AND p.storeId IS NULL) OR (p.mode='store' AND p.storeId=?))
       AND p.status='active'`,
    [storeId, storeId],
  );
  const productIds = productRows.map((row: any) => row.productId);
  const variantRows = productIds.length
    ? await db.getRepository(ProductVariant).find({
      where: productIds.map((productId: string) => ({ productId, status: 'active' })) as any,
      order: { createdAt: 'ASC' as any },
    })
    : [];
  const variantsByProductId = new Map<string, CandidateVariant[]>();
  for (const variant of variantRows) {
    const list = variantsByProductId.get(variant.productId) || [];
    list.push({
      variantId: variant.id,
      sku: variant.sku,
      variantHint: normalizeVariantHint(variant),
    });
    variantsByProductId.set(variant.productId, list);
  }

  return productRows.map((row: any) => ({
    productId: row.productId,
    globalName: row.globalName,
    alias: row.alias || null,
    displayName: row.alias || row.globalName,
    variants: variantsByProductId.get(row.productId) || [],
  }));
}

function buildRowStatus(score: number, hasProduct: boolean): { matchStatus: string; mappingSource: string | null } {
  if (!hasProduct) return { matchStatus: 'unmapped', mappingSource: null };
  if (score >= 90) return { matchStatus: 'auto-matched', mappingSource: 'auto' };
  if (score >= 80) return { matchStatus: 'suggested', mappingSource: 'auto' };
  return { matchStatus: 'needs-review', mappingSource: null };
}

function chooseBestCandidate(rawRow: RawImportRow, candidates: CandidateProduct[]) {
  const normalizedSource = normalizeProductText(rawRow.sourceName);
  const sourceUnit = normalizeUnitText(rawRow.sourceUnit);
  const ranked = candidates.map((candidate) => {
    let bestScore = 0;
    let bestVariantId: string | null = candidate.variants[0]?.variantId || null;
    let bestVariantHint = candidate.variants[0]?.variantHint || '';

    const baseNames = [candidate.globalName, candidate.alias].filter(Boolean) as string[];
    const productNameScore = Math.max(...baseNames.map((name) => computeProductNameScore(normalizedSource, name, sourceUnit, '')), 0);
    bestScore = productNameScore;

    for (const variant of candidate.variants) {
      const score = Math.max(
        computeProductNameScore(normalizedSource, candidate.globalName, sourceUnit, variant.variantHint),
        candidate.alias ? computeProductNameScore(normalizedSource, candidate.alias, sourceUnit, variant.variantHint) : 0,
      );
      if (score > bestScore) {
        bestScore = score;
        bestVariantId = variant.variantId;
        bestVariantHint = variant.variantHint;
      }
    }

    return {
      productId: candidate.productId,
      variantId: bestVariantId,
      productName: candidate.displayName,
      globalName: candidate.globalName,
      alias: candidate.alias,
      variantHint: bestVariantHint,
      confidenceScore: bestScore,
    };
  }).sort((left, right) => right.confidenceScore - left.confidenceScore).slice(0, 5);

  return ranked;
}

async function findValidSavedMapping(db: DataSource, storeId: string, normalizedSourceText: string) {
  const mapping = await db.getRepository(ProductImportMapping).findOneBy({ storeId, normalizedSourceText });
  if (!mapping) return null;
  const product = await db.getRepository(Product).findOne({
    where: [
      { id: mapping.productId, mode: 'global', storeId: null, status: 'active' },
      { id: mapping.productId, mode: 'store', storeId, status: 'active' },
    ] as any,
  });
  if (!product) return null;
  if (!mapping.variantId) {
    const variant = await db.getRepository(ProductVariant).findOne({ where: { productId: product.id, status: 'active' } as any, order: { createdAt: 'ASC' as any } });
    return { mapping, product, variant };
  }
  const variant = await db.getRepository(ProductVariant).findOneBy({ id: mapping.variantId, productId: product.id, status: 'active' });
  if (!variant) return null;
  return { mapping, product, variant };
}

export async function preparePriceImportRows(db: DataSource, storeId: string, rows: RawImportRow[]) {
  const candidates = await loadCandidateProducts(db, storeId);
  const prepared = [];

  for (let index = 0; index < rows.length; index += 1) {
    const rawRow = rows[index] || {};
    const sourceName = String(rawRow.sourceName || '').trim();
    const normalizedSourceName = normalizeProductText(sourceName);
    const sourcePriceCents = toPriceCents(rawRow.sourcePrice);
    const issues: string[] = [];

    if (!sourceName) issues.push('missing-name');
    if (!sourcePriceCents) issues.push('missing-price');

    const saved = normalizedSourceName ? await findValidSavedMapping(db, storeId, normalizedSourceName) : null;
    if (saved) {
      prepared.push({
        id: uuidv4(),
        rowNumber: Number(rawRow.rowNumber || index + 1),
        sourceName,
        normalizedSourceName,
        sourcePriceCents,
        sourceUnit: rawRow.sourceUnit ? String(rawRow.sourceUnit).trim() : null,
        sourceBalance: toBalanceValue(rawRow.sourceBalance),
        matchedProductId: saved.product.id,
        matchedVariantId: saved.variant?.id || null,
        confidenceScore: Number(saved.mapping.confidence || 100),
        matchStatus: 'auto-matched',
        mappingSource: 'saved_mapping',
        candidateMatches: [{
          productId: saved.product.id,
          variantId: saved.variant?.id || null,
          productName: saved.mapping.variantId ? saved.product.name : saved.product.name,
          globalName: saved.product.name,
          alias: null,
          variantHint: saved.variant ? normalizeVariantHint(saved.variant) : '',
          confidenceScore: Number(saved.mapping.confidence || 100),
        }],
        issues,
      });
      continue;
    }

    const candidateMatches = normalizedSourceName ? chooseBestCandidate(rawRow, candidates) : [];
    const best = candidateMatches[0] || null;
    const statusMeta = buildRowStatus(Number(best?.confidenceScore || 0), Boolean(best));

    if (statusMeta.matchStatus === 'needs-review' && !issues.length) issues.push('manual-review-required');
    if (statusMeta.matchStatus === 'unmapped' && !issues.length) issues.push('no-candidate-match');

    prepared.push({
      id: uuidv4(),
      rowNumber: Number(rawRow.rowNumber || index + 1),
      sourceName,
      normalizedSourceName,
      sourcePriceCents,
      sourceUnit: rawRow.sourceUnit ? String(rawRow.sourceUnit).trim() : null,
      sourceBalance: toBalanceValue(rawRow.sourceBalance),
      matchedProductId: best?.productId || null,
      matchedVariantId: best?.variantId || null,
      confidenceScore: best ? Number(best.confidenceScore) : null,
      matchStatus: statusMeta.matchStatus,
      mappingSource: statusMeta.mappingSource,
      candidateMatches,
      issues,
    });
  }

  return prepared;
}

export async function refreshPriceImportSessionState(db: DataSource, sessionId: string) {
  const rows = await db.getRepository(PriceImportRow).find({ where: { sessionId }, order: { rowNumber: 'ASC' as any } });
  const mappedRows = rows.filter((row: PriceImportRow) => ['auto-matched', 'manually-confirmed'].includes(row.matchStatus)).length;
  const suggestedRows = rows.filter((row: PriceImportRow) => row.matchStatus === 'suggested').length;
  const reviewRows = rows.filter((row: PriceImportRow) => ['needs-review', 'unmapped'].includes(row.matchStatus)).length;
  const invalidRows = rows.filter((row: PriceImportRow) => Array.isArray(row.issues) && row.issues.some((entry: string) => entry === 'missing-name' || entry === 'missing-price')).length;
  const nextStatus = reviewRows || invalidRows || !rows.length ? 'review' : 'ready_to_apply';

  await db.getRepository(PriceImportSession).update({ id: sessionId }, {
    totalRows: rows.length,
    mappedRows,
    suggestedRows,
    reviewRows,
    invalidRows,
    status: nextStatus,
  });
}

export async function persistMapping(db: DataSource, payload: {
  storeId: string;
  sourceText: string;
  productId: string;
  variantId?: string | null;
  confidence: number;
  mappingType: string;
}) {
  const normalizedSourceText = normalizeProductText(payload.sourceText);
  if (!normalizedSourceText) throw new AppError('VALIDATION_FAILED', 'sourceText is required');

  const existing = await db.getRepository(ProductImportMapping).findOneBy({ storeId: payload.storeId, normalizedSourceText });
  const next = {
    id: existing?.id || uuidv4(),
    storeId: payload.storeId,
    sourceText: payload.sourceText,
    normalizedSourceText,
    productId: payload.productId,
    variantId: payload.variantId || null,
    confidence: Number(payload.confidence || 0),
    mappingType: payload.mappingType || 'manual',
  };
  await db.getRepository(ProductImportMapping).save(db.getRepository(ProductImportMapping).create(next));
  return next;
}

export async function applyPriceImportSession(db: DataSource, session: PriceImportSession) {
  const rows = await db.getRepository(PriceImportRow).find({ where: { sessionId: session.id }, order: { rowNumber: 'ASC' as any } });
  if (!rows.length) throw new AppError('VALIDATION_FAILED', 'Price import session is empty');
  const blockers = rows.filter((row: PriceImportRow) => !row.matchedVariantId || !row.sourcePriceCents || ['needs-review', 'unmapped'].includes(row.matchStatus));
  if (blockers.length) {
    throw new AppError('VALIDATION_FAILED', 'Review rows before applying price import', { rowIds: blockers.map((row: PriceImportRow) => row.id) });
  }

  let appliedRows = 0;
  let skippedRows = 0;
  for (const row of rows as PriceImportRow[]) {
    const variant = await db.getRepository(ProductVariant).findOneBy({ id: row.matchedVariantId as string, status: 'active' });
    if (!variant) {
      await db.getRepository(PriceImportRow).update({ id: row.id }, {
        matchedVariantId: null,
        matchStatus: 'needs-review',
        issues: [...(Array.isArray(row.issues) ? row.issues : []), 'variant-not-found'],
      });
      skippedRows += 1;
      continue;
    }

    const existing = await db.getRepository(StoreVariantPriceOverride).findOneBy({ storeId: session.storeId, variantId: variant.id });
    await db.getRepository(StoreVariantPriceOverride).save(
      db.getRepository(StoreVariantPriceOverride).create({
        id: existing?.id || uuidv4(),
        storeId: session.storeId,
        variantId: variant.id,
        priceCents: row.sourcePriceCents as string,
        priceImportSessionId: session.id,
      })
    );

    if (row.mappingSource === 'auto' && Number(row.confidenceScore || 0) >= 90) {
      await persistMapping(db, {
        storeId: session.storeId,
        sourceText: row.sourceName,
        productId: row.matchedProductId as string,
        variantId: row.matchedVariantId,
        confidence: Number(row.confidenceScore || 0),
        mappingType: 'auto',
      });
    }
    appliedRows += 1;
  }

  await refreshPriceImportSessionState(db, session.id);
  const refreshed = await db.getRepository(PriceImportSession).findOneByOrFail({ id: session.id });
  await db.getRepository(PriceImportSession).update({ id: session.id }, {
    appliedRows,
    skippedRows,
    status: skippedRows ? 'review' : 'done',
    finishedAt: skippedRows ? null : new Date(),
  });
  if (skippedRows) {
    throw new AppError('VALIDATION_FAILED', 'Some rows became invalid during apply and need review again');
  }
  return refreshed;
}
