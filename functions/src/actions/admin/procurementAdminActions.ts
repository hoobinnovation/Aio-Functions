import { EntityManager } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { ActionContext } from '../../core/protocol';
import { AppError } from '../../core/errors';
import { Supplier } from '../../entities/Supplier';
import { SupplierContact } from '../../entities/SupplierContact';
import { Warehouse } from '../../entities/Warehouse';
import { PurchaseOrder } from '../../entities/PurchaseOrder';
import { PurchaseOrderItem } from '../../entities/PurchaseOrderItem';
import { GoodsReceipt } from '../../entities/GoodsReceipt';
import { GoodsReceiptItem } from '../../entities/GoodsReceiptItem';
import { ProductVariant } from '../../entities/ProductVariant';
import { Product } from '../../entities/Product';
import { InventoryLot } from '../../entities/InventoryLot';
import { StockMovement } from '../../entities/StockMovement';
import { createPurchaseOrderWithItems, receivePurchaseOrderItems } from '../../core/inventory/procurement';
import { resolveStoreScopedId } from '../../utils/queryNormalization';

async function ensurePo(ctx: ActionContext, id: string, storeId?: string): Promise<PurchaseOrder> {
  const where: any = { id };
  if (storeId) where.storeId = storeId;
  const po = await ctx.db.getRepository(PurchaseOrder).findOneBy(where);
  if (!po) throw new AppError('NOT_FOUND', 'Purchase order not found');
  return po;
}

async function resolveVariantByRef(manager: EntityManager, ref: string): Promise<ProductVariant | null> {
  const normalized = String(ref || '').trim();
  if (!normalized) return null;

  return manager
    .getRepository(ProductVariant)
    .createQueryBuilder('variant')
    .where('variant.id = :ref OR variant.sku = :ref', { ref: normalized })
    .getOne();
}

async function normalizePurchaseOrderItems(manager: EntityManager, rawItems: any[]): Promise<any[]> {
  const items = Array.isArray(rawItems) ? rawItems : [];
  const normalized = [];

  for (const item of items) {
    const variantId = item.variantId || item.productRef || item.sku || null;
    const variant = await resolveVariantByRef(manager, variantId);
    if (!variant) throw new AppError('NOT_FOUND', 'Purchase order item variant not found');

    normalized.push({
      variantId: variant.id,
      qty: Number(item.qty ?? item.quantity ?? item.orderedQty ?? 0),
      unitCostCents: Math.round(Number(item.unitCostCents ?? item.unitCost ?? 0)),
      note: item.note ?? null,
    });
  }

  return normalized;
}

async function decoratePurchaseOrder(ctx: ActionContext, po: PurchaseOrder) {
  const items = await ctx.db.getRepository(PurchaseOrderItem).find({ where: { purchaseOrderId: po.id } });
  const supplier = await ctx.db.getRepository(Supplier).findOneBy({ id: po.supplierId });
  const variantIds = items.map((item: PurchaseOrderItem) => item.variantId);
  const variants = variantIds.length
    ? await ctx.db.getRepository(ProductVariant).findByIds(variantIds)
    : [];
  const products = variants.length
    ? await ctx.db
        .getRepository(Product)
        .findByIds(Array.from(new Set(variants.map((variant: ProductVariant) => variant.productId))))
    : [];

  const variantMap = new Map<string, ProductVariant>(variants.map((variant: ProductVariant) => [variant.id, variant]));
  const productMap = new Map<string, Product>(products.map((product: Product) => [product.id, product]));

  return {
    ...po,
    supplierName: supplier?.name ?? null,
    orderDate: po.expectedDate ?? null,
    items: items.map((item: PurchaseOrderItem) => {
      const variant = variantMap.get(item.variantId) || null;
      const product = variant ? productMap.get(variant.productId) || null : null;
      return {
        ...item,
        quantity: Number(item.orderedQty),
        unitCost: Number(item.unitCostCents) / 100,
        productRef: variant?.sku || variant?.id || null,
        productName: product?.name || null,
      };
    }),
  };
}

