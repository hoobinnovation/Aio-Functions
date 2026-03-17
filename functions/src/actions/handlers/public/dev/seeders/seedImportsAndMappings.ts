import { InventoryImportBatch } from '../../../../../entities/InventoryImportBatch';
import { InventoryImportRow } from '../../../../../entities/InventoryImportRow';
import { MediaAsset } from '../../../../../entities/MediaAsset';
import { PriceImportRow } from '../../../../../entities/PriceImportRow';
import { PriceImportSession } from '../../../../../entities/PriceImportSession';
import { ProductAlias } from '../../../../../entities/ProductAlias';
import { ProductBaseMedia } from '../../../../../entities/ProductBaseMedia';
import { ProductCategory } from '../../../../../entities/ProductCategory';
import { ProductImportMapping } from '../../../../../entities/ProductImportMapping';
import { ProductImportReference } from '../../../../../entities/ProductImportReference';
import { StoreProductMediaOverride } from '../../../../../entities/StoreProductMediaOverride';
import { StoreVariantPriceOverride } from '../../../../../entities/StoreVariantPriceOverride';
import { addSkip, incCreated, incUpdated, upsertById } from '../seederUtils';
import { SeedContext, SeedSummary } from '../types';
import { dateOnly, getStoreCategories, getStoreProducts, getStoreVariants, scopedId } from './seedHelpers';

function normalizeName(input: string) {
    return input.trim().toLowerCase().replace(/\s+/g, ' ');
}

