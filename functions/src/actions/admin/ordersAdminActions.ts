import { EntityManager } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { ActionContext } from '../../core/protocol';
import { AppError } from '../../core/errors';
import { Order } from '../../entities/Order';
import { OrderStatusEvent } from '../../entities/OrderStatusEvent';
import { Shipment } from '../../entities/Shipment';
import { TrackingEvent } from '../../entities/TrackingEvent';
import { InsuranceOrder } from '../../entities/InsuranceOrder';
import { InsuranceItem } from '../../entities/InsuranceItem';
import { InsuranceStatusEvent } from '../../entities/InsuranceStatusEvent';
import { RiskRule } from '../../entities/RiskRule';
import { RiskFlag } from '../../entities/RiskFlag';
import { Branch } from '../../entities/Branch';
import { Device } from '../../entities/Device';
import { Employee } from '../../entities/Employee';
import { Drawer } from '../../entities/Drawer';
import { DrawerSession } from '../../entities/DrawerSession';
import { LedgerEntry } from '../../entities/LedgerEntry';
import { Return } from '../../entities/Return';
import { Refund } from '../../entities/Refund';
import { DeliveryZone } from '../../entities/DeliveryZone';
import { normalizeListQueryInput, resolveStoreScopedId } from '../../utils/queryNormalization';
import { recomputeProductMetrics } from '../productMetrics';
import { tryPostBusinessEvent } from '../../core/accounting/postingIntegration';
import { normalizeTableQuery, sanitizeSort, buildGroupedSummary } from './reporting/tableQuery';
import { buildCanonicalOrderStatusSql, buildOperationalOrderWhereSql, canonicalOrderStatus, toOrderReadModel } from '../../core/orderStatus';

async function byId(ctx:ActionContext,e:any,id:string,m:string){const r=await ctx.db.getRepository(e).findOneBy({id}); if(!r) throw new AppError('NOT_FOUND',m); return r;}
const crud=(e:any,m:string)=>({list:async(ctx:ActionContext,p:any)=>({items:await ctx.db.getRepository(e).find({where:{storeId:p.storeId}})}),get:async(ctx:ActionContext,p:any)=>({item:await byId(ctx,e,p.id,m)}),create:async(ctx:ActionContext,p:any)=>{const id=uuidv4();await ctx.db.transaction(async(tx:EntityManager)=>{await tx.getRepository(e).save(tx.getRepository(e).create({id,...p}));});return {item:await ctx.db.getRepository(e).findOneByOrFail({id})};},update:async(ctx:ActionContext,p:any)=>{await ctx.db.transaction(async(tx:EntityManager)=>{const r=await tx.getRepository(e).update({id:p.id},p);if(!r.affected) throw new AppError('NOT_FOUND',m);});return {item:await ctx.db.getRepository(e).findOneByOrFail({id:p.id})};},disable:async(ctx:ActionContext,p:any)=>{await ctx.db.transaction(async(tx:EntityManager)=>{const r=await tx.getRepository(e).update({id:p.id},{status:'disabled'});if(!r.affected) throw new AppError('NOT_FOUND',m);});return {disabled:true};}});

function resolveOrderId(payload: any) {
  const value = payload?.orderId ?? payload?.id;
  if (!value) throw new AppError('VALIDATION_FAILED', 'orderId is required');
  return String(value);
}

function resolveTrackingEventId(payload: any) {
  const value = payload?.eventId ?? payload?.id;
  if (!value) throw new AppError('VALIDATION_FAILED', 'eventId is required');
  return String(value);
}

function toCents(value: any) {
  const parsed = Number(value || 0);
  if (!Number.isFinite(parsed)) return 0;
  return Math.round(parsed * 100);
}

function normalizeAdminOrderStatus(status: any, paymentStatus?: any) {
  return canonicalOrderStatus(String(status || 'pending'), paymentStatus);
}

function orderListSortSql(by: string) {
  const map: Record<string, string> = {
    createdAt: 'o.createdAt',
    status: 'o.status',
    total: 'o.totalCents',
    customerName: 'o.shippingRecipientName',
    serviceType: 'o.serviceType',
    branchId: 'o.branchId',
  };
  return map[by] || map.createdAt;
}

async function getOrderByStore(ctx: ActionContext, storeId: string, orderId: string) {
  const order = await ctx.db.getRepository(Order).findOneBy({ id: orderId, storeId });
  if (!order) throw new AppError('NOT_FOUND', 'Order not found');
  return order;
}