async function decorateGoodsReceipt(ctx: ActionContext, receipt: GoodsReceipt) {
  const [items, po, warehouse] = await Promise.all([
    ctx.db.getRepository(GoodsReceiptItem).find({ where: { goodsReceiptId: receipt.id } }),
    receipt.purchaseOrderId ? ctx.db.getRepository(PurchaseOrder).findOneBy({ id: receipt.purchaseOrderId }) : Promise.resolve(null),
    ctx.db.getRepository(Warehouse).findOneBy({ id: receipt.warehouseId }),
  ]);

  const variantIds = items.map((item: GoodsReceiptItem) => item.variantId);
  const variants = variantIds.length
    ? await ctx.db.getRepository(ProductVariant).findByIds(variantIds)
    : [];
  const products = variants.length
    ? await ctx.db
        .getRepository(Product)
        .findByIds(Array.from(new Set(variants.map((variant: ProductVariant) => variant.productId))))
    : [];

  const variantMap = new Map<string, ProductVariant>(variants.map((variant: ProductVariant) => [variant.id, variant]));
  const productMap = new Map<string, Product>(products.map((product: Product) => [product.id, product]));

  return {
    ...receipt,
    purchaseOrderNumber: po?.poNumber ?? null,
    receivedAt: receipt.receivedDate,
    warehouseName: warehouse?.name ?? null,
    lines: items.map((item: GoodsReceiptItem) => {
      const variant = variantMap.get(item.variantId) || null;
      const product = variant ? productMap.get(variant.productId) || null : null;
      return {
        ...item,
        productRef: variant?.sku || variant?.id || null,
        productName: product?.name || null,
        batchNo: item.lotNumber,
        unitCost: Number(item.unitCostCents) / 100,
      };
    }),
  };
}

export async function adminSuppliersList(ctx: ActionContext, payload: any = {}) {
  const storeId = resolveStoreScopedId(ctx.storeId, payload.storeId);
  return { items: await ctx.db.getRepository(Supplier).find({ where: { storeId }, order: { createdAt: 'DESC' as any } }) };
}

export async function adminSuppliersCreate(ctx: ActionContext, payload: any) {
  const storeId = resolveStoreScopedId(ctx.storeId, payload.storeId);
  const id = uuidv4();
  await ctx.db.transaction(async (tx: EntityManager) => {
    await tx.getRepository(Supplier).save(tx.getRepository(Supplier).create({ id, storeId, name: payload.name, legalName: payload.legalName ?? null, code: payload.code ?? null, status: 'active', notes: payload.notes ?? null, metadata: payload.metadata ?? null }));
    if (Array.isArray(payload.contacts)) {
      for (const c of payload.contacts) {
        await tx.getRepository(SupplierContact).save(tx.getRepository(SupplierContact).create({ id: uuidv4(), supplierId: id, fullName: c.fullName, role: c.role ?? null, email: c.email ?? null, phone: c.phone ?? null, isPrimary: !!c.isPrimary }));
      }
    }
  });
  return { supplier: await ctx.db.getRepository(Supplier).findOneByOrFail({ id }) };
}

export async function adminSuppliersUpdate(ctx: ActionContext, payload: any) {
  await ctx.db.transaction(async (tx: EntityManager) => {
    const res = await tx.getRepository(Supplier).update({ id: payload.id }, payload);
    if (!res.affected) throw new AppError('NOT_FOUND', 'Supplier not found');
  });
  return { supplier: await ctx.db.getRepository(Supplier).findOneByOrFail({ id: payload.id }) };
}

export async function adminSuppliersDisable(ctx: ActionContext, payload: any) {
  return adminSuppliersUpdate(ctx, { id: payload.id, status: 'inactive' });
}

export async function adminWarehousesList(ctx: ActionContext, payload: any) {
  const storeId = resolveStoreScopedId(ctx.storeId, payload.storeId);
  return { items: await ctx.db.getRepository(Warehouse).find({ where: { storeId }, order: { createdAt: 'DESC' as any } }) };
}

