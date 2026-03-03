import { Coupon } from '../../../../../entities/Coupon';
import { CashbackOffer } from '../../../../../entities/CashbackOffer';
import { TargetedDiscount } from '../../../../../entities/TargetedDiscount';
import { MarketingAttributionEvent } from '../../../../../entities/MarketingAttributionEvent';
import { deterministicId, strNum, upsertById } from '../seederUtils';
import { SeedContext, SeedSummary } from '../types';

export async function seedPromotions(ctx: SeedContext, summary: SeedSummary) {
  const { manager, storeId, demoUids } = ctx;
  await upsertById(manager, Coupon, 'Coupon', {
    id: deterministicId('coupon', 1),
    storeId,
    code: 'DEMO10',
    discountType: 'percent',
    discountValue: strNum(10),
    startsAt: null,
    endsAt: null,
    perUserLimit: 2,
    status: 'active',
  }, summary);

  await upsertById(manager, CashbackOffer, 'CashbackOffer', {
    id: deterministicId('cashback', 1),
    storeId,
    name: 'Starter Cashback',
    percent: 5,
    rules: { minTotalCents: 1000 },
    status: 'active',
  }, summary);

  await upsertById(manager, TargetedDiscount, 'TargetedDiscount', {
    id: deterministicId('tdisc', 1),
    storeId,
    name: 'VIP Demo',
    rules: { minOrders: 1, percent: 12 },
    status: 'active',
  }, summary);

  await upsertById(manager, MarketingAttributionEvent, 'MarketingAttributionEvent', {
    id: deterministicId('mkt', 1),
    uid: demoUids.clientUid,
    storeId,
    source: 'seed',
    campaign: 'demo_campaign',
    medium: 'organic',
    term: 'demo',
    content: 'seed',
    dedupeKey: 'seed_demo_1',
  }, summary);
}
