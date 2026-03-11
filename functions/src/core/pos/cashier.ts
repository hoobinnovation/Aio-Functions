import { EntityManager } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { AppError } from '../errors';
import { POSSession } from '../../entities/POSSession';
import { POSSale } from '../../entities/POSSale';
import { POSSaleItem } from '../../entities/POSSaleItem';
import { POSSalePayment } from '../../entities/POSSalePayment';
import { POSReturn } from '../../entities/POSReturn';
import { POSReturnItem } from '../../entities/POSReturnItem';
import { ProductVariant } from '../../entities/ProductVariant';
import { StockMovement } from '../../entities/StockMovement';
import { LedgerEntry } from '../../entities/LedgerEntry';
import { DrawerSession } from '../../entities/DrawerSession';
import { tryPostBusinessEvent } from '../accounting/postingIntegration';
import { DataSource } from 'typeorm';

function n(v: unknown): number { return Number(v); }

export async function openPOSSession(manager: EntityManager, payload: any, uid?: string | null): Promise<POSSession> {
  if (payload.drawerSessionId) {
    const drawerSession = await manager.getRepository(DrawerSession).findOneBy({ id: payload.drawerSessionId });
    if (!drawerSession || drawerSession.closedAt) throw new AppError('VALIDATION_ERROR', 'Drawer session must be open');
  }

  const open = await manager.getRepository(POSSession).findOneBy({ storeId: payload.storeId, deviceId: payload.deviceId ?? null, status: 'open' });
  if (open) return open;

  const session = manager.getRepository(POSSession).create({
    id: uuidv4(),
    storeId: payload.storeId,
    branchId: payload.branchId ?? null,
    deviceId: payload.deviceId ?? null,
    employeeId: payload.employeeId ?? null,
    drawerSessionId: payload.drawerSessionId ?? null,
    status: 'open',
    openingFloatCents: String(Math.round(n(payload.openingFloatCents ?? 0))),
    expectedCashCents: String(Math.round(n(payload.openingFloatCents ?? 0))),
    actualCashCents: null,
    varianceCents: null,
    note: payload.note ?? null,
    openedByUid: uid ?? null,
    closedByUid: null,
    closedAt: null,
  });
  await manager.getRepository(POSSession).save(session);
  return session;
}

export async function closePOSSession(manager: EntityManager, payload: any, uid?: string | null): Promise<POSSession> {
  const session = await manager.getRepository(POSSession).findOneBy({ id: payload.sessionId });
  if (!session || session.status !== 'open') throw new AppError('VALIDATION_ERROR', 'POS session is not open');
  const actualCashCents = Math.round(n(payload.actualCashCents));
  const varianceCents = actualCashCents - Math.round(n(session.expectedCashCents));
  await manager.getRepository(POSSession).update({ id: session.id }, {
    status: 'closed',
    actualCashCents: String(actualCashCents),
    varianceCents: String(varianceCents),
    closedByUid: uid ?? null,
    closedAt: new Date(),
    note: payload.note ?? session.note,
  });
  return manager.getRepository(POSSession).findOneByOrFail({ id: session.id });
}

