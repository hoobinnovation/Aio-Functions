import { Store } from '../../../../../entities/Store';
import { StoreSettings } from '../../../../../entities/StoreSettings';
import { StorePaymentSetting } from '../../../../../entities/StorePaymentSetting';
import { UserProfile } from '../../../../../entities/UserProfile';
import { UserStoreContext } from '../../../../../entities/UserStoreContext';
import { UserAddress } from '../../../../../entities/UserAddress';
import { UserSetting } from '../../../../../entities/UserSetting';
import { LegalDoc } from '../../../../../entities/LegalDoc';
import { deterministicId, upsertById } from '../seederUtils';
import { SeedContext, SeedSummary } from '../types';

export async function seedStoresAndSettings(ctx: SeedContext, summary: SeedSummary) {
  const { storeId, demoUids, manager } = ctx;
  await upsertById(manager, Store, 'Store', {
    id: storeId,
    name: 'Demo Store',
    status: 'active',
    disabledReason: null,
    disabledAt: null,
    disabledByUid: null,
  }, summary);

  await upsertById(manager, StoreSettings, 'StoreSettings', {
    storeId,
    currency: 'USD',
    taxMode: 'exclusive',
    supportWhatsApp: '+10000000000',
    supportEmail: 'support@example.dev',
    pickupEnabled: true,
    deliveryEnabled: true,
  }, summary);

  await upsertById(manager, StorePaymentSetting, 'StorePaymentSetting', {
    storeId,
    provider: 'demo-pay',
    config: { mode: 'test', merchantId: `merchant_${storeId}` },
  }, summary);

  const demoUsers = [demoUids.clientUid, demoUids.adminOwnerUid, demoUids.adminCatalogUid, demoUids.adminSupportUid];
  for (let i = 0; i < Math.max(0, ctx.sizes.customers - 1); i += 1) {
    demoUsers.push(`demo_customer_${i + 1}`);
  }
  for (const uid of demoUsers) {
    await upsertById(manager, UserProfile, 'UserProfile', {
      uid,
      phone: '+10000000000',
      email: `${uid}@example.dev`,
      displayName: uid,
      locale: 'en',
      marketingOptIn: true,
      status: 'active',
      disabledReason: null,
      disabledAt: null,
      disabledByUid: null,
    }, summary);

    await upsertById(manager, UserStoreContext, 'UserStoreContext', { uid, storeId }, summary);

    await upsertById(manager, UserSetting, 'UserSetting', { uid, config: { darkMode: false, language: 'en' } }, summary);
  }

  await upsertById(manager, UserAddress, 'UserAddress', {
    id: deterministicId('address', 1),
    uid: demoUids.clientUid,
    label: 'Home',
    recipientName: 'Demo Client',
    phone: '+10000000000',
    governorate: 'Demo Governorate',
    city: 'Demo City',
    area: 'Center',
    street: 'Demo Street 1',
    building: '1',
    floor: '2',
    apartment: '10',
    landmark: 'Demo Landmark',
    lat: '30.0000000',
    lng: '31.0000000',
    notes: 'Seeded address',
    isDefault: true,
  }, summary);

  await upsertById(manager, LegalDoc, 'LegalDoc', {
    id: deterministicId('legaldoc', 1),
    storeId,
    docType: 'terms',
    version: 'v1',
    content: 'Demo terms and conditions for seeded environment.',
    status: 'active',
  }, summary);
}