export async function adminWarehousesCreate(ctx: ActionContext, payload: any) {
  const storeId = resolveStoreScopedId(ctx.storeId, payload.storeId);
  const id = uuidv4();
  await ctx.db.transaction(async (tx: EntityManager) => {
    await tx.getRepository(Warehouse).save(tx.getRepository(Warehouse).create({ id, storeId, name: payload.name, code: payload.code ?? null, address: payload.address ?? null, isActive: payload.isActive ?? true, isDefault: payload.isDefault ?? false }));
  });
  return { warehouse: await ctx.db.getRepository(Warehouse).findOneByOrFail({ id }) };
}

export async function adminWarehousesUpdate(ctx: ActionContext, payload: any) {
  await ctx.db.transaction(async (tx: EntityManager) => {
    const res = await tx.getRepository(Warehouse).update({ id: payload.id }, payload);
    if (!res.affected) throw new AppError('NOT_FOUND', 'Warehouse not found');
  });
  return { warehouse: await ctx.db.getRepository(Warehouse).findOneByOrFail({ id: payload.id }) };
}

export async function adminWarehousesDisable(ctx: ActionContext, payload: any) {
  return adminWarehousesUpdate(ctx, { id: payload.id, isActive: false });
}

export async function adminPurchaseOrdersList(ctx: ActionContext, payload: any) {
  const storeId = resolveStoreScopedId(ctx.storeId, payload.storeId);
  const orders = await ctx.db.getRepository(PurchaseOrder).find({ where: { storeId }, order: { createdAt: 'DESC' as any } });
  const suppliers = await ctx.db.getRepository(Supplier).find({ where: { storeId } });
  const supplierMap = new Map<string, Supplier>(suppliers.map((supplier: Supplier) => [supplier.id, supplier]));

  return {
    items: orders.map((order: PurchaseOrder) => ({
      ...order,
      supplierName: supplierMap.get(order.supplierId)?.name ?? null,
      orderDate: order.expectedDate ?? null,
    })),
  };
}

export async function adminPurchaseOrdersGet(ctx: ActionContext, payload: any) {
  const po = await ensurePo(ctx, payload.id, resolveStoreScopedId(ctx.storeId, payload.storeId));
  return { purchaseOrder: await decoratePurchaseOrder(ctx, po) };
}

export async function adminPurchaseOrdersCreate(ctx: ActionContext, payload: any) {
  const storeId = resolveStoreScopedId(ctx.storeId, payload.storeId);
  let createdId: string | null = null;
  await ctx.db.transaction(async (tx: EntityManager) => {
    const po = await createPurchaseOrderWithItems(
      tx,
      {
        ...payload,
        storeId,
        expectedDate: payload.expectedDate ?? payload.orderDate ?? null,
        items: await normalizePurchaseOrderItems(tx, payload.items),
      },
      ctx.uid ?? null
    );
    createdId = po.id;
  });
  return adminPurchaseOrdersGet(ctx, { id: createdId, storeId });
}

export async function adminPurchaseOrdersUpdate(ctx: ActionContext, payload: any) {
  const storeId = resolveStoreScopedId(ctx.storeId, payload.storeId);
  const existing = await ensurePo(ctx, payload.id, storeId);
  if (existing.status !== 'draft') throw new AppError('VALIDATION_ERROR', 'Only draft purchase orders can be updated');

  await ctx.db.transaction(async (tx: EntityManager) => {
    const items = await normalizePurchaseOrderItems(tx, payload.items);
    const subtotalCents = items.reduce(function (sum, item) {
      return sum + Math.round(Number(item.qty) * Number(item.unitCostCents));
    }, 0);

    await tx.getRepository(PurchaseOrder).update(
      { id: existing.id },
      {
        supplierId: payload.supplierId ?? existing.supplierId,
        warehouseId: payload.warehouseId ?? existing.warehouseId,
        expectedDate: payload.expectedDate ?? payload.orderDate ?? existing.expectedDate ?? null,
        status: payload.status ?? existing.status,
        notes: payload.notes ?? existing.notes ?? null,
        subtotalCents: String(subtotalCents),
        totalCents: String(subtotalCents),
      }
    );

    await tx.getRepository(PurchaseOrderItem).delete({ purchaseOrderId: existing.id });

    for (const item of items) {
      await tx.getRepository(PurchaseOrderItem).save(
        tx.getRepository(PurchaseOrderItem).create({
          id: uuidv4(),
          purchaseOrderId: existing.id,
          variantId: item.variantId,
          orderedQty: Number(item.qty).toFixed(3),
          receivedQty: '0.000',
          unitCostCents: String(item.unitCostCents),
          lineTotalCents: String(Math.round(Number(item.qty) * Number(item.unitCostCents))),
          note: item.note ?? null,
        })
      );
    }
  });

  return adminPurchaseOrdersGet(ctx, { id: existing.id, storeId });
}

