import { EntityManager } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { ActionContext } from '../../core/protocol';
import { AppError } from '../../core/errors';
import { InsuranceOrder } from '../../entities/InsuranceOrder';
import { InsuranceItem } from '../../entities/InsuranceItem';
import { InsuranceFile } from '../../entities/InsuranceFile';
import { InsuranceStatusEvent } from '../../entities/InsuranceStatusEvent';
import { UserProfile } from '../../entities/UserProfile';
import { MediaAsset } from '../../entities/MediaAsset';
import { Shipment } from '../../entities/Shipment';
import { normalizeListQueryInput, resolveStoreScopedId } from '../../utils/queryNormalization';

async function buildOrderDto(ctx: ActionContext, storeId: string, insuranceOrderId: string) {
  const order = await ctx.db.getRepository(InsuranceOrder).findOneBy({ id: insuranceOrderId, storeId });
  if (!order) throw new AppError('NOT_FOUND', 'Insurance order not found');
  const [customer, items, files, events, shipment] = await Promise.all([
    ctx.db.getRepository(UserProfile).findOneBy({ uid: order.uid }),
    ctx.db.getRepository(InsuranceItem).find({ where: { insuranceOrderId: order.id } }),
    ctx.db.getRepository(InsuranceFile).find({ where: { insuranceOrderId: order.id } }),
    ctx.db.getRepository(InsuranceStatusEvent).find({ where: { insuranceOrderId: order.id }, order: { createdAt: 'DESC' as any } }),
    ctx.db.getRepository(Shipment).findOneBy({ orderId: order.id }),
  ]);
  const mediaById = new Map<string, MediaAsset>();
  if (files.length) {
    const media = await ctx.db.getRepository(MediaAsset).findByIds(files.map((f: InsuranceFile) => f.mediaAssetId));
    for (const m of media) mediaById.set(m.id, m);
  }

  const totals = items.reduce((acc: { qty: number; clientContributionCents: number; companyContributionCents: number }, item: InsuranceItem) => {
    acc.qty += item.qty;
    acc.clientContributionCents += Number(item.clientContributionCents);
    acc.companyContributionCents += Number(item.companyContributionCents);
    return acc;
  }, { qty: 0, clientContributionCents: 0, companyContributionCents: 0 });

  return {
    order,
    customer,
    items,
    totals,
    status: order.status,
    statusEvents: events,
    shipment,
    attachedMedia: files.map((f: InsuranceFile) => ({ type: f.type, mediaAsset: mediaById.get(f.mediaAssetId) ?? null })),
  };
}