export async function createAndCompletePOSSale(db: DataSource, payload: any, uid?: string | null): Promise<POSSale> {
  if (!Array.isArray(payload.items) || !payload.items.length) throw new AppError('VALIDATION_ERROR', 'Sale items are required');
  if (!Array.isArray(payload.payments) || !payload.payments.length) throw new AppError('VALIDATION_ERROR', 'Sale payments are required');

  let saleId = '';
  let saleTotal = 0;

  await db.transaction(async (manager) => {
    if (payload.posSessionId) {
      const session = await manager.getRepository(POSSession).findOneBy({ id: payload.posSessionId });
      if (!session || session.status !== 'open') throw new AppError('VALIDATION_ERROR', 'POS session must be open');
    }

    const subtotal = payload.items.reduce((a: number, i: any) => a + Math.round(n(i.unitPriceCents) * n(i.qty)), 0);
    const discount = Math.max(0, Math.round(n(payload.discountCents ?? 0)));
    const tax = Math.max(0, Math.round(n(payload.taxCents ?? 0)));
    saleTotal = subtotal - discount + tax;
    if (saleTotal < 0) throw new AppError('VALIDATION_ERROR', 'Invalid sale total');

    const paid = payload.payments.reduce((a: number, p: any) => a + Math.round(n(p.amountCents)), 0);
    if (paid !== saleTotal) throw new AppError('VALIDATION_ERROR', 'Payment total must equal sale total');

    const sale = manager.getRepository(POSSale).create({
      id: uuidv4(),
      storeId: payload.storeId,
      branchId: payload.branchId ?? null,
      deviceId: payload.deviceId ?? null,
      employeeId: payload.employeeId ?? null,
      posSessionId: payload.posSessionId ?? null,
      drawerSessionId: payload.drawerSessionId ?? null,
      customerUid: payload.customerUid ?? null,
      status: 'completed',
      subtotalCents: String(subtotal),
      discountCents: String(discount),
      taxCents: String(tax),
      totalCents: String(saleTotal),
      note: payload.note ?? null,
      externalRef: payload.externalRef ?? null,
      createdByUid: uid ?? null,
    });
    await manager.getRepository(POSSale).save(sale);
    saleId = sale.id;

    for (const i of payload.items) {
      const qty = n(i.qty);
      if (!Number.isFinite(qty) || qty <= 0) throw new AppError('VALIDATION_ERROR', 'Invalid item qty');
      const variant = await manager.getRepository(ProductVariant).findOneBy({ id: i.variantId });
      if (!variant || variant.stockQty < qty) throw new AppError('OUT_OF_STOCK', 'Variant stock insufficient');
      const beforeQty = n(variant.stockQty);
      const afterQty = beforeQty - qty;
      await manager.getRepository(ProductVariant).update({ id: i.variantId }, { stockQty: Math.round(afterQty) });

      await manager.getRepository(POSSaleItem).save(manager.getRepository(POSSaleItem).create({
        id: uuidv4(),
        posSaleId: sale.id,
        productId: i.productId,
        variantId: i.variantId,
        nameSnapshot: i.nameSnapshot ?? 'item',
        unitPriceCents: String(Math.round(n(i.unitPriceCents))),
        qty: qty.toFixed(3),
        lineTotalCents: String(Math.round(n(i.unitPriceCents) * qty)),
      }));

      await manager.getRepository(StockMovement).save(manager.getRepository(StockMovement).create({
        id: uuidv4(),
        storeId: payload.storeId,
        variantId: i.variantId,
        warehouseId: payload.warehouseId ?? null,
        warehouseLocationId: null,
        lotId: null,
        movementType: 'sale_issue',
        qtyDelta: (-qty).toFixed(3),
        beforeQty: beforeQty.toFixed(3),
        afterQty: afterQty.toFixed(3),
        unitCostCents: null,
        sourceDocumentType: 'pos_sale',
        sourceDocumentId: sale.id,
        sourceEventType: 'pos_sale_completed',
        metadata: null,
        createdByUid: uid ?? null,
      }));
    }

    for (const p of payload.payments) {
      await manager.getRepository(POSSalePayment).save(manager.getRepository(POSSalePayment).create({
        id: uuidv4(),
        posSaleId: sale.id,
        tenderType: p.tenderType,
        amountCents: String(Math.round(n(p.amountCents))),
        referenceNo: p.referenceNo ?? null,
        status: 'captured',
      }));
    }

    await manager.getRepository(LedgerEntry).save(manager.getRepository(LedgerEntry).create({
      id: uuidv4(),
      storeId: payload.storeId,
      amountCents: String(saleTotal),
      type: 'pos_sale',
      channel: 'POS',
      branchId: payload.branchId ?? null,
      deviceId: payload.deviceId ?? null,
      employeeId: payload.employeeId ?? null,
      drawerSessionId: payload.drawerSessionId ?? null,
      refType: 'pos_sale',
      refId: sale.id,
    }));

    if (payload.posSessionId) {
      const session = await manager.getRepository(POSSession).findOneBy({ id: payload.posSessionId });
      if (session) {
        const cashPaid = payload.payments
          .filter((x: any) => String(x.tenderType).toLowerCase() === 'cash')
          .reduce((a: number, x: any) => a + Math.round(n(x.amountCents)), 0);
        if (cashPaid > 0) {
          const expected = Math.round(n(session.expectedCashCents)) + cashPaid;
          await manager.getRepository(POSSession).update({ id: session.id }, { expectedCashCents: String(expected) });
        }
      }
    }
  });

  await tryPostBusinessEvent(db, {
    storeId: payload.storeId,
    sourceDocumentType: 'pos_sale',
    sourceDocumentId: saleId,
    sourceEventType: 'pos_sale_completed',
    amountCents: saleTotal,
    createdByUid: uid ?? null,
    metadata: { posSessionId: payload.posSessionId ?? null },
  });

  return db.getRepository(POSSale).findOneByOrFail({ id: saleId });
}