export async function adminPurchaseOrdersSubmit(ctx: ActionContext, payload: any) {
  await ctx.db.getRepository(PurchaseOrder).update({ id: payload.id }, { status: 'submitted' });
  return adminPurchaseOrdersGet(ctx, payload);
}

export async function adminPurchaseOrdersApprove(ctx: ActionContext, payload: any) {
  await ctx.db.getRepository(PurchaseOrder).update({ id: payload.id }, { status: 'approved' });
  return adminPurchaseOrdersGet(ctx, payload);
}

export async function adminPurchaseOrdersCancel(ctx: ActionContext, payload: any) {
  await ctx.db.getRepository(PurchaseOrder).update({ id: payload.id }, { status: 'cancelled' });
  return adminPurchaseOrdersGet(ctx, payload);
}

export async function adminPurchaseOrdersReceive(ctx: ActionContext, payload: any) {
  const storeId = resolveStoreScopedId(ctx.storeId, payload.storeId);
  let receiptId: string | null = null;
  await ctx.db.transaction(async (tx: EntityManager) => {
    const po = await tx.getRepository(PurchaseOrder).findOneBy({ id: payload.purchaseOrderId, storeId });
    if (!po) throw new AppError('NOT_FOUND', 'Purchase order not found');
    const receipt = await receivePurchaseOrderItems(tx, { ...payload, storeId: po.storeId, supplierId: po.supplierId, warehouseId: payload.warehouseId ?? po.warehouseId, purchaseOrderId: po.id }, ctx.uid ?? null);
    receiptId = receipt.id;
  });
  return adminGoodsReceiptsGet(ctx, { id: receiptId, storeId });
}

export async function adminGoodsReceiptsList(ctx: ActionContext, payload: any = {}) {
  const storeId = resolveStoreScopedId(ctx.storeId, payload.storeId);
  const receipts = await ctx.db.getRepository(GoodsReceipt).find({ where: { storeId }, order: { createdAt: 'DESC' as any } });
  const decorated = [];
  for (const receipt of receipts) {
    decorated.push(await decorateGoodsReceipt(ctx, receipt));
  }
  return { items: decorated };
}

export async function adminGoodsReceiptsGet(ctx: ActionContext, payload: any) {
  const storeId = resolveStoreScopedId(ctx.storeId, payload.storeId);
  const receipt = await ctx.db.getRepository(GoodsReceipt).findOneBy({ id: payload.id, storeId });
  if (!receipt) throw new AppError('NOT_FOUND', 'Goods receipt not found');
  return { receipt: await decorateGoodsReceipt(ctx, receipt) };
}