async function getShipmentByStore(ctx: ActionContext, storeId: string, shipmentId: string) {
  const rows = await ctx.db.query(
    `SELECT s.* FROM shipments s
     JOIN orders o ON o.id = s.orderId
     WHERE s.id = ? AND o.storeId = ?
     LIMIT 1`,
    [shipmentId, storeId],
  );
  const shipment = rows[0] ?? null;
  if (!shipment) throw new AppError('NOT_FOUND', 'Shipment not found');
  return shipment;
}

async function getTrackingEventByStore(ctx: ActionContext, storeId: string, eventId: string) {
  const rows = await ctx.db.query(
    `SELECT te.*, s.orderId
     FROM tracking_events te
     JOIN shipments s ON s.id = te.shipmentId
     JOIN orders o ON o.id = s.orderId
     WHERE te.id = ? AND o.storeId = ?
     LIMIT 1`,
    [eventId, storeId],
  );
  const event = rows[0] ?? null;
  if (!event) throw new AppError('NOT_FOUND', 'Tracking event not found');
  return event;
}

async function getReturnByStore(ctx: ActionContext, storeId: string, returnId: string) {
  const ret = await ctx.db.getRepository(Return).findOneBy({ id: returnId, storeId });
  if (!ret) throw new AppError('NOT_FOUND', 'Return not found');
  return ret;
}

async function buildOrderDetails(ctx: ActionContext, storeId: string, orderId: string) {
  const order = await getOrderByStore(ctx, storeId, orderId);
  const shipment = await ctx.db.getRepository(Shipment).findOneBy({ orderId: order.id });
  const readModel = toOrderReadModel(order);
  return {
    order: {
      ...readModel,
      customerName: order.shippingRecipientName || null,
      customerPhone: order.shippingPhone || null,
      address: order.shippingAddressLine || null,
      total: Number(order.totalCents || 0) / 100,
      subtotal: Number(order.subtotalCents || 0) / 100,
      shipping: Number(order.shippingCents || 0) / 100,
      discount: Number(order.discountCents || 0) / 100,
      tax: Number(order.taxCents || 0) / 100,
      trackingNumber: shipment?.trackingNumber || null,
      shipmentId: shipment?.id || null,
    },
  };
}

export async function adminOrdersList(ctx:ActionContext,p:any={}) {
  const q = normalizeTableQuery(p, { sortBy: 'createdAt', sortDir: 'desc', pageSize: 50 }, { fallbackStoreId: ctx.storeId });
  const safeSort = sanitizeSort(q.sort, ['createdAt', 'status', 'total', 'customerName', 'serviceType', 'branchId'], { by: 'createdAt', dir: 'desc' });
  const filters = q.filters || {};
  const where = ['o.storeId=?', 'o.createdAt BETWEEN ? AND ?'];
  const params: any[] = [q.storeId, q.range.from, q.range.to];
  const canonicalStatusSql = buildCanonicalOrderStatusSql('o');

  if (filters.status && String(filters.status).toLowerCase() !== 'all') {
    where.push(`${canonicalStatusSql} = ?`);
    params.push(normalizeAdminOrderStatus(filters.status));
  } else {
    where.push(buildOperationalOrderWhereSql('o'));
  }
  if (filters.paymentStatus && String(filters.paymentStatus).toLowerCase() !== 'all') {
    where.push('LOWER(COALESCE(o.paymentStatus, \'\')) = ?');
    params.push(String(filters.paymentStatus).toLowerCase());
  }
  if (filters.customer) {
    where.push('(LOWER(COALESCE(o.shippingRecipientName,\'\')) LIKE ? OR LOWER(COALESCE(o.shippingPhone,\'\')) LIKE ? OR LOWER(o.id) LIKE ?)');
    const needle = `%${String(filters.customer).toLowerCase()}%`;
    params.push(needle, needle, needle);
  }
  if (filters.serviceType) { where.push('o.serviceType = ?'); params.push(String(filters.serviceType)); }
  if (filters.branchId) { where.push('o.branchId = ?'); params.push(String(filters.branchId)); }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const totalRows = await ctx.db.query(`SELECT COUNT(*) total FROM orders o ${whereSql}`, params);
  const total = Number(totalRows[0]?.total ?? 0);
  const limit = q.fetchAll ? 10000 : q.pageSize;
  const offset = q.fetchAll ? 0 : (q.page - 1) * q.pageSize;
  const items = await ctx.db.query(
    `SELECT
       o.*,
       ${canonicalStatusSql} AS canonicalStatus,
       o.shippingRecipientName customerName,
       o.shippingPhone customerPhone,
       o.shippingAddressLine address,
       ROUND(o.totalCents / 100, 2) total
     FROM orders o
     ${whereSql}
     ORDER BY ${orderListSortSql(safeSort.by)} ${safeSort.dir === 'asc' ? 'ASC' : 'DESC'}
     LIMIT ? OFFSET ?`,
    [...params, limit, offset],
  );
  const grouped = await buildGroupedSummary(
    ctx.db,
    q,
    ['status', 'serviceType', 'branchId'],
    { status: canonicalStatusSql, serviceType: 'o.serviceType', branchId: 'COALESCE(o.branchId,\'(none)\')' },
    `FROM orders o ${whereSql}`,
    params,
  );
  return {
    items: items.map((item: any) => ({
      ...toOrderReadModel(item),
      total: Number(item.total),
    })),
    pageInfo: { page: q.fetchAll ? 1 : q.page, pageSize: q.fetchAll ? total : q.pageSize, total },
    grouped,
    capabilities: { canEdit: true, canDelete: false },
  };
}

