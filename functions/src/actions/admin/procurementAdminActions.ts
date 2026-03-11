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
import { createPurchaseOrderWithItems, receivePurchaseOrderItems } from '../../core/inventory/procurement';

async function ensurePo(ctx: ActionContext, id: string): Promise<PurchaseOrder> {
  const po = await ctx.db.getRepository(PurchaseOrder).findOneBy({ id });
  if (!po) throw new AppError('NOT_FOUND', 'Purchase order not found');
  return po;
}

export async function adminSuppliersList(ctx: ActionContext, payload: any = {}) {
  return { items: await ctx.db.getRepository(Supplier).find({ where: { storeId: payload.storeId }, order: { createdAt: 'DESC' as any } }) };
}
export async function adminSuppliersCreate(ctx: ActionContext, payload: any) {
  const id = uuidv4();
  await ctx.db.transaction(async (tx: EntityManager) => {
    await tx.getRepository(Supplier).save(tx.getRepository(Supplier).create({ id, storeId: payload.storeId ?? null, name: payload.name, legalName: payload.legalName ?? null, code: payload.code ?? null, status: 'active', notes: payload.notes ?? null, metadata: payload.metadata ?? null }));
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
  return { items: await ctx.db.getRepository(Warehouse).find({ where: { storeId: payload.storeId }, order: { createdAt: 'DESC' as any } }) };
}
export async function adminWarehousesCreate(ctx: ActionContext, payload: any) {
  const id = uuidv4();
  await ctx.db.transaction(async (tx: EntityManager) => {
    await tx.getRepository(Warehouse).save(tx.getRepository(Warehouse).create({ id, storeId: payload.storeId, name: payload.name, code: payload.code ?? null, address: payload.address ?? null, isActive: payload.isActive ?? true, isDefault: payload.isDefault ?? false }));
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
  return { items: await ctx.db.getRepository(PurchaseOrder).find({ where: { storeId: payload.storeId }, order: { createdAt: 'DESC' as any } }) };
}
export async function adminPurchaseOrdersGet(ctx: ActionContext, payload: any) {
  const po = await ensurePo(ctx, payload.id);
  const items = await ctx.db.getRepository(PurchaseOrderItem).find({ where: { purchaseOrderId: po.id } });
  return { purchaseOrder: po, items };
}
export async function adminPurchaseOrdersCreate(ctx: ActionContext, payload: any) {
  let createdId: string | null = null;
  await ctx.db.transaction(async (tx: EntityManager) => {
    const po = await createPurchaseOrderWithItems(tx, payload, ctx.uid ?? null);
    createdId = po.id;
  });
  return adminPurchaseOrdersGet(ctx, { id: createdId });
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
  let receiptId: string | null = null;
  await ctx.db.transaction(async (tx: EntityManager) => {
    const po = await tx.getRepository(PurchaseOrder).findOneBy({ id: payload.purchaseOrderId });
    if (!po) throw new AppError('NOT_FOUND', 'Purchase order not found');
    const receipt = await receivePurchaseOrderItems(tx, { ...payload, storeId: po.storeId, supplierId: po.supplierId, warehouseId: payload.warehouseId ?? po.warehouseId, purchaseOrderId: po.id }, ctx.uid ?? null);
    receiptId = receipt.id;
  });
  const receipt = await ctx.db.getRepository(GoodsReceipt).findOneByOrFail({ id: receiptId! });
  const items = await ctx.db.getRepository(GoodsReceiptItem).find({ where: { goodsReceiptId: receipt.id } });
  return { receipt, items };
}
