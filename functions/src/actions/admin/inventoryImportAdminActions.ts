import { v4 as uuidv4 } from 'uuid';
import { EntityManager } from 'typeorm';
import { AppError } from '../../core/errors';
import { ActionContext } from '../../core/protocol';
import { MediaAsset } from '../../entities/MediaAsset';
import { InventoryImportBatch } from '../../entities/InventoryImportBatch';
import { InventoryImportRow } from '../../entities/InventoryImportRow';
import { ProductPrefixMapping } from '../../entities/ProductPrefixMapping';
import { Product } from '../../entities/Product';
import { InventoryBalance } from '../../entities/InventoryBalance';
import { InventoryAdjustment } from '../../entities/InventoryAdjustment';
import { Category } from '../../entities/Category';
import { ProductCategory } from '../../entities/ProductCategory';
import { getStorage, getBucketName } from '../../utils/storage';

function makeIdempotencyKey(input: string): string {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = ((hash << 5) - hash) + input.charCodeAt(i);
    hash |= 0;
  }
  const normalized = Math.abs(hash).toString(16);
  return (normalized + normalized + normalized + normalized).slice(0, 64);
}

function normalizePrefix(value?: string | null): string | null { if (!value) return null; const normalized = value.replace(/[^A-Za-z0-9]/g, '').trim().toUpperCase(); return normalized.length >= 3 ? normalized : null; }
function extractPrefixFromCode(value?: string | null): string | null { if (!value) return null; const tokens = value.split(/\s+/).map((t: string) => normalizePrefix(t)).filter(Boolean) as string[]; return tokens[0] ?? null; }
async function getBatchOrThrow(ctx: ActionContext, storeId: string, batchId: number): Promise<InventoryImportBatch> { const batch = await ctx.db.getRepository(InventoryImportBatch).findOneBy({ id: batchId, storeId }); if (!batch) throw new AppError('NOT_FOUND', 'Import batch not found'); return batch; }

async function computeUnmapped(ctx: ActionContext, batchId: number, storeId: string): Promise<Array<{ prefix: string; count: number }>> {
  return ctx.db.query(`SELECT r.prefix prefix, COUNT(*) count FROM inventory_import_rows r LEFT JOIN product_prefix_mappings m ON m.storeId = ? AND m.prefix = r.prefix WHERE r.batchId = ? AND r.parseStatus='ok' AND r.prefix IS NOT NULL AND m.id IS NULL GROUP BY r.prefix ORDER BY count DESC`, [storeId, batchId]);
}