export async function adminOrdersGet(ctx:ActionContext,p:any){
  const storeId = resolveStoreScopedId(ctx.storeId, p.storeId);
  return buildOrderDetails(ctx, storeId, resolveOrderId(p));
}

export async function adminOrdersCreate(ctx: ActionContext, p: any) {
  const storeId = resolveStoreScopedId(ctx.storeId, p.storeId);
  const orderId = uuidv4();
  const zoneId = p.zoneId ? String(p.zoneId) : null;
  const zone = zoneId ? await ctx.db.getRepository(DeliveryZone).findOneBy({ id: zoneId, storeId }) : null;
  const subtotalCents = toCents(p.total);
  const shippingCents = zone ? Number(zone.priceCents || 0) : 0;
  const totalCents = subtotalCents + shippingCents;

  const nextStatus = normalizeAdminOrderStatus(p.status || 'pending', p.paymentStatus || 'pending');
  await ctx.db.transaction(async (tx: EntityManager) => {
    await tx.getRepository(Order).save(tx.getRepository(Order).create({
      id: orderId,
      storeId,
      uid: String(p.uid || `admin_manual:${orderId}`),
      channel: 'admin',
      status: nextStatus,
      serviceType: p.serviceType || 'delivery',
      branchId: p.branchId || null,
      tableId: null,
      dineInSessionId: null,
      deliveryZoneId: zone?.id || zoneId,
      deliveryZoneName: zone?.name || p.zoneName || null,
      shippingMethodId: null,
      shippingRecipientName: p.customerName || null,
      shippingPhone: p.customerPhone || null,
      shippingAddressLabel: p.toCity || p.city || null,
      shippingAddressLine: p.addressLine || p.address || null,
      subtotalCents: String(subtotalCents),
      discountCents: '0',
      shippingCents: String(shippingCents),
      taxCents: '0',
      totalCents: String(totalCents),
      paymentStatus: p.paymentStatus || 'pending',
      riskStatus: 'clear',
    }));
    await tx.getRepository(OrderStatusEvent).save(tx.getRepository(OrderStatusEvent).create({
      id: uuidv4(),
      orderId,
      status: nextStatus,
      note: p.note || 'Created from admin dispatch workspace',
      createdByUid: ctx.uid!,
    }));
    if (p.trackingNumber || p.courierId || p.status === 'out_for_delivery') {
      await tx.getRepository(Shipment).save(tx.getRepository(Shipment).create({
        id: uuidv4(),
        orderId,
        carrier: p.courierId || p.carrier || null,
        trackingNumber: p.trackingNumber || null,
        status: p.shipmentStatus || (p.status === 'out_for_delivery' ? 'out_for_delivery' : 'pending'),
      }));
    }
  });

  return adminOrdersGet(ctx, { storeId, orderId });
}

