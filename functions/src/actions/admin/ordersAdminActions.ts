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
import { normalizeListQueryInput, resolveStoreScopedId } from '../../utils/queryNormalization';
import { recomputeProductMetrics } from '../productMetrics';

async function byId(ctx:ActionContext,e:any,id:string,m:string){const r=await ctx.db.getRepository(e).findOneBy({id}); if(!r) throw new AppError('NOT_FOUND',m); return r;}
const crud=(e:any,m:string)=>({list:async(ctx:ActionContext,p:any)=>({items:await ctx.db.getRepository(e).find({where:{storeId:p.storeId}})}),get:async(ctx:ActionContext,p:any)=>({item:await byId(ctx,e,p.id,m)}),create:async(ctx:ActionContext,p:any)=>{const id=uuidv4();await ctx.db.transaction(async(tx:EntityManager)=>{await tx.getRepository(e).save(tx.getRepository(e).create({id,...p}));});return {item:await ctx.db.getRepository(e).findOneByOrFail({id})};},update:async(ctx:ActionContext,p:any)=>{await ctx.db.transaction(async(tx:EntityManager)=>{const r=await tx.getRepository(e).update({id:p.id},p);if(!r.affected) throw new AppError('NOT_FOUND',m);});return {item:await ctx.db.getRepository(e).findOneByOrFail({id:p.id})};},disable:async(ctx:ActionContext,p:any)=>{await ctx.db.transaction(async(tx:EntityManager)=>{const r=await tx.getRepository(e).update({id:p.id},{status:'disabled'});if(!r.affected) throw new AppError('NOT_FOUND',m);});return {disabled:true};}});

export async function adminOrdersList(ctx:ActionContext,p:any={}){const q=normalizeListQueryInput(p,{defaultPageSize:50,maxPageSize:200});const storeId=resolveStoreScopedId(ctx.storeId,p.storeId);return {orders:await ctx.db.getRepository(Order).find({where:{storeId},order:{createdAt:'DESC' as any},take:q.limit,skip:q.offset})};}
export async function adminOrdersGet(ctx:ActionContext,p:any){return {order:await byId(ctx,Order,p.orderId,'Order not found')};}
export async function adminOrdersUpdateStatus(ctx:ActionContext,p:any){await ctx.db.transaction(async(tx:EntityManager)=>{const r=await tx.getRepository(Order).update({id:p.orderId},{status:p.status}); if(!r.affected) throw new AppError('NOT_FOUND','Order not found'); await tx.getRepository(OrderStatusEvent).save(tx.getRepository(OrderStatusEvent).create({id:uuidv4(),orderId:p.orderId,status:p.status,note:p.note??null,createdByUid:ctx.uid!})); const rows=await tx.getRepository(Order).query('SELECT DISTINCT productId FROM order_items WHERE orderId=?',[p.orderId]); for(const row of rows){if(typeof row?.productId==='string'&&row.productId) await recomputeProductMetrics(tx,row.productId);}}); return adminOrdersGet(ctx,{orderId:p.orderId});}
export async function adminOrdersSetTracking(ctx:ActionContext,p:any){await ctx.db.transaction(async(tx:EntityManager)=>{let s=await tx.getRepository(Shipment).findOneBy({orderId:p.orderId}); if(!s){s=tx.getRepository(Shipment).create({id:uuidv4(),orderId:p.orderId,carrier:p.carrier,trackingNumber:p.trackingNumber,status:'in_transit'});await tx.getRepository(Shipment).save(s);} else await tx.getRepository(Shipment).update({id:s.id},{carrier:p.carrier,trackingNumber:p.trackingNumber,status:p.status||s.status});}); return adminOrdersTrackingGet(ctx,{orderId:p.orderId});}
export async function adminOrdersAddInternalNote(ctx:ActionContext,p:any){await ctx.db.transaction(async(tx:EntityManager)=>{await tx.getRepository(OrderStatusEvent).save(tx.getRepository(OrderStatusEvent).create({id:uuidv4(),orderId:p.orderId,status:'note',note:p.note,createdByUid:ctx.uid!}));}); return {added:true};}
export async function adminOrdersInvoiceUrl(_ctx:ActionContext,p:any){return {invoiceUrl:`gs://invoices/${p.storeId}/${p.orderId}.pdf`};}
export async function adminOrdersTrackingGet(ctx:ActionContext,p:any){const s=await ctx.db.getRepository(Shipment).findOneBy({orderId:p.orderId}); if(!s) return {shipment:null,events:[]}; const ev=await ctx.db.getRepository(TrackingEvent).find({where:{shipmentId:s.id},order:{createdAt:'ASC' as any}}); return {shipment:s,events:ev};}
export async function adminOrdersTrackingAddEvent(ctx:ActionContext,p:any){await ctx.db.transaction(async(tx:EntityManager)=>{await tx.getRepository(TrackingEvent).save(tx.getRepository(TrackingEvent).create({id:uuidv4(),shipmentId:p.shipmentId,message:p.message,location:p.location??null}));}); return adminOrdersTrackingGet(ctx,{orderId:p.orderId});}
export async function adminOrdersTrackingDeleteEvent(ctx:ActionContext,p:any){await ctx.db.transaction(async(tx:EntityManager)=>{await tx.getRepository(TrackingEvent).delete({id:p.id});}); return {deleted:true};}
export async function adminOrdersTrackingUpdateShipment(ctx:ActionContext,p:any){await ctx.db.transaction(async(tx:EntityManager)=>{await tx.getRepository(Shipment).update({id:p.shipmentId},{status:p.status,carrier:p.carrier,trackingNumber:p.trackingNumber});}); return {updated:true};}

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

