import { EntityManager } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { ActionContext } from '../../core/protocol';
import { AppError } from '../../core/errors';
import { Cart } from '../../entities/Cart';
import { CartItem } from '../../entities/CartItem';
import { Order } from '../../entities/Order';
import { OrderItem } from '../../entities/OrderItem';
import { OrderStatusEvent } from '../../entities/OrderStatusEvent';
import { ProductVariant } from '../../entities/ProductVariant';
import { PaymentSession } from '../../entities/PaymentSession';
import { StorePaymentSetting } from '../../entities/StorePaymentSetting';
import { Shipment } from '../../entities/Shipment';
import { TrackingEvent } from '../../entities/TrackingEvent';
import { InsuranceOrder } from '../../entities/InsuranceOrder';
import { InsuranceFile } from '../../entities/InsuranceFile';
import { InsuranceStatusEvent } from '../../entities/InsuranceStatusEvent';

async function getCart(ctx: ActionContext){let c=await ctx.db.getRepository(Cart).findOneBy({uid:ctx.uid!,storeId:ctx.storeId!});if(!c){c=ctx.db.getRepository(Cart).create({id:uuidv4(),uid:ctx.uid!,storeId:ctx.storeId!,couponCode:null});await ctx.db.getRepository(Cart).save(c);}return c;}

export async function checkoutCreatePaymentSession(ctx: ActionContext){
  const setting = await ctx.db.getRepository(StorePaymentSetting).findOneBy({ storeId: ctx.storeId! });
  if (!setting) throw new AppError('CONFIG_MISSING', 'Payment provider config missing');
  const cart = await getCart(ctx);
  const items = await ctx.db.getRepository(CartItem).find({ where: { cartId: cart.id } });
  if (!items.length) throw new AppError('VALIDATION_ERROR', 'Cart is empty');
  const subtotal = items.reduce((a:number, i:CartItem) => a + Number(i.unitPriceCents) * i.qty, 0);
  const orderId = uuidv4();
  await ctx.db.transaction(async (tx: EntityManager) => {
    for (const i of items) {
      if (i.variantId) {
        const v = await tx.getRepository(ProductVariant).findOneBy({ id: i.variantId });
        if (!v || v.stockQty < i.qty) throw new AppError('OUT_OF_STOCK', 'Variant stock insufficient');
        await tx.getRepository(ProductVariant).decrement({ id: i.variantId }, 'stockQty', i.qty);
      }
    }
    await tx.getRepository(Order).save(tx.getRepository(Order).create({ id: orderId, storeId: ctx.storeId!, uid: ctx.uid!, channel: 'app', status: 'pending_payment', subtotalCents: String(subtotal), discountCents: '0', shippingCents: '0', taxCents: '0', totalCents: String(subtotal), paymentStatus: 'pending', riskStatus: 'clear' }));
    for (const i of items) await tx.getRepository(OrderItem).save(tx.getRepository(OrderItem).create({ id: uuidv4(), orderId, productId: i.productId, variantId: i.variantId, nameSnapshot: 'item', priceCents: i.unitPriceCents, qty: i.qty }));
    await tx.getRepository(OrderStatusEvent).save(tx.getRepository(OrderStatusEvent).create({ id: uuidv4(), orderId, status: 'pending_payment', note: null, createdByUid: ctx.uid! }));
    await tx.getRepository(Shipment).save(tx.getRepository(Shipment).create({ id: uuidv4(), orderId, carrier: null, trackingNumber: null, status: 'pending' }));
    await tx.getRepository(PaymentSession).save(tx.getRepository(PaymentSession).create({ id: uuidv4(), orderId, provider: setting.provider, providerSessionId: `sess_${orderId}`, status: 'created' }));
    await tx.getRepository(CartItem).delete({ cartId: cart.id });
  });
  return paymentsStatus(ctx, { orderId });
}

export async function paymentsStatus(ctx: ActionContext, payload: any){
  const rows = await ctx.db.query('SELECT ps.* FROM payment_sessions ps JOIN orders o ON o.id=ps.orderId WHERE o.uid=? AND ps.orderId=? ORDER BY ps.createdAt DESC', [ctx.uid!, payload.orderId]);
  return { sessions: rows };
}

export async function paymentsConfirm(ctx: ActionContext, payload: any){
  const session = await ctx.db.getRepository(PaymentSession).findOneBy({ providerSessionId: payload.providerSessionId });
  if (!session) throw new AppError('NOT_FOUND', 'Payment session not found');
  const order = await ctx.db.getRepository(Order).findOneBy({ id: session.orderId, uid: ctx.uid! });
  if (!order) throw new AppError('NOT_FOUND', 'Order not found');
  if (order.paymentStatus === 'paid') return { order, idempotent: true };
  await ctx.db.transaction(async (tx: EntityManager) => {
    await tx.getRepository(PaymentSession).update({ id: session.id }, { status: 'confirmed' });
    await tx.getRepository(Order).update({ id: order.id }, { paymentStatus: 'paid', status: 'placed' });
    await tx.getRepository(OrderStatusEvent).save(tx.getRepository(OrderStatusEvent).create({ id: uuidv4(), orderId: order.id, status: 'placed', note: 'payment confirmed', createdByUid: ctx.uid! }));
  });
  return { order: await ctx.db.getRepository(Order).findOneByOrFail({ id: order.id }), idempotent: false };
}

