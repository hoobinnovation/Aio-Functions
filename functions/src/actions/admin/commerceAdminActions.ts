import { v4 as uuidv4 } from 'uuid';
import { EntityManager } from 'typeorm';
import { ActionContext } from '../../core/protocol';
import { ShippingMethod } from '../../entities/ShippingMethod';
import { Governorate } from '../../entities/Governorate';
import { DeliveryZone } from '../../entities/DeliveryZone';
import { Coupon } from '../../entities/Coupon';
import { CashbackOffer } from '../../entities/CashbackOffer';
import { TargetedDiscount } from '../../entities/TargetedDiscount';
import { Notification } from '../../entities/Notification';
import { LoyaltySetting } from '../../entities/LoyaltySetting';
import { LoyaltyTier } from '../../entities/LoyaltyTier';
import { LoyaltyTransaction } from '../../entities/LoyaltyTransaction';
import { MarketingAttributionEvent } from '../../entities/MarketingAttributionEvent';
import { PostPurchaseFlow } from '../../entities/PostPurchaseFlow';
import { PostPurchaseRun } from '../../entities/PostPurchaseRun';
import { AppError } from '../../core/errors';

async function getById(ctx: ActionContext, entity: any, id: string, msg: string){const r=await ctx.db.getRepository(entity).findOneBy({id}); if(!r) throw new AppError('NOT_FOUND',msg); return r;}
const crud=(entity:any,name:string)=>({
  list: async (ctx:ActionContext,p:any)=>({ items: await ctx.db.getRepository(entity).find({where:{storeId:p.storeId},order:{id:'DESC' as any}})}),
  get: async (ctx:ActionContext,p:any)=>({ item: await getById(ctx,entity,p.id,`${name} not found`) }),
  create: async (ctx:ActionContext,p:any)=>{const id=uuidv4();await ctx.db.transaction(async(tx:EntityManager)=>{await tx.getRepository(entity).save(tx.getRepository(entity).create({id,...p}));});return { item: await ctx.db.getRepository(entity).findOneByOrFail({id})};},
  update: async (ctx:ActionContext,p:any)=>{await ctx.db.transaction(async(tx:EntityManager)=>{const r=await tx.getRepository(entity).update({id:p.id},p);if(!r.affected) throw new AppError('NOT_FOUND',`${name} not found`);});return { item: await ctx.db.getRepository(entity).findOneByOrFail({id:p.id})};},
  disable: async (ctx:ActionContext,p:any)=>{await ctx.db.transaction(async(tx:EntityManager)=>{const r=await tx.getRepository(entity).update({id:p.id},{status:'disabled'});if(!r.affected) throw new AppError('NOT_FOUND',`${name} not found`);});return { disabled:true };},
});

const ship=crud(ShippingMethod,'Shipping method');
export const adminShippingMethodsList=ship.list; export const adminShippingMethodsGet=ship.get; export const adminShippingMethodsCreate=ship.create; export const adminShippingMethodsUpdate=ship.update; export const adminShippingMethodsDisable=ship.disable;
const zone=crud(DeliveryZone,'Delivery zone');
export async function adminDeliveryZonesList(ctx:ActionContext,p:any){const zones=await ctx.db.getRepository(DeliveryZone).find({where:{storeId:p.storeId},order:{id:'DESC' as any}});const gov=await ctx.db.getRepository(Governorate).find();return {zones,governorates:gov};}
export const adminDeliveryZonesGet=zone.get; export const adminDeliveryZonesCreate=zone.create; export const adminDeliveryZonesUpdate=zone.update; export const adminDeliveryZonesDisable=zone.disable;
const cp=crud(Coupon,'Coupon'); export const adminCouponsList=cp.list; export const adminCouponsGet=cp.get; export const adminCouponsCreate=cp.create; export const adminCouponsUpdate=cp.update; export const adminCouponsDisable=cp.disable;
const cb=crud(CashbackOffer,'Cashback'); export const adminCashbackList=cb.list; export const adminCashbackGet=cb.get; export const adminCashbackCreate=cb.create; export const adminCashbackUpdate=cb.update; export const adminCashbackDisable=cb.disable;
const d=crud(TargetedDiscount,'Discount'); export const adminDiscountsList=d.list; export const adminDiscountsGet=d.get; export const adminDiscountsCreate=d.create; export const adminDiscountsUpdate=d.update; export const adminDiscountsDisable=d.disable;
export async function adminDiscountsPreviewAudienceCount(_ctx:ActionContext,_p:any){return {estimatedAudience:1000};}