export async function adminOrdersUpdateStatus(ctx:ActionContext,p:any){
  const storeId = resolveStoreScopedId(ctx.storeId, p.storeId);
  const orderId = resolveOrderId(p);
  const nextStatus = normalizeAdminOrderStatus(p.status);
  await ctx.db.transaction(async(tx:EntityManager)=>{
    const r=await tx.getRepository(Order).update({id:orderId, storeId},{status:nextStatus});
    if(!r.affected) throw new AppError('NOT_FOUND','Order not found');
    await tx.getRepository(OrderStatusEvent).save(tx.getRepository(OrderStatusEvent).create({id:uuidv4(),orderId,status:nextStatus,note:p.note??null,createdByUid:ctx.uid!}));
    const rows=await tx.getRepository(Order).query('SELECT DISTINCT productId FROM order_items WHERE orderId=?',[orderId]);
    for(const row of rows){if(typeof row?.productId==='string'&&row.productId) await recomputeProductMetrics(tx,row.productId,storeId);}
  });
  return adminOrdersGet(ctx,{storeId,orderId});
}

export async function adminOrdersSetTracking(ctx:ActionContext,p:any){
  const storeId = resolveStoreScopedId(ctx.storeId, p.storeId);
  const orderId = resolveOrderId(p);
  await ctx.db.transaction(async(tx:EntityManager)=>{
    await getOrderByStore({ ...ctx, db: tx as any } as ActionContext, storeId, orderId);
    let s=await tx.getRepository(Shipment).findOneBy({orderId});
    if(!s){
      s=tx.getRepository(Shipment).create({
        id:uuidv4(),
        orderId,
        carrier:p.carrier||p.courierId||null,
        trackingNumber:p.trackingNumber||null,
        status:p.status||'in_transit',
      });
      await tx.getRepository(Shipment).save(s);
    } else {
      await tx.getRepository(Shipment).update({id:s.id},{
        carrier:p.carrier||p.courierId||s.carrier,
        trackingNumber:p.trackingNumber??s.trackingNumber,
        status:p.status||s.status
      });
    }
  });
  return adminOrdersTrackingGet(ctx,{storeId,orderId});
}

export async function adminOrdersAddInternalNote(ctx:ActionContext,p:any){
  const storeId = resolveStoreScopedId(ctx.storeId, p.storeId);
  const orderId = resolveOrderId(p);
  await getOrderByStore(ctx, storeId, orderId);
  await ctx.db.transaction(async(tx:EntityManager)=>{await tx.getRepository(OrderStatusEvent).save(tx.getRepository(OrderStatusEvent).create({id:uuidv4(),orderId,status:'note',note:p.note,createdByUid:ctx.uid!}));});
  return {added:true};
}

export async function adminOrdersInvoiceUrl(_ctx:ActionContext,p:any){
  const storeId = resolveStoreScopedId(_ctx.storeId, p.storeId);
  const orderId = resolveOrderId(p);
  const url = `gs://invoices/${storeId}/${orderId}.pdf`;
  return {invoiceUrl:url,url};
}

export async function adminOrdersTrackingGet(ctx:ActionContext,p:any){
  const storeId = resolveStoreScopedId(ctx.storeId, p.storeId);
  const orderId = resolveOrderId(p);
  await getOrderByStore(ctx, storeId, orderId);
  const s=await ctx.db.getRepository(Shipment).findOneBy({orderId});
  if(!s) return {shipment:null,events:[]};
  const ev=await ctx.db.getRepository(TrackingEvent).find({where:{shipmentId:s.id},order:{createdAt:'ASC' as any}});
  return {shipment:s,events:ev.map((item: TrackingEvent)=>({ ...item, label: item.message }))};
}

export async function adminOrdersTrackingAddEvent(ctx:ActionContext,p:any){
  const storeId = resolveStoreScopedId(ctx.storeId, p.storeId);
  const orderId = resolveOrderId(p);
  const tracking = await adminOrdersTrackingGet(ctx, { storeId, orderId });
  let shipmentId = p.shipmentId || tracking.shipment?.id || null;
  if (!shipmentId) {
    await ctx.db.transaction(async(tx:EntityManager)=>{
      const shipment = tx.getRepository(Shipment).create({ id: uuidv4(), orderId, carrier: null, trackingNumber: null, status: 'pending' });
      await tx.getRepository(Shipment).save(shipment);
      shipmentId = shipment.id;
    });
  }
  await ctx.db.transaction(async(tx:EntityManager)=>{await tx.getRepository(TrackingEvent).save(tx.getRepository(TrackingEvent).create({id:uuidv4(),shipmentId,message:p.message||p.label,location:p.location??null}));});
  return adminOrdersTrackingGet(ctx,{storeId,orderId});
}