export async function adminGoodsReceiptsCreate(ctx: ActionContext, payload: any) {
  const storeId = resolveStoreScopedId(ctx.storeId, payload.storeId);
  const po = payload.purchaseOrderId
    ? await ctx.db.getRepository(PurchaseOrder).findOneBy({ id: payload.purchaseOrderId, storeId })
    : null;

  const poItems = po
    ? await ctx.db.getRepository(PurchaseOrderItem).find({ where: { purchaseOrderId: po.id }, order: { createdAt: 'ASC' as any } })
    : [];

  const items: Array<{
    purchaseOrderItemId: string | null;
    variantId: string;
    receivedQty: number;
    unitCostCents: number;
    expiryDate: string | null;
    lotNumber: string | null;
    warehouseLocationId: string | null;
  }> = [];
  const lines = Array.isArray(payload.items) ? payload.items : Array.isArray(payload.lines) ? payload.lines : [];

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index] || {};
    const poItem = poItems[index] || null;
    const variant =
      (line.variantId || line.productRef)
        ? await resolveVariantByRef(ctx.db.getRepository(ProductVariant).manager as EntityManager, line.variantId || line.productRef)
        : poItem
        ? await ctx.db.getRepository(ProductVariant).findOneBy({ id: poItem.variantId })
        : null;

    if (!variant) throw new AppError('NOT_FOUND', 'Goods receipt line variant not found');

    items.push({
      purchaseOrderItemId: line.purchaseOrderItemId ?? poItem?.id ?? null,
      variantId: variant.id,
      receivedQty: Number(line.receivedQty ?? line.quantity ?? 0),
      unitCostCents: Math.round(Number(line.unitCostCents ?? line.unitCost ?? poItem?.unitCostCents ?? 0)),
      expiryDate: line.expiryDate ?? null,
      lotNumber: line.lotNumber ?? line.batchNo ?? null,
      warehouseLocationId: line.warehouseLocationId ?? null,
    });
  }

  let receiptId: string | null = null;
  await ctx.db.transaction(async (tx: EntityManager) => {
    const receipt = await receivePurchaseOrderItems(
      tx,
      {
        storeId,
        purchaseOrderId: po?.id ?? payload.purchaseOrderId ?? null,
        supplierId: po?.supplierId ?? payload.supplierId,
        warehouseId: payload.warehouseId ?? po?.warehouseId,
        receiptNumber: payload.receiptNumber ?? payload.reference ?? null,
        receivedDate: payload.receivedDate ?? payload.receivedAt ?? null,
        note: payload.note ?? payload.reference ?? null,
        items,
      },
      ctx.uid ?? null
    );
    receiptId = receipt.id;
  });

  return adminGoodsReceiptsGet(ctx, { id: receiptId, storeId });
}

export async function adminStockMovementsList(ctx: ActionContext, payload: any = {}) {
  const storeId = resolveStoreScopedId(ctx.storeId, payload.storeId);
  const movements = await ctx.db.getRepository(StockMovement).find({
    where: { storeId, ...(payload.movementType ? { movementType: payload.movementType } : {}) },
    order: { createdAt: 'DESC' as any },
    take: Number(payload.limit || 100),
  });

  const variantIds = movements.map((item: StockMovement) => item.variantId);
  const warehouseIds = movements.map((item: StockMovement) => item.warehouseId).filter(Boolean);
  const variants = variantIds.length ? await ctx.db.getRepository(ProductVariant).findByIds(variantIds) : [];
  const products = variants.length
    ? await ctx.db
        .getRepository(Product)
        .findByIds(Array.from(new Set(variants.map((variant: ProductVariant) => variant.productId))))
    : [];
  const warehouses = warehouseIds.length ? await ctx.db.getRepository(Warehouse).findByIds(warehouseIds as string[]) : [];

  const variantMap = new Map<string, ProductVariant>(variants.map((variant: ProductVariant) => [variant.id, variant]));
  const productMap = new Map<string, Product>(products.map((product: Product) => [product.id, product]));
  const warehouseMap = new Map<string, Warehouse>(warehouses.map((warehouse: Warehouse) => [warehouse.id, warehouse]));

  const items = movements
    .map((movement: StockMovement) => {
      const variant = variantMap.get(movement.variantId) || null;
      const product = variant ? productMap.get(variant.productId) || null : null;
      const productRef = variant?.sku || variant?.id || null;

      return {
        ...movement,
        quantity: Number(movement.qtyDelta),
        sourceType: movement.sourceDocumentType,
        sourceId: movement.sourceDocumentId,
        productRef,
        productName: product?.name || null,
        warehouseName: movement.warehouseId ? warehouseMap.get(movement.warehouseId)?.name ?? null : null,
      };
    })
    .filter((item: any) => {
      if (payload.productRef && !String(item.productRef || '').toLowerCase().includes(String(payload.productRef).toLowerCase())) return false;
      if (payload.sourceType && String(item.sourceType || '').toLowerCase() !== String(payload.sourceType).toLowerCase()) return false;
      if (payload.sourceId && String(item.sourceId || '') !== String(payload.sourceId)) return false;
      return true;
    });

  return { items };
}

