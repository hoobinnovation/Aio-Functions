import { GoodsReceipt } from '../../../../../entities/GoodsReceipt';
import { GoodsReceiptItem } from '../../../../../entities/GoodsReceiptItem';
import { InventoryBalance } from '../../../../../entities/InventoryBalance';
import { InventoryLot } from '../../../../../entities/InventoryLot';
import { InventoryReservation } from '../../../../../entities/InventoryReservation';
import { InventoryTransfer } from '../../../../../entities/InventoryTransfer';
import { InventoryTransferItem } from '../../../../../entities/InventoryTransferItem';
import { PurchaseOrder } from '../../../../../entities/PurchaseOrder';
import { PurchaseOrderItem } from '../../../../../entities/PurchaseOrderItem';
import { StockMovement } from '../../../../../entities/StockMovement';
import { Supplier } from '../../../../../entities/Supplier';
import { SupplierContact } from '../../../../../entities/SupplierContact';
import { SupplierVariant } from '../../../../../entities/SupplierVariant';
import { Warehouse } from '../../../../../entities/Warehouse';
import { WarehouseLocation } from '../../../../../entities/WarehouseLocation';
import { addSkip, incCreated, incUpdated, strNum, upsertById } from '../seederUtils';
import { SeedContext, SeedSummary } from '../types';
import { addDays, dateOnly, getStoreVariants, scopedId } from './seedHelpers';