export async function adminOrdersTrackingDeleteEvent(ctx:ActionContext,p:any){
  const storeId = resolveStoreScopedId(ctx.storeId, p.storeId);
  const eventId = resolveTrackingEventId(p);
  const event = await getTrackingEventByStore(ctx, storeId, eventId);
  await ctx.db.transaction(async(tx:EntityManager)=>{await tx.getRepository(TrackingEvent).delete({id:eventId});});
  if (p.orderId || p.id) return adminOrdersTrackingGet(ctx,{storeId,orderId:p.orderId ?? p.id});
  return adminOrdersTrackingGet(ctx, { storeId, orderId: event.orderId });
}

export async function adminOrdersTrackingUpdateShipment(ctx:ActionContext,p:any){
  const storeId = resolveStoreScopedId(ctx.storeId, p.storeId);
  const orderId = p.orderId || p.id || null;
  let shipmentId = p.shipmentId || null;
  let resolvedOrderId = orderId ? String(orderId) : null;
  if (resolvedOrderId) {
    await getOrderByStore(ctx, storeId, resolvedOrderId);
  }
  if (!shipmentId && orderId) {
    const shipment = await ctx.db.getRepository(Shipment).findOneBy({ orderId: String(orderId) });
    shipmentId = shipment?.id || null;
  }
  if (!shipmentId) throw new AppError('VALIDATION_FAILED', 'shipmentId is required');
  const shipment = await getShipmentByStore(ctx, storeId, String(shipmentId));
  if (resolvedOrderId && shipment.orderId !== resolvedOrderId) {
    throw new AppError('NOT_FOUND', 'Shipment not found');
  }
  resolvedOrderId = resolvedOrderId || String(shipment.orderId);
  await ctx.db.transaction(async(tx:EntityManager)=>{await tx.getRepository(Shipment).update({id:shipmentId},{status:p.status,carrier:p.carrier ?? p.courierId,trackingNumber:p.trackingNumber});});
  return adminOrdersTrackingGet(ctx,{storeId,orderId:resolvedOrderId});
}

export async function adminInsuranceList(ctx:ActionContext,p:any){return {orders:await ctx.db.getRepository(InsuranceOrder).find({where:{storeId:p.storeId},order:{createdAt:'DESC' as any}})};}
export async function adminInsuranceGet(ctx:ActionContext,p:any){const o=await byId(ctx,InsuranceOrder,p.insuranceOrderId,'Insurance order not found'); const items=await ctx.db.getRepository(InsuranceItem).find({where:{insuranceOrderId:o.id}}); return {insuranceOrder:o,items};}
export async function adminInsuranceAddItem(ctx:ActionContext,p:any){await ctx.db.transaction(async(tx:EntityManager)=>{await tx.getRepository(InsuranceItem).save(tx.getRepository(InsuranceItem).create({id:uuidv4(),...p}));}); return adminInsuranceGet(ctx,{insuranceOrderId:p.insuranceOrderId});}
export async function adminInsuranceUpdateItem(ctx:ActionContext,p:any){await ctx.db.transaction(async(tx:EntityManager)=>{await tx.getRepository(InsuranceItem).update({id:p.id},p);}); return adminInsuranceGet(ctx,{insuranceOrderId:p.insuranceOrderId});}
export async function adminInsuranceRemoveItem(_ctx:ActionContext,p:any){await _ctx.db.transaction(async(tx:EntityManager)=>{await tx.getRepository(InsuranceItem).delete({id:p.id});}); return {deleted:true};}
export async function adminInsuranceLockQuote(ctx:ActionContext,p:any){await ctx.db.transaction(async(tx:EntityManager)=>{await tx.getRepository(InsuranceOrder).update({id:p.insuranceOrderId},{quoteLocked:true,deliveryCentsX2Applied:true,status:'quoted'});await tx.getRepository(InsuranceStatusEvent).save(tx.getRepository(InsuranceStatusEvent).create({id:uuidv4(),insuranceOrderId:p.insuranceOrderId,status:'quoted',note:'locked quote',createdByUid:ctx.uid!}));}); return adminInsuranceGet(ctx,{insuranceOrderId:p.insuranceOrderId});}
export async function adminInsuranceSendQuote(ctx:ActionContext,p:any){await ctx.db.transaction(async(tx:EntityManager)=>{await tx.getRepository(InsuranceOrder).update({id:p.insuranceOrderId},{status:'quoted'});}); return adminInsuranceGet(ctx,{insuranceOrderId:p.insuranceOrderId});}
export async function adminInsuranceSetShipmentTracking(_ctx:ActionContext,p:any){return {insuranceOrderId:p.insuranceOrderId,tracking:{carrier:p.carrier,trackingNumber:p.trackingNumber}};}