async function parseFile(fileType: 'excel' | 'pdf', buffer: Buffer): Promise<Array<Partial<InventoryImportRow>>> {
  const text = buffer.toString('utf8');
  if (!text.trim()) throw new AppError('PARSE_FAILED', 'Uploaded file is empty or unsupported encoding');
  if (fileType === 'excel') {
    const lines = text.split(/\r?\n/).map((l: string) => l.trim()).filter((l: string) => Boolean(l));
    const header = (lines.shift() ?? '').split(/[;,\t]/).map((h: string) => h.trim());
    const idx = { externalCode: header.findIndex((h: string) => h === 'externalCode' || h === 'productCode'), name: header.findIndex((h: string) => h === 'name'), company: header.findIndex((h: string) => h === 'company'), unit: header.findIndex((h: string) => h === 'unit'), qtyOnHand: header.findIndex((h: string) => h === 'qtyOnHand' || h === 'qty'), price: header.findIndex((h: string) => h === 'price') };
    return lines.map((line: string, i: number) => { const cols = line.split(/[;,\t]/).map((c: string) => c.trim()); const externalCode = cols[idx.externalCode] ?? ''; const qty = Number(cols[idx.qtyOnHand] ?? ''); const prefix = extractPrefixFromCode(externalCode); if (!prefix || Number.isNaN(qty)) return { rowIndex: i + 1, parseStatus: 'error', parseErrorMessage: 'Could not parse row', rawLine: line }; const priceNum = idx.price >= 0 ? Number(cols[idx.price]) : NaN; return { rowIndex: i + 1, parseStatus: 'ok', prefix, externalCode, name: idx.name >= 0 ? (cols[idx.name] || null) : null, company: idx.company >= 0 ? (cols[idx.company] || null) : null, unit: idx.unit >= 0 ? (cols[idx.unit] || null) : null, qtyOnHand: qty.toFixed(3), priceCents: Number.isNaN(priceNum) ? null : String(Math.round(priceNum * 100)) }; });
  }
  const lines = text.split(/\r?\n/).map((l: string) => l.trim()).filter((l: string) => Boolean(l));
  return lines.map((line: string, idx: number) => { const tokens = line.split(/\s+/); const offset = /^\d+$/.test(tokens[0]) ? 1 : 0; const codeToken = tokens.slice(offset).find((t: string) => /[A-Za-z0-9]/.test(t) && normalizePrefix(t)); const prefix = normalizePrefix(codeToken ?? null); const qtyToken = [...tokens].reverse().find((t: string) => /^\d+(\.\d+)?$/.test(t)); const qty = qtyToken ? Number(qtyToken) : NaN; if (!prefix || Number.isNaN(qty)) return { rowIndex: idx + 1, parseStatus: 'error', parseErrorMessage: 'Could not parse PDF line', rawLine: line }; return { rowIndex: idx + 1, parseStatus: 'ok', prefix, externalCode: codeToken ?? null, name: tokens.slice(offset + 1, Math.max(offset + 2, tokens.length - 3)).join(' ') || null, unit: tokens[tokens.length - 1] ?? null, qtyOnHand: qty.toFixed(3), rawLine: line }; });
}

export async function adminInventoryImportCreateBatch(ctx: ActionContext, payload: any) {
  const media = await ctx.db.getRepository(MediaAsset).findOneBy({ id: payload.fileMediaAssetId });
  if (!media) throw new AppError('NOT_FOUND', 'fileMediaAssetId not found');
  if (media.kind !== 'document') throw new AppError('VALIDATION_FAILED', 'Asset kind must be document');
  if (media.storeId && media.storeId !== payload.storeId) throw new AppError('FORBIDDEN', 'Asset store mismatch');
  const key = makeIdempotencyKey(`${media.originalPath}|${media.sizeBytes}|${media.contentType}|${payload.storeId}`);
  const existingDone = await ctx.db.getRepository(InventoryImportBatch).findOneBy({ storeId: payload.storeId, idempotencyKey: key, status: 'done' });
  if (existingDone) throw new AppError('IMPORT_ALREADY_APPLIED', 'Import already applied for this file');
  const [buffer] = await getStorage().bucket(getBucketName()).file(media.originalPath).download();
  const parsedRows = await parseFile(payload.fileType, buffer);
  const batchId = await ctx.db.transaction(async (tx: EntityManager) => { const batch = await tx.getRepository(InventoryImportBatch).save(tx.getRepository(InventoryImportBatch).create({ storeId: payload.storeId, fileMediaAssetId: payload.fileMediaAssetId, fileType: payload.fileType, idempotencyKey: key, status: 'draft', createdByAdminUid: ctx.uid!, finishedAt: null, errorDetails: null })); await tx.getRepository(InventoryImportRow).insert(parsedRows.map((row: Partial<InventoryImportRow>) => ({ ...row, batchId: batch.id }))); return batch.id; });
  const unmapped = await computeUnmapped(ctx, batchId, payload.storeId);
  await ctx.db.getRepository(InventoryImportBatch).update({ id: batchId }, { totalRows: parsedRows.length, parsedRows: parsedRows.filter((r: Partial<InventoryImportRow>) => r.parseStatus === 'ok').length, parseErrorsCount: parsedRows.filter((r: Partial<InventoryImportRow>) => r.parseStatus === 'error').length, unmappedPrefixesCount: unmapped.length, status: unmapped.length ? 'needsMapping' : 'readyToApply' });
  return adminInventoryImportGet(ctx, { storeId: payload.storeId, batchId });
}