async function ledger(ctx:ActionContext,p:any,type:string){const id=uuidv4();await ctx.db.transaction(async(tx:EntityManager)=>{await tx.getRepository(LedgerEntry).save(tx.getRepository(LedgerEntry).create({id,storeId:p.storeId,amountCents:String(p.amountCents),type,channel:p.channel||'backoffice',branchId:p.branchId??null,deviceId:p.deviceId??null,employeeId:p.employeeId??null,drawerSessionId:p.drawerSessionId??null,refType:type,refId:id}));});return {entry:await ctx.db.getRepository(LedgerEntry).findOneByOrFail({id})};}
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
export async function adminReturnsGet(ctx:ActionContext,p:any){return {return:await byId(ctx,Return,p.returnId,'Return not found')};}
export async function adminReturnsApprove(ctx:ActionContext,p:any){await ctx.db.transaction(async(tx:EntityManager)=>{await tx.getRepository(Return).update({id:p.returnId},{status:'approved',approvedAt:new Date()});});return adminReturnsGet(ctx,{returnId:p.returnId});}
export async function adminReturnsReject(ctx:ActionContext,p:any){await ctx.db.transaction(async(tx:EntityManager)=>{await tx.getRepository(Return).update({id:p.returnId},{status:'rejected',rejectedAt:new Date()});});return adminReturnsGet(ctx,{returnId:p.returnId});}
export async function adminReturnsRefundPartial(ctx:ActionContext,p:any){const id=uuidv4();await ctx.db.transaction(async(tx:EntityManager)=>{await tx.getRepository(Refund).save(tx.getRepository(Refund).create({id,returnId:p.returnId,amountCents:String(p.amountCents),method:p.method,status:'completed'}));});return {refund:await ctx.db.getRepository(Refund).findOneByOrFail({id})};}
export async function adminReturnsRefundFull(ctx:ActionContext,p:any){const ret=await byId(ctx,Return,p.returnId,'Return not found'); const order=await byId(ctx,Order,ret.orderId,'Order not found'); return adminReturnsRefundPartial(ctx,{returnId:p.returnId,amountCents:Number(order.totalCents),method:p.method||'original'});}
export async function adminReturnsUpdateStatus(ctx:ActionContext,p:any){await ctx.db.transaction(async(tx:EntityManager)=>{await tx.getRepository(Return).update({id:p.returnId},{status:p.status});});return adminReturnsGet(ctx,{returnId:p.returnId});}