export async function adminRiskRulesGet(ctx:ActionContext,p:any){let r=await ctx.db.getRepository(RiskRule).findOneBy({storeId:p.storeId}); if(!r) r=ctx.db.getRepository(RiskRule).create({storeId:p.storeId,config:{}}); return {rules:r};}
export async function adminRiskRulesUpdate(ctx:ActionContext,p:any){await ctx.db.transaction(async(tx:EntityManager)=>{await tx.getRepository(RiskRule).upsert({storeId:p.storeId,config:p.config},['storeId']);}); return adminRiskRulesGet(ctx,p);}
export async function adminRiskFlaggedOrdersList(ctx:ActionContext,p:any={}){const q=normalizeListQueryInput(p,{defaultPageSize:100,maxPageSize:200});return {flags:await ctx.db.getRepository(RiskFlag).find({where:{status:'flagged'},take:q.limit,skip:q.offset,order:{createdAt:'DESC' as any}})};}
export async function adminRiskFlaggedOrdersResolve(ctx:ActionContext,p:any){await ctx.db.transaction(async(tx:EntityManager)=>{await tx.getRepository(RiskFlag).update({id:p.id},{status:'resolved',resolvedByUid:ctx.uid!,resolvedAt:new Date()});}); return {resolved:true};}

const b=crud(Branch,'Branch not found'); export const adminBranchesList=b.list; export const adminBranchesCreate=b.create; export const adminBranchesUpdate=b.update; export const adminBranchesDisable=b.disable;
const d=crud(Device,'Device not found'); export const adminDevicesList=d.list; export const adminDevicesCreate=d.create; export const adminDevicesUpdate=d.update; export const adminDevicesDisable=d.disable;
const e=crud(Employee,'Employee not found'); export const adminEmployeesList=e.list; export const adminEmployeesCreate=e.create; export const adminEmployeesUpdate=e.update; export const adminEmployeesDisable=e.disable;
const dr=crud(Drawer,'Drawer not found'); export const adminDrawersList=dr.list; export const adminDrawersCreate=dr.create; export const adminDrawersUpdate=dr.update; export const adminDrawersDisable=dr.disable;

export async function adminDrawerSessionsOpen(ctx:ActionContext,p:any){const id=uuidv4();await ctx.db.transaction(async(tx:EntityManager)=>{await tx.getRepository(DrawerSession).save(tx.getRepository(DrawerSession).create({id,drawerId:p.drawerId,openedByUid:ctx.uid!,openedAt:new Date(),closedByUid:null,closedAt:null,openingBalanceCents:String(p.openingBalanceCents),closingBalanceCents:null}));});return {session:await ctx.db.getRepository(DrawerSession).findOneByOrFail({id})};}
export async function adminDrawerSessionsClose(ctx:ActionContext,p:any){await ctx.db.transaction(async(tx:EntityManager)=>{const s=await tx.getRepository(DrawerSession).findOneBy({id:p.sessionId}); if(!s||s.closedAt) throw new AppError('VALIDATION_ERROR','Session not open'); await tx.getRepository(DrawerSession).update({id:s.id},{closedByUid:ctx.uid!,closedAt:new Date(),closingBalanceCents:String(p.closingBalanceCents)});});return {closed:true};}