export async function adminInventoryImportPreview(ctx: ActionContext, payload: any) { const batch = await getBatchOrThrow(ctx, payload.storeId, payload.batchId); const rows = await ctx.db.getRepository(InventoryImportRow).find({ where: { batchId: batch.id }, order: { rowIndex: 'ASC' as any }, take: payload.maxRows ?? 100 }); const unmappedPrefixes = await computeUnmapped(ctx, batch.id, payload.storeId); return { batch, previewRows: rows, unmappedPrefixes, counts: { totalRows: batch.totalRows, parsedRows: batch.parsedRows, parseErrorsCount: batch.parseErrorsCount, unmappedPrefixesCount: batch.unmappedPrefixesCount }, parseErrors: rows.filter((r: InventoryImportRow) => r.parseStatus === 'error') }; }
export async function adminInventoryImportGetUnmappedPrefixes(ctx: ActionContext, payload: any) { await getBatchOrThrow(ctx, payload.storeId, payload.batchId); const prefixes = await computeUnmapped(ctx, payload.batchId, payload.storeId); const rows = await ctx.db.getRepository(InventoryImportRow).find({ where: { batchId: payload.batchId, parseStatus: 'ok' } }); return { unmappedPrefixes: prefixes.map((p: { prefix: string; count: number }) => ({ prefix: p.prefix, count: p.count, sampleRows: rows.filter((r: InventoryImportRow) => r.prefix === p.prefix).slice(0, 3) })) }; }

async function ensureCategory(tx: EntityManager, storeId: string) { let category = await tx.getRepository(Category).findOne({ where: [{ mode: 'store', storeId }, { mode: 'global', storeId: null }] as any, order: { createdAt: 'ASC' as any } }); if (!category) category = await tx.getRepository(Category).save(tx.getRepository(Category).create({ id: uuidv4(), mode: 'store', storeId, name: 'Uncategorized', slug: `uncategorized-${storeId.toLowerCase()}`, sortOrder: 0, status: 'active', parentId: null })); return category; }

export async function adminInventoryImportResolvePrefixes(ctx: ActionContext, payload: any) {
  const batch = await getBatchOrThrow(ctx, payload.storeId, payload.batchId);
  if (!['needsMapping', 'readyToApply'].includes(batch.status)) throw new AppError('IMPORT_BATCH_STATE_INVALID', 'Batch cannot be resolved');
  let createdProductsCount = 0;
  await ctx.db.transaction(async (tx: EntityManager) => {
    const category = await ensureCategory(tx, payload.storeId);
    for (const resolution of payload.resolutions as Array<any>) {
      const prefix = normalizePrefix(resolution.prefix);
      if (!prefix) throw new AppError('VALIDATION_FAILED', 'Invalid prefix');
      let productId: string = resolution.productId;
      if (resolution.mode === 'createNew') {
        const id = uuidv4();
        await tx.getRepository(Product).save(tx.getRepository(Product).create({ id, mode: 'store', storeId: payload.storeId, categoryId: category.id, name: resolution.product.name, slug: `${resolution.product.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${id.slice(0, 6)}`, description: [resolution.product.company, resolution.product.unit].filter(Boolean).join(' | ') || null, status: 'active' }));
        await tx.getRepository(ProductCategory).insert({ id: uuidv4(), productId: id, categoryId: category.id, isPrimary: true });
        productId = id;
        createdProductsCount += 1;
      }
      const product = await tx.getRepository(Product).findOne({ where: [{ id: productId, mode: 'store', storeId: payload.storeId }, { id: productId, mode: 'global', storeId: null }] as any });
      if (!product) throw new AppError('NOT_FOUND', `Product not found for prefix ${prefix}`);
      await tx.getRepository(ProductPrefixMapping).upsert({ storeId: payload.storeId, prefix, productId }, ['storeId', 'prefix']);
    }
  });
  const unmapped = await computeUnmapped(ctx, batch.id, payload.storeId);
  await ctx.db.getRepository(InventoryImportBatch).update({ id: batch.id }, { status: unmapped.length ? 'needsMapping' : 'readyToApply', unmappedPrefixesCount: unmapped.length, createdProductsCount: batch.createdProductsCount + createdProductsCount });
  return adminInventoryImportGet(ctx, { storeId: payload.storeId, batchId: batch.id });
}