export async function seedImportsAndMappings(ctx: SeedContext, summary: SeedSummary) {
    const storeId = ctx.storeId!;
    const products = await getStoreProducts(ctx);
    const variants = await getStoreVariants(ctx);
    const categories = await getStoreCategories(ctx);

    if (!products.length || !variants.length) {
        addSkip(summary, 'ImportsAndMappings', `Missing products/variants for storeId=${storeId}`);
        return;
    }

    const mediaId = scopedId(storeId, 'importFileMedia', 1);
    await upsertById(ctx.manager, MediaAsset, 'MediaAsset', {
        id: mediaId,
        storeId,
        ownerType: 'import_session',
        ownerId: storeId,
        kind: 'document',
        originalPath: `stores/${storeId}/imports/catalog-seed.xlsx`,
        thumbnailPath: null,
        contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        sizeBytes: '53248',
        status: 'ready',
        createdByUid: ctx.demoUids.adminCatalogUid ?? ctx.demoUids.adminOwnerUid,
    }, summary);

    const invBatchRepo = ctx.manager.getRepository(InventoryImportBatch);
    let invBatch = await invBatchRepo.findOne({ where: { idempotencyKey: `seed-batch-${storeId}` } as any });
    if (!invBatch) {
        invBatch = await invBatchRepo.save(invBatchRepo.create({
            storeId,
            fileMediaAssetId: mediaId,
            fileType: 'excel',
            status: 'done',
            idempotencyKey: `seed-batch-${storeId}`,
            totalRows: 3,
            parsedRows: 3,
            unmappedPrefixesCount: 0,
            createdProductsCount: 0,
            adjustmentsCount: 3,
            parseErrorsCount: 0,
            createdByAdminUid: ctx.demoUids.adminCatalogUid ?? ctx.demoUids.adminOwnerUid,
            finishedAt: ctx.now,
            errorDetails: null,
        }));
        incCreated(summary, 'InventoryImportBatch');
    } else {
        invBatch = await invBatchRepo.save(invBatchRepo.create({
            ...invBatch,
            status: 'done',
            totalRows: 3,
            parsedRows: 3,
            finishedAt: ctx.now,
        }));
        incUpdated(summary, 'InventoryImportBatch');
    }

    const invRowRepo = ctx.manager.getRepository(InventoryImportRow);
    for (let i = 0; i < 3; i += 1) {
        const existing = await invRowRepo.findOne({ where: { batchId: invBatch.id, rowIndex: i + 1 } as any });
        const row = invRowRepo.create({
            ...(existing ?? {}),
            batchId: invBatch.id,
            rowIndex: i + 1,
            prefix: i === 0 ? 'MED' : 'SKU',
            externalCode: `EXT-${i + 1}`,
            name: products[i]?.name ?? products[0].name,
            company: 'Seed Supplier One',
            unit: 'pcs',
            qtyOnHand: String(10 + i * 5),
            priceCents: String(25000 + i * 5000),
            rawLine: `EXT-${i + 1},${products[i]?.name ?? products[0].name}`,
            parseStatus: 'ok',
            parseErrorMessage: null,
        });
        await invRowRepo.save(row);
        existing ? incUpdated(summary, 'InventoryImportRow') : incCreated(summary, 'InventoryImportRow');
    }

    const priceSessionId = scopedId(storeId, 'priceSession', 1);
    await upsertById(ctx.manager, PriceImportSession, 'PriceImportSession', {
        id: priceSessionId,
        storeId,
        fileMediaAssetId: mediaId,
        fileName: 'seed-prices.xlsx',
        fileType: 'excel',
        status: 'done',
        totalRows: 3,
        mappedRows: 2,
        suggestedRows: 1,
        reviewRows: 0,
        appliedRows: 2,
        skippedRows: 0,
        invalidRows: 0,
        createdByAdminUid: ctx.demoUids.adminCatalogUid ?? ctx.demoUids.adminOwnerUid,
        errorDetails: null,
        finishedAt: ctx.now,
    }, summary);

    for (let i = 0; i < 3; i += 1) {
        await upsertById(ctx.manager, PriceImportRow, 'PriceImportRow', {
            id: scopedId(storeId, 'priceRow', i + 1),
            sessionId: priceSessionId,
            rowNumber: i + 1,
            sourceName: products[i]?.name ?? products[0].name,
            normalizedSourceName: normalizeName(products[i]?.name ?? products[0].name),
            sourcePriceCents: String(30000 + i * 2500),
            sourceUnit: 'pcs',
            sourceBalance: String(10 + i),
            matchedProductId: products[i]?.id ?? products[0].id,
            matchedVariantId: variants[i]?.id ?? variants[0].id,
            confidenceScore: i === 2 ? 76 : 96,
            matchStatus: i === 2 ? 'suggested' : 'mapped',
            mappingSource: i === 2 ? 'similarity' : 'manual',
            candidateMatches: i === 2 ? [{ productId: products[0].id, score: 76 }] : null,
            issues: null,
        }, summary);
    }

    for (let i = 0; i < Math.min(3, products.length); i += 1) {
        const product = products[i];
        const variant = variants[i] ?? variants[0];
        const category = categories[i] ?? categories[0];

        await upsertById(ctx.manager, ProductAlias, 'ProductAlias', {
            id: scopedId(storeId, 'productAlias', i + 1),
            storeId,
            productId: product.id,
            alias: `${product.name} Seed Alias`,
            normalizedAlias: normalizeName(`${product.name} Seed Alias`),
        }, summary);

        await upsertById(ctx.manager, ProductImportMapping, 'ProductImportMapping', {
            id: scopedId(storeId, 'productMapping', i + 1),
            storeId,
            sourceText: `${product.name} importer text`,
            normalizedSourceText: normalizeName(`${product.name} importer text`),
            productId: product.id,
            variantId: variant.id,
            confidence: 95,
            mappingType: 'manual',
        }, summary);

        await upsertById(ctx.manager, ProductImportReference, 'ProductImportReference', {
            id: scopedId(storeId, 'productReference', i + 1),
            storeId,
            productId: product.id,
            sourceType: 'inventory_import',
            sourceKey: `SRC-${i + 1}`,
            sourceRowId: String(i + 1),
            parentCategoryName: category?.name ?? 'Seed Parent',
            categoryName: category?.name ?? 'Seed Category',
            sourceImageUrl: `https://example.com/seed/${i + 1}.jpg`,
            sourcePayloadJson: { row: i + 1, importedAt: dateOnly(ctx.now) },
            sourcePayloadHash: `seedhash_${storeId}_${i + 1}`,
            lastImportedAt: ctx.now,
        }, summary);

        await upsertById(ctx.manager, ProductCategory, 'ProductCategory', {
            id: scopedId(storeId, 'productCategory', i + 1),
            productId: product.id,
            categoryId: category?.id ?? categories[0]?.id ?? category?.id,
            isPrimary: true,
        }, summary);

        await upsertById(ctx.manager, ProductBaseMedia, 'ProductBaseMedia', {
            id: scopedId(storeId, 'baseMedia', i + 1),
            productId: product.id,
            mediaAssetId: mediaId,
            sortOrder: i,
        }, summary);

        await upsertById(ctx.manager, StoreProductMediaOverride, 'StoreProductMediaOverride', {
            id: scopedId(storeId, 'overrideMedia', i + 1),
            storeId,
            productId: product.id,
            mediaAssetId: mediaId,
            sortOrder: i,
        }, summary);

        await upsertById(ctx.manager, StoreVariantPriceOverride, 'StoreVariantPriceOverride', {
            id: scopedId(storeId, 'priceOverride', i + 1),
            storeId,
            variantId: variant.id,
            priceCents: String(33000 + i * 2000),
            priceImportSessionId: priceSessionId,
        }, summary);
    }
}