export async function adminNotificationsSend(ctx:ActionContext,p:any){const users:Array<{uid:string}>=await ctx.db.query('SELECT uid FROM user_profiles WHERE status=\'active\' LIMIT ?', [p.limit||100]);await ctx.db.transaction(async(tx:EntityManager)=>{for(const u of users){await tx.getRepository(Notification).save(tx.getRepository(Notification).create({id:uuidv4(),uid:u.uid,title:p.title,body:p.body,isRead:false}));}});return {sent:true};}
export async function adminNotificationsList(ctx:ActionContext,p:any){return {notifications:await ctx.db.query('SELECT * FROM notifications ORDER BY createdAt DESC LIMIT ?', [p.limit||100])};}

export async function adminLoyaltyGetSettings(ctx:ActionContext,p:any){let s=await ctx.db.getRepository(LoyaltySetting).findOneBy({storeId:p.storeId});if(!s)s=ctx.db.getRepository(LoyaltySetting).create({storeId:p.storeId,pointsPerCurrencyUnit:1,redeemStepPoints:100,redeemStepValueCents:'100'});return {settings:s};}
export async function adminLoyaltyUpdateSettings(ctx:ActionContext,p:any){await ctx.db.transaction(async(tx:EntityManager)=>{await tx.getRepository(LoyaltySetting).upsert({storeId:p.storeId,pointsPerCurrencyUnit:p.pointsPerCurrencyUnit,redeemStepPoints:p.redeemStepPoints,redeemStepValueCents:String(p.redeemStepValueCents)},['storeId']);});return adminLoyaltyGetSettings(ctx,p);} 
export async function adminLoyaltyAdjustUserPoints(ctx:ActionContext,p:any){await ctx.db.transaction(async(tx:EntityManager)=>{await tx.getRepository(LoyaltyTransaction).save(tx.getRepository(LoyaltyTransaction).create({id:uuidv4(),uid:p.uid,storeId:p.storeId,pointsDelta:p.pointsDelta,type:'admin_adjust'}));});return {adjusted:true};}
const tier=crud(LoyaltyTier,'Loyalty tier'); export const adminLoyaltyTiersList=tier.list; export const adminLoyaltyTiersCreate=tier.create; export const adminLoyaltyTiersUpdate=tier.update; export const adminLoyaltyTiersDisable=tier.disable;

export async function adminReportsAttributionOverview(ctx:ActionContext,p:any){const rows=await ctx.db.query('SELECT source, COUNT(*) c FROM marketing_attribution_events WHERE storeId=? GROUP BY source ORDER BY c DESC', [p.storeId]);return {overview:rows};}
export async function adminReportsTopCampaigns(ctx:ActionContext,p:any){const rows=await ctx.db.query('SELECT campaign, COUNT(*) c FROM marketing_attribution_events WHERE storeId=? GROUP BY campaign ORDER BY c DESC LIMIT ?', [p.storeId,p.limit||20]);return {campaigns:rows};}

const flow=crud(PostPurchaseFlow,'Post purchase flow'); export const adminPostPurchaseFlowsList=flow.list; export const adminPostPurchaseFlowsGet=flow.get; export const adminPostPurchaseFlowsCreate=flow.create; export const adminPostPurchaseFlowsUpdate=flow.update; export const adminPostPurchaseFlowsDisable=flow.disable;
export async function adminPostPurchaseRunsList(ctx:ActionContext,p:any){const rows=await ctx.db.getRepository(PostPurchaseRun).find({order:{createdAt:'DESC' as any},take:p.limit||50});return {runs:rows};}