export async function adminInventoryBatchesList(ctx: ActionContext, payload: any = {}) {
  const storeId = resolveStoreScopedId(ctx.storeId, payload.storeId);
  const lots = await ctx.db.getRepository(InventoryLot).find({ where: { storeId }, order: { updatedAt: 'DESC' as any } });
  const variantIds = lots.map((lot: InventoryLot) => lot.variantId);
  const warehouseIds = lots.map((lot: InventoryLot) => lot.warehouseId);
  const receiptItemIds = lots.map((lot: InventoryLot) => lot.goodsReceiptItemId).filter(Boolean);

  const [variants, products, warehouses, receiptItems, receipts] = await Promise.all([
    variantIds.length ? ctx.db.getRepository(ProductVariant).findByIds(variantIds) : Promise.resolve([] as ProductVariant[]),
    variantIds.length
      ? ctx.db
          .getRepository(Product)
          .findByIds(
            Array.from(
              new Set(
                (
                  await ctx.db.getRepository(ProductVariant).findByIds(variantIds)
                ).map((variant: ProductVariant) => variant.productId)
              )
            )
          )
      : Promise.resolve([] as Product[]),
    warehouseIds.length ? ctx.db.getRepository(Warehouse).findByIds(warehouseIds) : Promise.resolve([] as Warehouse[]),
    receiptItemIds.length ? ctx.db.getRepository(GoodsReceiptItem).findByIds(receiptItemIds as string[]) : Promise.resolve([] as GoodsReceiptItem[]),
    receiptItemIds.length
      ? ctx.db
          .getRepository(GoodsReceipt)
          .findByIds(
            Array.from(
              new Set(
                (
                  await ctx.db.getRepository(GoodsReceiptItem).findByIds(receiptItemIds as string[])
                ).map((item: GoodsReceiptItem) => item.goodsReceiptId)
              )
            )
          )
      : Promise.resolve([] as GoodsReceipt[]),
  ]);

  const variantMap = new Map<string, ProductVariant>(variants.map((variant: ProductVariant) => [variant.id, variant]));
  const productMap = new Map<string, Product>(products.map((product: Product) => [product.id, product]));
  const warehouseMap = new Map<string, Warehouse>(warehouses.map((warehouse: Warehouse) => [warehouse.id, warehouse]));
  const receiptItemMap = new Map<string, GoodsReceiptItem>(receiptItems.map((item: GoodsReceiptItem) => [item.id, item]));
  const receiptMap = new Map<string, GoodsReceipt>(receipts.map((receipt: GoodsReceipt) => [receipt.id, receipt]));

  return {
    items: lots.map((lot: InventoryLot) => {
      const variant = variantMap.get(lot.variantId) || null;
      const product = variant ? productMap.get(variant.productId) || null : null;
      const receiptItem = lot.goodsReceiptItemId ? receiptItemMap.get(lot.goodsReceiptItemId) || null : null;
      const receipt = receiptItem ? receiptMap.get(receiptItem.goodsReceiptId) || null : null;

      return {
        ...lot,
        batchNo: lot.lotNumber,
        productRef: variant?.sku || variant?.id || null,
        productName: product?.name || null,
        warehouseName: warehouseMap.get(lot.warehouseId)?.name ?? null,
        receiptNumber: receipt?.receiptNumber ?? null,
      };
    }),
  };
}

export async function adminInventoryBatchesUpdate(ctx: ActionContext, payload: any) {
  const existing = await ctx.db.getRepository(InventoryLot).findOneBy({ id: payload.id });
  if (!existing) throw new AppError('NOT_FOUND', 'Inventory batch not found');

  await ctx.db.getRepository(InventoryLot).update(
    { id: payload.id },
    {
      expiryDate: payload.expiryDate ?? existing.expiryDate,
      remainingQty: payload.remainingQty == null ? existing.remainingQty : String(Number(payload.remainingQty).toFixed(3)),
    }
  );

  return { batch: await ctx.db.getRepository(InventoryLot).findOneByOrFail({ id: payload.id }) };
}
