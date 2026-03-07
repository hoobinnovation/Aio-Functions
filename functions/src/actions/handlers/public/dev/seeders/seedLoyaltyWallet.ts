import { WalletAccount } from '../../../../../entities/WalletAccount';
import { WalletTransaction } from '../../../../../entities/WalletTransaction';
import { LoyaltySetting } from '../../../../../entities/LoyaltySetting';
import { LoyaltyTier } from '../../../../../entities/LoyaltyTier';
import { LoyaltyTransaction } from '../../../../../entities/LoyaltyTransaction';
import { deterministicId, strNum, upsertById } from '../seederUtils';
import { SeedContext, SeedSummary } from '../types';

export async function seedLoyaltyWallet(ctx: SeedContext, summary: SeedSummary) {
  const { manager, storeId, demoUids } = ctx;
  await upsertById(manager, WalletAccount, 'WalletAccount', {
    uid: demoUids.clientUid,
    balanceCents: strNum(2500),
  }, summary);

  await upsertById(manager, WalletTransaction, 'WalletTransaction', {
    id: deterministicId('wtxn', 1),
    uid: demoUids.clientUid,
    amountCents: strNum(2500),
    type: 'credit',
    note: 'seed wallet top-up',
  }, summary);

  await upsertById(manager, LoyaltySetting, 'LoyaltySetting', {
    storeId,
    pointsPerCurrencyUnit: 1,
    redeemStepPoints: 100,
    redeemStepValueCents: strNum(100),
  }, summary);

  await upsertById(manager, LoyaltyTier, 'LoyaltyTier', {
    id: deterministicId('tier', 1),
    storeId,
    name: 'Bronze',
    minPoints: 0,
    status: 'active',
  }, summary);

  await upsertById(manager, LoyaltyTransaction, 'LoyaltyTransaction', {
    id: deterministicId('ltxn', 1),
    uid: demoUids.clientUid,
    storeId,
    pointsDelta: 50,
    type: 'earn',
  }, summary);
}