export async function seedWarehouseProcurementInventory(ctx: SeedContext, summary: SeedSummary) {
    const variants = await getStoreVariants(ctx);
    if (!variants.length) {
        addSkip(summary, 'WarehouseProcurementInventory', `No variants found for storeId=${ctx.storeId}`);
        return;
    }

    const manager = ctx.manager;
    const storeId = ctx.storeId!;

    const warehouseAId = scopedId(storeId, 'warehouse', 1);
    const warehouseBId = scopedId(storeId, 'warehouse', 2);
    const locationAId = scopedId(storeId, 'whloc', 1);
    const locationBId = scopedId(storeId, 'whloc', 2);
    const supplierId = scopedId(storeId, 'supplier', 1);
    const supplierContactId = scopedId(storeId, 'supplierContact', 1);
    const poId = scopedId(storeId, 'purchaseOrder', 1);
    const grId = scopedId(storeId, 'goodsReceipt', 1);
    const transferId = scopedId(storeId, 'inventoryTransfer', 1);
    const reservationId = scopedId(storeId, 'reservation', 1);

    await upsertById(manager, Warehouse, 'Warehouse', {
        id: warehouseAId,
        storeId,
        name: 'Main Warehouse',
        code: 'MAIN',
        address: 'Seed Main Warehouse',
        isActive: true,
        isDefault: true,
    }, summary);

    await upsertById(manager, Warehouse, 'Warehouse', {
        id: warehouseBId,
        storeId,
        name: 'Overflow Warehouse',
        code: 'OVR',
        address: 'Seed Overflow Warehouse',
        isActive: true,
        isDefault: false,
    }, summary);

    await upsertById(manager, WarehouseLocation, 'WarehouseLocation', {
        id: locationAId,
        warehouseId: warehouseAId,
        code: 'A-01',
        name: 'Primary Shelf',
        isActive: true,
    }, summary);

    await upsertById(manager, WarehouseLocation, 'WarehouseLocation', {
        id: locationBId,
        warehouseId: warehouseBId,
        code: 'B-01',
        name: 'Overflow Shelf',
        isActive: true,
    }, summary);

    await upsertById(manager, Supplier, 'Supplier', {
        id: supplierId,
        storeId,
        name: 'Seed Supplier One',
        legalName: 'Seed Supplier One LLC',
        code: 'SUP-001',
        status: 'active',
        notes: 'Seeded supplier',
        metadata: { channel: 'dev-seed' },
    }, summary);

    await upsertById(manager, SupplierContact, 'SupplierContact', {
        id: supplierContactId,
        supplierId,
        fullName: 'Mona Procurement',
        role: 'Account Manager',
        email: 'supplier1@demo.dev',
        phone: '+201000000001',
        isPrimary: true,
    }, summary);

    const selectedVariants = variants.slice(0, Math.min(4, variants.length));
    let subtotal = 0;

    for (let i = 0; i < selectedVariants.length; i += 1) {
        const variant = selectedVariants[i];
        const qty = 10 + i * 5;
        const unitCost = 7000 + i * 1000;
        subtotal += qty * unitCost;

        await upsertById(manager, SupplierVariant, 'SupplierVariant', {
            id: scopedId(storeId, 'supplierVariant', i + 1),
            supplierId,
            variantId: variant.id,
            supplierSku: `SUPSKU-${i + 1}`,
            lastCostCents: String(unitCost),
            currencyCode: 'EGP',
            isPreferred: i === 0,
            leadTimeDays: 3 + i,
        }, summary);
    }

    await upsertById(manager, PurchaseOrder, 'PurchaseOrder', {
        id: poId,
        storeId,
        supplierId,
        warehouseId: warehouseAId,
        poNumber: `PO-${storeId.slice(-6)}-001`,
        status: 'approved',
        expectedDate: dateOnly(addDays(ctx.now, 3)),
        notes: 'Seed approved PO',
        subtotalCents: String(subtotal),
        totalCents: String(subtotal),
        createdByUid: ctx.demoUids.adminOpsUid,
    }, summary);

    for (let i = 0; i < selectedVariants.length; i += 1) {
        const variant = selectedVariants[i];
        const qty = 10 + i * 5;
        const unitCost = 7000 + i * 1000;

        await upsertById(manager, PurchaseOrderItem, 'PurchaseOrderItem', {
            id: scopedId(storeId, 'poItem', i + 1),
            purchaseOrderId: poId,
            variantId: variant.id,
            orderedQty: String(qty),
            receivedQty: String(qty),
            unitCostCents: String(unitCost),
            lineTotalCents: String(qty * unitCost),
            note: 'Seed PO line',
        }, summary);
    }

    await upsertById(manager, GoodsReceipt, 'GoodsReceipt', {
        id: grId,
        storeId,
        purchaseOrderId: poId,
        supplierId,
        warehouseId: warehouseAId,
        receiptNumber: `GR-${storeId.slice(-6)}-001`,
        status: 'posted',
        receivedDate: dateOnly(ctx.now),
        note: 'Seed receipt for approved PO',
        receivedByUid: ctx.demoUids.adminOpsUid,
    }, summary);

    for (let i = 0; i < selectedVariants.length; i += 1) {
        const variant = selectedVariants[i];
        const qty = 10 + i * 5;
        const unitCost = 7000 + i * 1000;
        const grItemId = scopedId(storeId, 'grItem', i + 1);
        const lotId = scopedId(storeId, 'lot', i + 1);
        const lotNumber = `LOT-${i + 1}`;

        await upsertById(manager, GoodsReceiptItem, 'GoodsReceiptItem', {
            id: grItemId,
            goodsReceiptId: grId,
            purchaseOrderItemId: scopedId(storeId, 'poItem', i + 1),
            variantId: variant.id,
            receivedQty: String(qty),
            unitCostCents: String(unitCost),
            expiryDate: dateOnly(addDays(ctx.now, 180 + i * 30)),
            lotNumber,
        }, summary);

        await upsertById(manager, InventoryLot, 'InventoryLot', {
            id: lotId,
            storeId,
            variantId: variant.id,
            warehouseId: warehouseAId,
            goodsReceiptItemId: grItemId,
            lotNumber,
            expiryDate: dateOnly(addDays(ctx.now, 180 + i * 30)),
            receivedQty: String(qty),
            remainingQty: String(qty - (i === 0 ? 2 : 0)),
            unitCostCents: String(unitCost),
        }, summary);

        const balanceRepo = manager.getRepository(InventoryBalance);
        const productId = variant.productId;
        const existingBalance = await balanceRepo.findOne({ where: { storeId, productId } as any });
        if (existingBalance) {
            await balanceRepo.save(balanceRepo.create({
                ...existingBalance,
                onHandQty: strNum(Number(existingBalance.onHandQty) + qty),
            }));
            incUpdated(summary, 'InventoryBalance');
        } else {
            await balanceRepo.save(balanceRepo.create({
                storeId,
                productId,
                onHandQty: String(qty),
            }));
            incCreated(summary, 'InventoryBalance');
        }

        await upsertById(manager, StockMovement, 'StockMovement', {
            id: scopedId(storeId, 'stockReceipt', i + 1),
            storeId,
            variantId: variant.id,
            warehouseId: warehouseAId,
            warehouseLocationId: locationAId,
            lotId,
            movementType: 'goods_receipt',
            qtyDelta: String(qty),
            beforeQty: '0',
            afterQty: String(qty),
            unitCostCents: String(unitCost),
            totalCostCents: String(qty * unitCost),
            sourceDocumentType: 'goods_receipt',
            sourceDocumentId: grId,
            sourceLineId: grItemId,
            note: 'Seed goods receipt stock in',
            createdByUid: ctx.demoUids.adminOpsUid,
        }, summary);
    }

    await upsertById(manager, InventoryReservation, 'InventoryReservation', {
        id: reservationId,
        storeId,
        variantId: selectedVariants[0].id,
        warehouseId: warehouseAId,
        qty: '2',
        sourceDocumentType: 'order',
        sourceDocumentId: `seed-order-${storeId.slice(-4)}`,
        status: 'active',
        expiresAt: addDays(ctx.now, 1),
    }, summary);

    await upsertById(manager, StockMovement, 'StockMovement', {
        id: scopedId(storeId, 'stockReserve', 1),
        storeId,
        variantId: selectedVariants[0].id,
        warehouseId: warehouseAId,
        warehouseLocationId: locationAId,
        lotId: scopedId(storeId, 'lot', 1),
        movementType: 'reservation_hold',
        qtyDelta: '-2',
        beforeQty: '10',
        afterQty: '8',
        unitCostCents: '7000',
        totalCostCents: '14000',
        sourceDocumentType: 'inventory_reservation',
        sourceDocumentId: reservationId,
        sourceLineId: null,
        note: 'Seed reservation hold',
        createdByUid: ctx.demoUids.adminOpsUid,
    }, summary);

    await upsertById(manager, InventoryTransfer, 'InventoryTransfer', {
        id: transferId,
        storeId,
        fromWarehouseId: warehouseAId,
        toWarehouseId: warehouseBId,
        status: 'completed',
        note: 'Seed internal transfer',
    }, summary);

    await upsertById(manager, InventoryTransferItem, 'InventoryTransferItem', {
        id: scopedId(storeId, 'transferItem', 1),
        transferId,
        variantId: selectedVariants[1]?.id ?? selectedVariants[0].id,
        qty: '3',
    }, summary);

    await upsertById(manager, StockMovement, 'StockMovement', {
        id: scopedId(storeId, 'stockTransferOut', 1),
        storeId,
        variantId: selectedVariants[1]?.id ?? selectedVariants[0].id,
        warehouseId: warehouseAId,
        warehouseLocationId: locationAId,
        lotId: scopedId(storeId, 'lot', 2),
        movementType: 'transfer_out',
        qtyDelta: '-3',
        beforeQty: '15',
        afterQty: '12',
        unitCostCents: '8000',
        totalCostCents: '24000',
        sourceDocumentType: 'inventory_transfer',
        sourceDocumentId: transferId,
        sourceLineId: scopedId(storeId, 'transferItem', 1),
        note: 'Seed transfer out',
        createdByUid: ctx.demoUids.adminOpsUid,
    }, summary);

    await upsertById(manager, StockMovement, 'StockMovement', {
        id: scopedId(storeId, 'stockTransferIn', 1),
        storeId,
        variantId: selectedVariants[1]?.id ?? selectedVariants[0].id,
        warehouseId: warehouseBId,
        warehouseLocationId: locationBId,
        lotId: null,
        movementType: 'transfer_in',
        qtyDelta: '3',
        beforeQty: '0',
        afterQty: '3',
        unitCostCents: '8000',
        totalCostCents: '24000',
        sourceDocumentType: 'inventory_transfer',
        sourceDocumentId: transferId,
        sourceLineId: scopedId(storeId, 'transferItem', 1),
        note: 'Seed transfer in',
        createdByUid: ctx.demoUids.adminOpsUid,
    }, summary);
}