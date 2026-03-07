import { NotificationToken } from '../../../../../entities/NotificationToken';
import { Notification } from '../../../../../entities/Notification';
import { AlertsPref } from '../../../../../entities/AlertsPref';
import { AlertsSubscription } from '../../../../../entities/AlertsSubscription';
import { SupportTicket } from '../../../../../entities/SupportTicket';
import { SupportMessage } from '../../../../../entities/SupportMessage';
import { PostPurchaseFlow } from '../../../../../entities/PostPurchaseFlow';
import { PostPurchaseRun } from '../../../../../entities/PostPurchaseRun';
import { deterministicId, upsertById } from '../seederUtils';
import { SeedContext, SeedSummary } from '../types';

export async function seedSupportNotifications(ctx: SeedContext, summary: SeedSummary) {
  const { manager, storeId, demoUids } = ctx;
  await upsertById(manager, NotificationToken, 'NotificationToken', {
    id: deterministicId('ntoken', 1),
    uid: demoUids.clientUid,
    token: 'demo-token-1',
    platform: 'ios',
  }, summary);

  await upsertById(manager, Notification, 'Notification', {
    id: deterministicId('notif', 1),
    uid: demoUids.clientUid,
    title: 'Welcome',
    body: 'This is a seeded notification.',
    isRead: false,
  }, summary);

  await upsertById(manager, AlertsPref, 'AlertsPref', {
    uid: demoUids.clientUid,
    backInStock: true,
    priceDrop: true,
  }, summary);

  await upsertById(manager, AlertsSubscription, 'AlertsSubscription', {
    id: deterministicId('alertsub', 1),
    uid: demoUids.clientUid,
    productId: deterministicId('product', 1),
    type: 'back_in_stock',
  }, summary);

  await upsertById(manager, SupportTicket, 'SupportTicket', {
    id: deterministicId('ticket', 1),
    uid: demoUids.clientUid,
    storeId,
    subject: 'Need help with seeded order',
    status: 'open',
  }, summary);

  await upsertById(manager, SupportMessage, 'SupportMessage', {
    id: deterministicId('smsg', 1),
    ticketId: deterministicId('ticket', 1),
    senderUid: demoUids.clientUid,
    message: 'Hello support team!',
    mediaAssetId: null,
  }, summary);

  await upsertById(manager, PostPurchaseFlow, 'PostPurchaseFlow', {
    id: deterministicId('ppflow', 1),
    storeId,
    name: 'Thank You Upsell',
    config: { trigger: 'order_completed', offer: 'coupon' },
    status: 'active',
  }, summary);

  await upsertById(manager, PostPurchaseRun, 'PostPurchaseRun', {
    id: deterministicId('pprun', 1),
    flowId: deterministicId('ppflow', 1),
    uid: demoUids.clientUid,
    status: 'completed',
  }, summary);
}