export async function createPOSReturn(db: DataSource, payload: any, uid?: string | null): Promise<POSReturn> {
  if (!Array.isArray(payload.items) || !payload.items.length) throw new AppError('VALIDATION_ERROR', 'Return items are required');

  let posReturnId = '';
  let refundTotal = 0;

  await db.transaction(async (manager) => {
    const sale = await manager.getRepository(POSSale).findOneBy({ id: payload.posSaleId, storeId: payload.storeId });
    if (!sale || sale.status !== 'completed') throw new AppError('VALIDATION_ERROR', 'POS sale must be completed');

    const ret = manager.getRepository(POSReturn).create({
      id: uuidv4(),
      storeId: payload.storeId,
      posSaleId: sale.id,
      posSessionId: payload.posSessionId ?? sale.posSessionId,
      drawerSessionId: payload.drawerSessionId ?? sale.drawerSessionId,
      employeeId: payload.employeeId ?? sale.employeeId,
      status: 'completed',
      totalRefundCents: '0',
      note: payload.note ?? null,
      createdByUid: uid ?? null,
    });
    await manager.getRepository(POSReturn).save(ret);
    posReturnId = ret.id;

    for (const item of payload.items) {
      const saleItem = await manager.getRepository(POSSaleItem).findOneBy({ id: item.posSaleItemId, posSaleId: sale.id });
      if (!saleItem) throw new AppError('NOT_FOUND', 'POS sale item not found');
      const qty = n(item.qty);
      const soldQty = n(saleItem.qty);
      const prevRows: Array<{ returnedQty: string | number | null }> = await manager.getRepository(POSReturnItem).query(
        `SELECT COALESCE(SUM(pri.qty),0) returnedQty FROM pos_return_items pri JOIN pos_returns pr ON pr.id=pri.posReturnId WHERE pri.posSaleItemId=? AND pr.status='completed'`,
        [saleItem.id],
      );
      const alreadyReturnedQty = n(prevRows[0]?.returnedQty ?? 0);
      if (!Number.isFinite(qty) || qty <= 0 || qty > (soldQty - alreadyReturnedQty)) throw new AppError('VALIDATION_ERROR', 'Invalid return qty');
      const unit = Math.round(n(saleItem.unitPriceCents));
      const lineRefund = Math.round(unit * qty);
      refundTotal += lineRefund;

      await manager.getRepository(POSReturnItem).save(manager.getRepository(POSReturnItem).create({
        id: uuidv4(),
        posReturnId: ret.id,
        posSaleItemId: saleItem.id,
        variantId: saleItem.variantId,
        qty: qty.toFixed(3),
        unitPriceCents: String(unit),
        lineRefundCents: String(lineRefund),
      }));

      const variant = await manager.getRepository(ProductVariant).findOneBy({ id: saleItem.variantId });
      if (!variant) throw new AppError('NOT_FOUND', 'Variant not found');
      const beforeQty = n(variant.stockQty);
      const afterQty = beforeQty + qty;
      await manager.getRepository(ProductVariant).update({ id: variant.id }, { stockQty: Math.round(afterQty) });

      await manager.getRepository(StockMovement).save(manager.getRepository(StockMovement).create({
        id: uuidv4(),
        storeId: payload.storeId,
        variantId: saleItem.variantId,
        warehouseId: payload.warehouseId ?? null,
        warehouseLocationId: null,
        lotId: null,
        movementType: 'return_in',
        qtyDelta: qty.toFixed(3),
        beforeQty: beforeQty.toFixed(3),
        afterQty: afterQty.toFixed(3),
        unitCostCents: null,
        sourceDocumentType: 'pos_return',
        sourceDocumentId: ret.id,
        sourceEventType: 'pos_return_completed',
        metadata: { posSaleId: sale.id },
        createdByUid: uid ?? null,
      }));
    }

    await manager.getRepository(POSReturn).update({ id: ret.id }, { totalRefundCents: String(refundTotal) });

    await manager.getRepository(LedgerEntry).save(manager.getRepository(LedgerEntry).create({
      id: uuidv4(),
      storeId: payload.storeId,
      amountCents: String(-Math.abs(refundTotal)),
      type: 'pos_refund',
      channel: 'POS',
      branchId: payload.branchId ?? sale.branchId ?? null,
      deviceId: payload.deviceId ?? sale.deviceId ?? null,
      employeeId: payload.employeeId ?? sale.employeeId ?? null,
      drawerSessionId: payload.drawerSessionId ?? sale.drawerSessionId ?? null,
      refType: 'pos_return',
      refId: ret.id,
    }));

    if (sale.posSessionId) {
      const session = await manager.getRepository(POSSession).findOneBy({ id: sale.posSessionId });
      if (session) {
        const expected = Math.round(n(session.expectedCashCents)) - refundTotal;
        await manager.getRepository(POSSession).update({ id: session.id }, { expectedCashCents: String(expected) });
      }
    }

    await manager.getRepository(POSSale).update({ id: sale.id }, { status: 'returned' });
  });

  await tryPostBusinessEvent(db, {
    storeId: payload.storeId,
    sourceDocumentType: 'pos_return',
    sourceDocumentId: posReturnId,
    sourceEventType: 'refund_completed',
    amountCents: refundTotal,
    createdByUid: uid ?? null,
    metadata: { posSaleId: payload.posSaleId },
  });

  return db.getRepository(POSReturn).findOneByOrFail({ id: posReturnId });
}