export async function adminInventoryImportApply(ctx: ActionContext, payload: any) {
  const batch = await getBatchOrThrow(ctx, payload.storeId, payload.batchId);
  if (batch.status !== 'readyToApply') throw new AppError(batch.status === 'needsMapping' ? 'IMPORT_NEEDS_MAPPING' : 'IMPORT_BATCH_STATE_INVALID', 'Batch is not ready to apply');
  const done = await ctx.db.getRepository(InventoryImportBatch).findOneBy({ storeId: payload.storeId, idempotencyKey: batch.idempotencyKey, status: 'done' });
  if (done) throw new AppError('IMPORT_ALREADY_APPLIED', 'Import already applied for this file');
  const rows = await ctx.db.getRepository(InventoryImportRow).find({ where: { batchId: batch.id, parseStatus: 'ok' } });
  if (!rows.length) throw new AppError('PARSE_FAILED', 'No parsed rows to apply');
  await ctx.db.transaction(async (tx: EntityManager) => {
    await tx.getRepository(InventoryImportBatch).update({ id: batch.id }, { status: 'processing' });
    const prefixes: string[] = [];
    for (const row of rows) { if (row.prefix) prefixes.push(row.prefix); }
    const uniquePrefixes = Array.from(new Set(prefixes));
    const mappings = await tx.getRepository(ProductPrefixMapping).find({ where: { storeId: payload.storeId } });
    const mappingByPrefix = new Map<string, string>(mappings.filter((m: ProductPrefixMapping) => uniquePrefixes.includes(m.prefix)).map((m: ProductPrefixMapping) => [m.prefix, m.productId]));
    const missing = uniquePrefixes.filter((p: string) => !mappingByPrefix.has(p));
    if (missing.length) throw new AppError('IMPORT_NEEDS_MAPPING', 'Unmapped prefixes remain', { missingPrefixes: missing });
    const uploadedByProduct = new Map<string, number>();
    for (const row of rows) { const productId = mappingByPrefix.get(row.prefix as string) as string; uploadedByProduct.set(productId, Number(row.qtyOnHand ?? 0)); }
    const balances = await tx.getRepository(InventoryBalance).find({ where: { storeId: payload.storeId } });
    const balanceMap = new Map<string, number>(balances.filter((b: InventoryBalance) => uploadedByProduct.has(b.productId)).map((b: InventoryBalance) => [b.productId, Number(b.onHandQty)]));
    let adjustmentsCount = 0;
    for (const [productId, after] of uploadedByProduct.entries()) {
      const before = balanceMap.get(productId) ?? 0;
      const delta = Number((after - before).toFixed(3));
      if (delta !== 0) {
        adjustmentsCount += 1;
        await tx.getRepository(InventoryAdjustment).save(tx.getRepository(InventoryAdjustment).create({ id: uuidv4(), storeId: payload.storeId, productId, variantId: null, deltaQty: delta.toFixed(3), beforeQty: before.toFixed(3), afterQty: after.toFixed(3), reason: 'closing', importBatchId: batch.id, createdByAdminUid: ctx.uid!, performedByUid: null }));
      }
      await tx.getRepository(InventoryBalance).upsert({ storeId: payload.storeId, productId, onHandQty: after.toFixed(3) }, ['storeId', 'productId']);
    }
    await tx.getRepository(InventoryImportBatch).update({ id: batch.id }, { status: 'done', adjustmentsCount, finishedAt: new Date() });
  });
  return adminInventoryImportGet(ctx, { storeId: payload.storeId, batchId: batch.id });
}

export async function adminInventoryImportGet(ctx: ActionContext, payload: any) { const batch = await getBatchOrThrow(ctx, payload.storeId, payload.batchId); return { batch, adjustmentsCount: batch.adjustmentsCount, createdProductsCount: batch.createdProductsCount }; }
