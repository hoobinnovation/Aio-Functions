import { EntityManager } from 'typeorm';
import { ActionContext } from '../../core/protocol';
import { AppError } from '../../core/errors';
import { POSSession } from '../../entities/POSSession';
import { POSSale } from '../../entities/POSSale';
import { POSSaleItem } from '../../entities/POSSaleItem';
import { POSSalePayment } from '../../entities/POSSalePayment';
import { POSReturn } from '../../entities/POSReturn';
import { POSReturnItem } from '../../entities/POSReturnItem';
import { openPOSSession, closePOSSession, createAndCompletePOSSale, createPOSReturn } from '../../core/pos/cashier';

export async function adminPosSessionsOpen(ctx: ActionContext, payload: any) {
  let id = '';
  await ctx.db.transaction(async (tx: EntityManager) => {
    const s = await openPOSSession(tx, payload, ctx.uid ?? null);
    id = s.id;
  });
  return { session: await ctx.db.getRepository(POSSession).findOneByOrFail({ id }) };
}

export async function adminPosSessionsClose(ctx: ActionContext, payload: any) {
  let id = '';
  await ctx.db.transaction(async (tx: EntityManager) => {
    const s = await closePOSSession(tx, payload, ctx.uid ?? null);
    id = s.id;
  });
  return { session: await ctx.db.getRepository(POSSession).findOneByOrFail({ id }) };
}

export async function adminPosSessionsList(ctx: ActionContext, payload: any) {
  return { items: await ctx.db.getRepository(POSSession).find({ where: { storeId: payload.storeId }, order: { createdAt: 'DESC' as any }, take: payload.limit ?? 100 }) };
}

export async function adminPosSalesCreate(ctx: ActionContext, payload: any) {
  const sale = await createAndCompletePOSSale(ctx.db, payload, ctx.uid ?? null);
  return adminPosSalesGet(ctx, { id: sale.id });
}

export async function adminPosSalesGet(ctx: ActionContext, payload: any) {
  const sale = await ctx.db.getRepository(POSSale).findOneBy({ id: payload.id });
  if (!sale) throw new AppError('NOT_FOUND', 'POS sale not found');
  const items = await ctx.db.getRepository(POSSaleItem).find({ where: { posSaleId: sale.id } });
  const payments = await ctx.db.getRepository(POSSalePayment).find({ where: { posSaleId: sale.id } });
  return { sale, items, payments };
}

export async function adminPosSalesList(ctx: ActionContext, payload: any) {
  return { items: await ctx.db.getRepository(POSSale).find({ where: { storeId: payload.storeId }, order: { createdAt: 'DESC' as any }, take: payload.limit ?? 100 }) };
}

export async function adminPosReturnsCreate(ctx: ActionContext, payload: any) {
  const ret = await createPOSReturn(ctx.db, payload, ctx.uid ?? null);
  return adminPosReturnsGet(ctx, { id: ret.id });
}

export async function adminPosReturnsGet(ctx: ActionContext, payload: any) {
  const ret = await ctx.db.getRepository(POSReturn).findOneBy({ id: payload.id });
  if (!ret) throw new AppError('NOT_FOUND', 'POS return not found');
  const items = await ctx.db.getRepository(POSReturnItem).find({ where: { posReturnId: ret.id } });
  return { return: ret, items };
}

export async function adminPosReturnsList(ctx: ActionContext, payload: any) {
  return { items: await ctx.db.getRepository(POSReturn).find({ where: { storeId: payload.storeId }, order: { createdAt: 'DESC' as any }, take: payload.limit ?? 100 }) };
}