export async function ordersList(ctx: ActionContext){ return { orders: await ctx.db.getRepository(Order).find({ where: { uid: ctx.uid! }, order: { createdAt: 'DESC' as any } }) }; }
export async function ordersGet(ctx: ActionContext, p: any){ const o=await ctx.db.getRepository(Order).findOneBy({id:p.orderId,uid:ctx.uid!}); if(!o) throw new AppError('NOT_FOUND','Order not found'); const items=await ctx.db.getRepository(OrderItem).find({where:{orderId:o.id}}); return { order:o, items, riskStatus:o.riskStatus }; }
export async function ordersTracking(ctx: ActionContext, p: any){ const o=await ctx.db.getRepository(Order).findOneBy({id:p.orderId,uid:ctx.uid!}); if(!o) throw new AppError('NOT_FOUND','Order not found'); const sh=await ctx.db.getRepository(Shipment).findOneBy({orderId:o.id}); if(!sh) return { shipment:null, events:[] }; const ev=await ctx.db.getRepository(TrackingEvent).find({where:{shipmentId:sh.id},order:{createdAt:'ASC' as any}}); return { shipment:sh, events:ev }; }
export async function ordersInvoiceUrl(ctx: ActionContext, p: any){ const o=await ctx.db.getRepository(Order).findOneBy({id:p.orderId,uid:ctx.uid!}); if(!o) throw new AppError('NOT_FOUND','Order not found'); return { invoiceUrl:`gs://invoices/${o.storeId}/${o.id}.pdf` }; }
export async function ordersReorder(ctx: ActionContext, p: any){ const o=await ctx.db.getRepository(Order).findOneBy({id:p.orderId,uid:ctx.uid!}); if(!o) throw new AppError('NOT_FOUND','Order not found'); const items=await ctx.db.getRepository(OrderItem).find({where:{orderId:o.id}}); const cart=await getCart(ctx); await ctx.db.transaction(async(tx:EntityManager)=>{for(const i of items){await tx.getRepository(CartItem).save(tx.getRepository(CartItem).create({id:uuidv4(),cartId:cart.id,productId:i.productId,variantId:i.variantId,qty:i.qty,unitPriceCents:i.priceCents}));}}); return { reordered: items.length }; }

export async function insuranceCreateDraft(ctx: ActionContext){ const id=uuidv4(); await ctx.db.transaction(async(tx:EntityManager)=>{await tx.getRepository(InsuranceOrder).save(tx.getRepository(InsuranceOrder).create({id,storeId:ctx.storeId!,uid:ctx.uid!,status:'draft',quoteLocked:false,deliveryCentsX2Applied:false}));}); return { insuranceOrder: await ctx.db.getRepository(InsuranceOrder).findOneByOrFail({id}) }; }
export async function insuranceAttachFiles(ctx: ActionContext,p:any){ const o=await ctx.db.getRepository(InsuranceOrder).findOneBy({id:p.insuranceOrderId,uid:ctx.uid!}); if(!o) throw new AppError('NOT_FOUND','Insurance order not found'); await ctx.db.transaction(async(tx:EntityManager)=>{for(const f of p.files){await tx.getRepository(InsuranceFile).save(tx.getRepository(InsuranceFile).create({id:uuidv4(),insuranceOrderId:o.id,type:f.type,mediaAssetId:f.mediaAssetId}));}}); return insuranceGet(ctx,{insuranceOrderId:o.id}); }
export async function insuranceSubmit(ctx: ActionContext,p:any){ const o=await ctx.db.getRepository(InsuranceOrder).findOneBy({id:p.insuranceOrderId,uid:ctx.uid!}); if(!o||o.status!=='draft') throw new AppError('VALIDATION_ERROR','Invalid state'); await ctx.db.transaction(async(tx:EntityManager)=>{await tx.getRepository(InsuranceOrder).update({id:o.id},{status:'submitted'});await tx.getRepository(InsuranceStatusEvent).save(tx.getRepository(InsuranceStatusEvent).create({id:uuidv4(),insuranceOrderId:o.id,status:'submitted',note:null,createdByUid:ctx.uid!}));}); return insuranceGet(ctx,{insuranceOrderId:o.id}); }
export async function insuranceGet(ctx: ActionContext,p:any){ const o=await ctx.db.getRepository(InsuranceOrder).findOneBy({id:p.insuranceOrderId,uid:ctx.uid!}); if(!o) throw new AppError('NOT_FOUND','Insurance order not found'); const files=await ctx.db.getRepository(InsuranceFile).find({where:{insuranceOrderId:o.id}}); return { insuranceOrder:o, files }; }
export async function insuranceApproveQuote(ctx: ActionContext,p:any){ const o=await ctx.db.getRepository(InsuranceOrder).findOneBy({id:p.insuranceOrderId,uid:ctx.uid!}); if(!o||o.status!=='quoted') throw new AppError('VALIDATION_ERROR','Quote not available'); await ctx.db.transaction(async(tx:EntityManager)=>{await tx.getRepository(InsuranceOrder).update({id:o.id},{status:'approved'});}); return insuranceGet(ctx,{insuranceOrderId:o.id}); }
export async function insuranceRejectQuote(ctx: ActionContext,p:any){ const o=await ctx.db.getRepository(InsuranceOrder).findOneBy({id:p.insuranceOrderId,uid:ctx.uid!}); if(!o||o.status!=='quoted') throw new AppError('VALIDATION_ERROR','Quote not available'); await ctx.db.transaction(async(tx:EntityManager)=>{await tx.getRepository(InsuranceOrder).update({id:o.id},{status:'rejected'});}); return insuranceGet(ctx,{insuranceOrderId:o.id}); }
export async function insuranceListMyOrders(ctx: ActionContext){ return { orders: await ctx.db.getRepository(InsuranceOrder).find({where:{uid:ctx.uid!},order:{createdAt:'DESC' as any}}) }; }