export async function adminInsuranceList(ctx: ActionContext, payload: any = {}) { const q = normalizeListQueryInput(payload, { defaultPageSize: 50, maxPageSize: 200 }); const storeId = resolveStoreScopedId(ctx.storeId, payload.storeId); const orders = await ctx.db.getRepository(InsuranceOrder).find({ where: { storeId }, order: { createdAt: 'DESC' as any }, take: q.limit, skip: q.offset }); return { orders }; }
export async function adminInsuranceGet(ctx: ActionContext, payload: any) { return buildOrderDto(ctx, payload.storeId, payload.insuranceOrderId); }
export async function adminInsuranceAddItem(ctx: ActionContext, payload: any) { await ctx.db.transaction(async (tx: EntityManager) => { const order = await tx.getRepository(InsuranceOrder).findOneBy({ id: payload.insuranceOrderId, storeId: payload.storeId }); if (!order) throw new AppError('NOT_FOUND', 'Insurance order not found'); if (order.quoteLocked) throw new AppError('IMPORT_BATCH_STATE_INVALID', 'Quote is locked'); await tx.getRepository(InsuranceItem).save(tx.getRepository(InsuranceItem).create({ id: uuidv4(), insuranceOrderId: order.id, name: payload.name, qty: payload.qty, clientContributionCents: String(payload.clientContributionCents), companyContributionCents: String(payload.companyContributionCents) })); }); return buildOrderDto(ctx, payload.storeId, payload.insuranceOrderId); }
export async function adminInsuranceUpdateItem(ctx: ActionContext, payload: any) { await ctx.db.transaction(async (tx: EntityManager) => { const item = await tx.getRepository(InsuranceItem).findOneBy({ id: payload.itemId }); if (!item) throw new AppError('NOT_FOUND', 'Insurance item not found'); const order = await tx.getRepository(InsuranceOrder).findOneBy({ id: item.insuranceOrderId, storeId: payload.storeId }); if (!order) throw new AppError('NOT_FOUND', 'Insurance order not found'); if (order.quoteLocked) throw new AppError('IMPORT_BATCH_STATE_INVALID', 'Quote is locked'); await tx.getRepository(InsuranceItem).update({ id: payload.itemId }, { name: payload.name ?? item.name, qty: payload.qty ?? item.qty, clientContributionCents: payload.clientContributionCents == null ? item.clientContributionCents : String(payload.clientContributionCents), companyContributionCents: payload.companyContributionCents == null ? item.companyContributionCents : String(payload.companyContributionCents) }); }); return buildOrderDto(ctx, payload.storeId, payload.insuranceOrderId); }
export async function adminInsuranceRemoveItem(ctx: ActionContext, payload: any) { await ctx.db.transaction(async (tx: EntityManager) => { const item = await tx.getRepository(InsuranceItem).findOneBy({ id: payload.itemId }); if (!item) throw new AppError('NOT_FOUND', 'Insurance item not found'); const order = await tx.getRepository(InsuranceOrder).findOneBy({ id: item.insuranceOrderId, storeId: payload.storeId }); if (!order) throw new AppError('NOT_FOUND', 'Insurance order not found'); if (order.quoteLocked) throw new AppError('IMPORT_BATCH_STATE_INVALID', 'Quote is locked'); await tx.getRepository(InsuranceItem).delete({ id: item.id }); }); return buildOrderDto(ctx, payload.storeId, payload.insuranceOrderId); }
export async function adminInsuranceLockQuote(ctx: ActionContext, payload: any) { await ctx.db.transaction(async (tx: EntityManager) => { const res = await tx.getRepository(InsuranceOrder).update({ id: payload.insuranceOrderId, storeId: payload.storeId }, { quoteLocked: true, status: 'quoteLocked' }); if (!res.affected) throw new AppError('NOT_FOUND', 'Insurance order not found'); await tx.getRepository(InsuranceStatusEvent).save(tx.getRepository(InsuranceStatusEvent).create({ id: uuidv4(), insuranceOrderId: payload.insuranceOrderId, status: 'quoteLocked', note: payload.note ?? null, createdByUid: ctx.uid! })); }); return buildOrderDto(ctx, payload.storeId, payload.insuranceOrderId); }
export async function adminInsuranceSendQuote(ctx: ActionContext, payload: any) { await ctx.db.transaction(async (tx: EntityManager) => { const res = await tx.getRepository(InsuranceOrder).update({ id: payload.insuranceOrderId, storeId: payload.storeId }, { status: 'quoteSent' }); if (!res.affected) throw new AppError('NOT_FOUND', 'Insurance order not found'); await tx.getRepository(InsuranceStatusEvent).save(tx.getRepository(InsuranceStatusEvent).create({ id: uuidv4(), insuranceOrderId: payload.insuranceOrderId, status: 'quoteSent', note: payload.note ?? null, createdByUid: ctx.uid! })); }); return buildOrderDto(ctx, payload.storeId, payload.insuranceOrderId); }
export async function adminInsuranceSetShipmentTracking(ctx: ActionContext, payload: any) { await ctx.db.transaction(async (tx: EntityManager) => { const order = await tx.getRepository(InsuranceOrder).findOneBy({ id: payload.insuranceOrderId, storeId: payload.storeId }); if (!order) throw new AppError('NOT_FOUND', 'Insurance order not found'); const existing = await tx.getRepository(Shipment).findOneBy({ orderId: order.id }); if (existing) await tx.getRepository(Shipment).update({ id: existing.id }, { carrier: payload.carrier, trackingNumber: payload.trackingNumber, status: payload.status ?? existing.status }); else await tx.getRepository(Shipment).save(tx.getRepository(Shipment).create({ id: uuidv4(), orderId: order.id, carrier: payload.carrier, trackingNumber: payload.trackingNumber, status: payload.status ?? 'in_transit' })); await tx.getRepository(InsuranceOrder).update({ id: order.id }, { status: 'shipped' }); await tx.getRepository(InsuranceStatusEvent).save(tx.getRepository(InsuranceStatusEvent).create({ id: uuidv4(), insuranceOrderId: order.id, status: 'shipped', note: payload.note ?? null, createdByUid: ctx.uid! })); }); return buildOrderDto(ctx, payload.storeId, payload.insuranceOrderId); }