async function ledger(ctx:ActionContext,p:any,type:string){const id=uuidv4();await ctx.db.transaction(async(tx:EntityManager)=>{await tx.getRepository(LedgerEntry).save(tx.getRepository(LedgerEntry).create({id,storeId:p.storeId,amountCents:String(p.amountCents),type,channel:p.channel||'backoffice',branchId:p.branchId??null,deviceId:p.deviceId??null,employeeId:p.employeeId??null,drawerSessionId:p.drawerSessionId??null,refType:type,refId:id}));});const entry=await ctx.db.getRepository(LedgerEntry).findOneByOrFail({id});const sourceEventType=type==='expense'?'manual_expense_created':type==='pos_sale'?'pos_sale_completed':'drawer_cash_movement';await tryPostBusinessEvent(ctx.db,{storeId:entry.storeId,sourceDocumentType:'ledger_entry',sourceDocumentId:entry.id,sourceEventType,amountCents:Number(entry.amountCents),createdByUid:ctx.uid??null,metadata:{channel:entry.channel,drawerSessionId:entry.drawerSessionId,branchId:entry.branchId,deviceId:entry.deviceId,employeeId:entry.employeeId,refType:entry.refType,refId:entry.refId}});return {entry};}
export async function adminAccountingKpis(ctx:ActionContext,p:any){const rows=await ctx.db.query('SELECT SUM(amountCents) net, COUNT(*) count FROM ledger_entries WHERE storeId=?',[p.storeId]);return {kpis:rows[0]};}
export async function adminAccountingLedger(ctx:ActionContext,p:any){return {entries:await ctx.db.getRepository(LedgerEntry).find({where:{storeId:p.storeId},order:{createdAt:'DESC' as any},take:p.limit||100})};}
export async function adminAccountingCreateExpense(ctx:ActionContext,p:any){return ledger(ctx,{...p,amountCents:-Math.abs(p.amountCents)},'expense');}
export async function adminAccountingCreateAdjustment(ctx:ActionContext,p:any){return ledger(ctx,p,'adjustment');}
export async function adminAccountingCreatePOSSale(ctx:ActionContext,p:any){return ledger(ctx,{...p,channel:'POS'},'pos_sale');}

export async function reportsOverview(ctx:ActionContext,p:any){const o=await ctx.db.query('SELECT COUNT(*) orders, SUM(totalCents) sales FROM orders WHERE storeId=?',[p.storeId]);return {overview:o[0]};}
export async function reportsTopProducts(ctx:ActionContext,p:any){const r=await ctx.db.query('SELECT productId, SUM(qty) qty FROM order_items oi JOIN orders o ON o.id=oi.orderId WHERE o.storeId=? GROUP BY productId ORDER BY qty DESC LIMIT ?',[p.storeId,p.limit||10]);return {rows:r};}
export async function reportsOrdersByStatus(ctx:ActionContext,p:any){const r=await ctx.db.query('SELECT status, COUNT(*) c FROM orders WHERE storeId=? GROUP BY status',[p.storeId]);return {rows:r};}
export async function reportsInventorySummary(ctx:ActionContext,p:any){const r=await ctx.db.query('SELECT COUNT(*) variants, SUM(stockQty) stock FROM product_variants pv JOIN products p ON p.id=pv.productId WHERE p.storeId=?',[p.storeId]);return {summary:r[0]};}
export async function reportsCustomersSummary(ctx:ActionContext,p:any){const r=await ctx.db.query('SELECT COUNT(DISTINCT uid) customers FROM orders WHERE storeId=?',[p.storeId]);return {summary:r[0]};}
export async function reportsReturnsSummary(ctx:ActionContext,p:any){const r=await ctx.db.query('SELECT COUNT(*) returnsCount FROM returns WHERE storeId=?',[p.storeId]);return {summary:r[0]};}
export async function reportsLoyaltySummary(ctx:ActionContext,p:any){const r=await ctx.db.query('SELECT SUM(pointsDelta) points FROM loyalty_transactions WHERE storeId=?',[p.storeId]);return {summary:r[0]};}
export async function reportsCashbackSummary(ctx:ActionContext,p:any){const r=await ctx.db.query('SELECT COUNT(*) offers FROM cashback_offers WHERE storeId=?',[p.storeId]);return {summary:r[0]};}

