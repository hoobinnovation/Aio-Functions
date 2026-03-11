import { EntityManager } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { AppError } from '../errors';
import { PurchaseOrder } from '../../entities/PurchaseOrder';
import { PurchaseOrderItem } from '../../entities/PurchaseOrderItem';
import { GoodsReceipt } from '../../entities/GoodsReceipt';
import { GoodsReceiptItem } from '../../entities/GoodsReceiptItem';
import { ProductVariant } from '../../entities/ProductVariant';
import { StockMovement } from '../../entities/StockMovement';
import { InventoryLot } from '../../entities/InventoryLot';

export async function createPurchaseOrderWithItems(manager: EntityManager, input: any, createdByUid?: string | null): Promise<PurchaseOrder> {
  if (!Array.isArray(input.items) || input.items.length === 0) throw new AppError('VALIDATION_ERROR', 'Purchase order items are required');

  const poId = uuidv4();
  const poNumber = input.poNumber ?? `PO-${Date.now()}`;
  let subtotalCents = 0;

  for (const item of input.items) {
    const qty = Number(item.qty);
    const unitCostCents = Math.round(Number(item.unitCostCents));
    if (!Number.isFinite(qty) || qty <= 0) throw new AppError('VALIDATION_ERROR', 'Invalid purchase quantity');
    if (!Number.isFinite(unitCostCents) || unitCostCents < 0) throw new AppError('VALIDATION_ERROR', 'Invalid purchase cost');
    subtotalCents += Math.round(qty * unitCostCents);
  }

  const po = manager.getRepository(PurchaseOrder).create({
    id: poId,
    storeId: input.storeId,
    supplierId: input.supplierId,
    warehouseId: input.warehouseId ?? null,
    poNumber,
    status: input.status ?? 'draft',
    expectedDate: input.expectedDate ?? null,
    notes: input.notes ?? null,
    subtotalCents: String(subtotalCents),
    totalCents: String(subtotalCents),
    createdByUid: createdByUid ?? null,
  });
  await manager.getRepository(PurchaseOrder).save(po);

  for (const item of input.items) {
    const qty = Number(item.qty);
    const unitCostCents = Math.round(Number(item.unitCostCents));
    await manager.getRepository(PurchaseOrderItem).save(manager.getRepository(PurchaseOrderItem).create({
      id: uuidv4(),
      purchaseOrderId: poId,
      variantId: item.variantId,
      orderedQty: qty.toFixed(3),
      receivedQty: '0.000',
      unitCostCents: String(unitCostCents),
      lineTotalCents: String(Math.round(qty * unitCostCents)),
      note: item.note ?? null,
    }));
  }

  return po;
}

export async function receivePurchaseOrderItems(manager: EntityManager, input: any, receivedByUid?: string | null): Promise<GoodsReceipt> {
  if (!Array.isArray(input.items) || input.items.length === 0) throw new AppError('VALIDATION_ERROR', 'Goods receipt items are required');
  const receiptId = uuidv4();
  const receipt = manager.getRepository(GoodsReceipt).create({
    id: receiptId,
    storeId: input.storeId,
    purchaseOrderId: input.purchaseOrderId ?? null,
    supplierId: input.supplierId,
    warehouseId: input.warehouseId,
    receiptNumber: input.receiptNumber ?? `GR-${Date.now()}`,
    status: 'posted',
    receivedDate: input.receivedDate ?? new Date().toISOString().slice(0, 10),
    note: input.note ?? null,
    receivedByUid: receivedByUid ?? null,
  });
  await manager.getRepository(GoodsReceipt).save(receipt);

  for (const item of input.items) {
    const qty = Number(item.receivedQty);
    if (!Number.isFinite(qty) || qty <= 0) throw new AppError('VALIDATION_ERROR', 'Invalid received quantity');
    const unitCostCents = Math.round(Number(item.unitCostCents ?? 0));

    const variant = await manager.getRepository(ProductVariant).findOneBy({ id: item.variantId });
    if (!variant) throw new AppError('NOT_FOUND', 'Variant not found');

    const beforeQty = Number(variant.stockQty);
    const afterQty = beforeQty + qty;

    await manager.getRepository(GoodsReceiptItem).save(manager.getRepository(GoodsReceiptItem).create({
      id: uuidv4(),
      goodsReceiptId: receiptId,
      purchaseOrderItemId: item.purchaseOrderItemId ?? null,
      variantId: item.variantId,
      receivedQty: qty.toFixed(3),
      unitCostCents: String(unitCostCents),
      expiryDate: item.expiryDate ?? null,
      lotNumber: item.lotNumber ?? null,
    }));

    await manager.getRepository(ProductVariant).update({ id: item.variantId }, { stockQty: Math.round(afterQty) });

    const lotId = item.lotNumber
      ? uuidv4()
      : null;

    if (lotId) {
      await manager.getRepository(InventoryLot).save(manager.getRepository(InventoryLot).create({
        id: lotId,
        storeId: input.storeId,
        variantId: item.variantId,
        warehouseId: input.warehouseId,
        goodsReceiptItemId: null,
        lotNumber: item.lotNumber,
        expiryDate: item.expiryDate ?? null,
        receivedQty: qty.toFixed(3),
        remainingQty: qty.toFixed(3),
        unitCostCents: String(unitCostCents),
      }));
    }

    await manager.getRepository(StockMovement).save(manager.getRepository(StockMovement).create({
      id: uuidv4(),
      storeId: input.storeId,
      variantId: item.variantId,
      warehouseId: input.warehouseId,
      warehouseLocationId: item.warehouseLocationId ?? null,
      lotId,
      movementType: 'goods_receipt',
      qtyDelta: qty.toFixed(3),
      beforeQty: beforeQty.toFixed(3),
      afterQty: afterQty.toFixed(3),
      unitCostCents: String(unitCostCents),
      sourceDocumentType: 'goods_receipt',
      sourceDocumentId: receiptId,
      sourceEventType: 'receipt_posted',
      metadata: item.meta ?? null,
      createdByUid: receivedByUid ?? null,
    }));

    if (item.purchaseOrderItemId) {
      const poItem = await manager.getRepository(PurchaseOrderItem).findOneBy({ id: item.purchaseOrderItemId });
      if (poItem) {
        const received = Number(poItem.receivedQty) + qty;
        await manager.getRepository(PurchaseOrderItem).update({ id: poItem.id }, { receivedQty: received.toFixed(3) });
      }
    }
  }

  if (input.purchaseOrderId) {
    const rows: PurchaseOrderItem[] = await manager.getRepository(PurchaseOrderItem).findBy({ purchaseOrderId: input.purchaseOrderId });
    const allReceived = rows.length > 0 && rows.every((r: PurchaseOrderItem) => Number(r.receivedQty) >= Number(r.orderedQty));
    const anyReceived = rows.some((r: PurchaseOrderItem) => Number(r.receivedQty) > 0);
    await manager.getRepository(PurchaseOrder).update({ id: input.purchaseOrderId }, { status: allReceived ? 'received' : anyReceived ? 'partially_received' : 'approved' });
  }

  return receipt;
}