export async function adminReturnsList(ctx:ActionContext,p:any={}){const q=normalizeListQueryInput(p,{defaultPageSize:50,maxPageSize:200});const storeId=resolveStoreScopedId(ctx.storeId,p.storeId);return {returns:await ctx.db.getRepository(Return).find({where:{storeId},order:{requestedAt:'DESC' as any},take:q.limit,skip:q.offset})};}
export async function adminReturnsGet(ctx:ActionContext,p:any){const storeId=resolveStoreScopedId(ctx.storeId,p.storeId);return {return:await getReturnByStore(ctx,storeId,p.returnId)};}
export async function adminReturnsApprove(ctx:ActionContext,p:any){const storeId=resolveStoreScopedId(ctx.storeId,p.storeId);await getReturnByStore(ctx,storeId,p.returnId);await ctx.db.transaction(async(tx:EntityManager)=>{await tx.getRepository(Return).update({id:p.returnId,storeId},{status:'approved',approvedAt:new Date()});});return adminReturnsGet(ctx,{storeId,returnId:p.returnId});}
export async function adminReturnsReject(ctx:ActionContext,p:any){const storeId=resolveStoreScopedId(ctx.storeId,p.storeId);await getReturnByStore(ctx,storeId,p.returnId);await ctx.db.transaction(async(tx:EntityManager)=>{await tx.getRepository(Return).update({id:p.returnId,storeId},{status:'rejected',rejectedAt:new Date()});});return adminReturnsGet(ctx,{storeId,returnId:p.returnId});}
export async function adminReturnsRefundPartial(ctx:ActionContext,p:any){
  const storeId = resolveStoreScopedId(ctx.storeId,p.storeId);
  const requestedAmountCents = Number(p.amountCents);
  if (!Number.isFinite(requestedAmountCents) || requestedAmountCents <= 0) {
    throw new AppError('VALIDATION_FAILED', 'Refund amount must be a positive amount in cents');
  }

  let refundId = '';
  let returnStoreId = storeId;

  await ctx.db.transaction(async(tx:EntityManager)=>{
    const lockedReturns = await tx.getRepository(Return).query('SELECT id, orderId, storeId FROM returns WHERE id = ? AND storeId = ? FOR UPDATE', [p.returnId, storeId]);
    const lockedReturn = lockedReturns[0] ?? null;
    if (!lockedReturn) throw new AppError('NOT_FOUND', 'Return not found');

    const lockedOrders = await tx.getRepository(Order).query('SELECT id, totalCents FROM orders WHERE id = ? AND storeId = ? FOR UPDATE', [lockedReturn.orderId, storeId]);
    const lockedOrder = lockedOrders[0] ?? null;
    if (!lockedOrder) throw new AppError('NOT_FOUND', 'Order not found');

    const refunds = await tx.getRepository(Refund).query(
      "SELECT COALESCE(SUM(amountCents),0) AS refundedCents FROM refunds WHERE returnId = ? AND status IN ('pending', 'processing', 'completed')",
      [p.returnId],
    );
    const refundedSoFar = Number(refunds[0]?.refundedCents ?? 0);
    const maxRefundable = Number(lockedOrder.totalCents ?? 0);
    if (refundedSoFar + requestedAmountCents > maxRefundable) {
      throw new AppError('REFUND_LIMIT_EXCEEDED', 'Refund exceeds remaining refundable amount', {
        maxRefundable,
        refundedSoFar,
        requestedAmountCents,
        remainingRefundableCents: Math.max(maxRefundable - refundedSoFar, 0),
      });
    }

    refundId = uuidv4();
    returnStoreId = String(lockedReturn.storeId);
    await tx.getRepository(Refund).save(tx.getRepository(Refund).create({
      id: refundId,
      returnId: p.returnId,
      amountCents: String(Math.round(requestedAmountCents)),
      method: p.method || 'original',
      status: 'completed'
    }));
  });

  const refund = await ctx.db.getRepository(Refund).findOneByOrFail({id: refundId});
  await tryPostBusinessEvent(ctx.db,{
    storeId: returnStoreId,
    sourceDocumentType:'refund',
    sourceDocumentId:refund.id,
    sourceEventType:'refund_completed',
    amountCents:Number(refund.amountCents),
    createdByUid:ctx.uid??null,
    metadata:{returnId:refund.returnId,method:refund.method,status:refund.status}
  });
  return {refund};
}
export async function adminReturnsRefundFull(ctx:ActionContext,p:any){
  const storeId = resolveStoreScopedId(ctx.storeId,p.storeId);
  const ret = await getReturnByStore(ctx,storeId,p.returnId);
  const order = await getOrderByStore(ctx,storeId,ret.orderId);
  return adminReturnsRefundPartial(ctx,{
    storeId,
    returnId:p.returnId,
    amountCents:Number(order.totalCents),
    method:p.method||'original'
  });
}
export async function adminReturnsUpdateStatus(ctx:ActionContext,p:any){const storeId=resolveStoreScopedId(ctx.storeId,p.storeId);await getReturnByStore(ctx,storeId,p.returnId);await ctx.db.transaction(async(tx:EntityManager)=>{await tx.getRepository(Return).update({id:p.returnId,storeId},{status:p.status});});return adminReturnsGet(ctx,{storeId,returnId:p.returnId});}
