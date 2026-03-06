import { EntityManager } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { SeedContext, SeedStoreProfile, SeedSummary } from '../types';
import { addSkip, deterministicId, incCreated, incUpdated, strNum, upsertById } from '../seederUtils';
import { Store } from '../../../../../entities/Store';
import { StoreSettings } from '../../../../../entities/StoreSettings';
import { StorePaymentSetting } from '../../../../../entities/StorePaymentSetting';
import { AdminUser } from '../../../../../entities/AdminUser';
import { AdminRole } from '../../../../../entities/AdminRole';
import { AdminStoreAccess } from '../../../../../entities/AdminStoreAccess';
import { Branch } from '../../../../../entities/Branch';
import { UserProfile } from '../../../../../entities/UserProfile';
import { UserStoreContext } from '../../../../../entities/UserStoreContext';
import { UserSetting } from '../../../../../entities/UserSetting';
import { UserAddress } from '../../../../../entities/UserAddress';
import { Category } from '../../../../../entities/Category';
import { Product } from '../../../../../entities/Product';
import { ProductVariant } from '../../../../../entities/ProductVariant';
import { ProductSpec } from '../../../../../entities/ProductSpec';
import { ProductImage } from '../../../../../entities/ProductImage';
import { InventoryAdjustment } from '../../../../../entities/InventoryAdjustment';
import { InventoryBalance } from '../../../../../entities/InventoryBalance';
import { MediaAsset } from '../../../../../entities/MediaAsset';
import { Banner } from '../../../../../entities/Banner';
import { FeaturedItem } from '../../../../../entities/FeaturedItem';
import { HomeSection } from '../../../../../entities/HomeSection';
import { SeoSetting } from '../../../../../entities/SeoSetting';
import { LandingPage } from '../../../../../entities/LandingPage';
import { SitemapRun } from '../../../../../entities/SitemapRun';
import { ShippingMethod } from '../../../../../entities/ShippingMethod';
import { Governorate } from '../../../../../entities/Governorate';
import { DeliveryZone } from '../../../../../entities/DeliveryZone';
import { Coupon } from '../../../../../entities/Coupon';
import { TargetedDiscount } from '../../../../../entities/TargetedDiscount';
import { CashbackOffer } from '../../../../../entities/CashbackOffer';
import { Cart } from '../../../../../entities/Cart';
import { CartItem } from '../../../../../entities/CartItem';
import { PaymentSession } from '../../../../../entities/PaymentSession';
import { Order } from '../../../../../entities/Order';
import { OrderItem } from '../../../../../entities/OrderItem';
import { OrderStatusEvent } from '../../../../../entities/OrderStatusEvent';
import { Shipment } from '../../../../../entities/Shipment';
import { TrackingEvent } from '../../../../../entities/TrackingEvent';
import { Return } from '../../../../../entities/Return';
import { ReturnItem } from '../../../../../entities/ReturnItem';
import { Refund } from '../../../../../entities/Refund';
import { RiskRule } from '../../../../../entities/RiskRule';
import { RiskFlag } from '../../../../../entities/RiskFlag';
import { WalletAccount } from '../../../../../entities/WalletAccount';
import { WalletTransaction } from '../../../../../entities/WalletTransaction';
import { LoyaltySetting } from '../../../../../entities/LoyaltySetting';
import { LoyaltyTier } from '../../../../../entities/LoyaltyTier';
import { LoyaltyTransaction } from '../../../../../entities/LoyaltyTransaction';
import { NotificationToken } from '../../../../../entities/NotificationToken';
import { Notification } from '../../../../../entities/Notification';
import { SupportTicket } from '../../../../../entities/SupportTicket';
import { SupportMessage } from '../../../../../entities/SupportMessage';
import { InsuranceOrder } from '../../../../../entities/InsuranceOrder';
import { InsuranceFile } from '../../../../../entities/InsuranceFile';
import { InsuranceItem } from '../../../../../entities/InsuranceItem';
import { InsuranceStatusEvent } from '../../../../../entities/InsuranceStatusEvent';
import { ProductPrefixMapping } from '../../../../../entities/ProductPrefixMapping';
import { MarketingAttributionEvent } from '../../../../../entities/MarketingAttributionEvent';
import { PostPurchaseFlow } from '../../../../../entities/PostPurchaseFlow';
import { PostPurchaseRun } from '../../../../../entities/PostPurchaseRun';
import { AlertsPref } from '../../../../../entities/AlertsPref';
import { AlertsSubscription } from '../../../../../entities/AlertsSubscription';
import { UserProductFavorite } from '../../../../../entities/UserProductFavorite';
import { UserStoreFavorite } from '../../../../../entities/UserStoreFavorite';
import { Branch as BranchEntity } from '../../../../../entities/Branch';
import { Device } from '../../../../../entities/Device';
import { Employee } from '../../../../../entities/Employee';
import { Drawer } from '../../../../../entities/Drawer';
import { DrawerSession } from '../../../../../entities/DrawerSession';
import { LedgerEntry } from '../../../../../entities/LedgerEntry';
import { LegalDoc } from '../../../../../entities/LegalDoc';
import { DineInTable } from '../../../../../entities/DineInTable';
import { DineInSession } from '../../../../../entities/DineInSession';
import { DineInWaiterCall } from '../../../../../entities/DineInWaiterCall';
import { OrderReview } from '../../../../../entities/OrderReview';
import { buildTableQrCode } from '../../../../client/dineInSupport';

const ORDER_STATUSES = ['created', 'pending_confirmation', 'accepted', 'preparing', 'ready', 'out_for_delivery', 'delivered', 'cancelled', 'rejected'] as const;

function dayOffset(days: number): Date {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

function storeId(code: string): string {
  return `store_${code}`;
}

function scopedId(scope: string, key: string, index: number): string {
  return deterministicId(`${scope}${key}`.slice(0, 12), index);
}

async function ensureRole(manager: EntityManager, adminUid: string, role: string, summary: SeedSummary) {
  const repo = manager.getRepository(AdminRole);
  const existing = await repo.findOne({ where: { adminUid, role } });
  if (existing) {
    incUpdated(summary, 'AdminRole');
    return;
  }
  await repo.insert({ adminUid, role });
  incCreated(summary, 'AdminRole');
}

async function ensureStoreAccess(manager: EntityManager, adminUid: string, targetStoreId: string, summary: SeedSummary) {
  const repo = manager.getRepository(AdminStoreAccess);
  const existing = await repo.findOne({ where: { adminUid, storeId: targetStoreId } });
  if (existing) {
    incUpdated(summary, 'AdminStoreAccess');
    return;
  }
  await repo.insert({ adminUid, storeId: targetStoreId });
  incCreated(summary, 'AdminStoreAccess');
}

async function seedAdminUsers(ctx: SeedContext, summary: SeedSummary) {
  const { manager, demoUids, stores } = ctx;
  await upsertById(manager, AdminUser, 'AdminUser', { uid: demoUids.adminOwnerUid, status: 'active' }, summary);
  await upsertById(manager, AdminUser, 'AdminUser', { uid: demoUids.adminManagerUid, status: 'active' }, summary);
  await upsertById(manager, AdminUser, 'AdminUser', { uid: demoUids.adminOpsUid, status: 'active' }, summary);
  await upsertById(manager, AdminUser, 'AdminUser', { uid: demoUids.adminAnalystUid, status: 'active' }, summary);
  await upsertById(manager, AdminUser, 'AdminUser', { uid: demoUids.adminSupportUid, status: 'active' }, summary);

  await ensureRole(manager, demoUids.adminOwnerUid, 'owner', summary);
  await ensureRole(manager, demoUids.adminOwnerUid, 'admin', summary);
  await ensureRole(manager, demoUids.adminManagerUid, 'manager', summary);
  await ensureRole(manager, demoUids.adminOpsUid, 'operations', summary);
  await ensureRole(manager, demoUids.adminAnalystUid, 'analyst', summary);
  await ensureRole(manager, demoUids.adminSupportUid, 'support', summary);

  for (const s of stores) {
    const id = storeId(s.code);
    await ensureStoreAccess(manager, demoUids.adminOwnerUid, id, summary);
    await ensureStoreAccess(manager, demoUids.adminManagerUid, id, summary);
    await ensureStoreAccess(manager, demoUids.adminOpsUid, id, summary);
    await ensureStoreAccess(manager, demoUids.adminAnalystUid, id, summary);
    await ensureStoreAccess(manager, demoUids.adminSupportUid, id, summary);
  }
}

function demoCustomers(total: number): Array<{ uid: string; name: string }> {
  const users: Array<{ uid: string; name: string }> = [];
  for (let i = 1; i <= total; i += 1) {
    users.push({ uid: `demo_customer_${String(i).padStart(2, '0')}`, name: `Demo Customer ${i}` });
  }
  return users;
}

async function seedStoreCore(ctx: SeedContext, store: SeedStoreProfile, customers: Array<{ uid: string; name: string }>, summary: SeedSummary) {
  const { manager } = ctx;
  const id = storeId(store.code);

  await upsertById(manager, Store, 'Store', { id, name: store.name, status: 'active', disabledReason: null, disabledAt: null, disabledByUid: null }, summary);
  await upsertById(manager, StoreSettings, 'StoreSettings', {
    storeId: id,
    currency: 'USD',
    taxMode: 'exclusive',
    supportWhatsApp: store.supportPhone,
    supportEmail: store.supportEmail,
    pickupEnabled: true,
    deliveryEnabled: true,
    dineInConfigJson: store.vertical === 'restaurant' ? JSON.stringify({ dineIn: { enabled: true, secureTableModeEnabled: true, verificationMethod: 'qrOnly', sessionTtlMinutes: 180, requireSessionForOrder: true, requireSessionForWaiterCall: true, requireSessionForRating: true, requireSessionForBillRequest: true, allowCustomerSessionClose: true } }) : null,
  }, summary);

  await upsertById(manager, StorePaymentSetting, 'StorePaymentSetting', {
    storeId: id,
    provider: 'demo-pay',
    config: { mode: 'test', merchantId: `merchant_${store.code}` },
  }, summary);

  await upsertById(manager, LegalDoc, 'LegalDoc', {
    id: scopedId(store.code, 'terms', 1), storeId: id, docType: 'terms', version: 'v2', content: `Terms for ${store.name}`, status: 'active',
  }, summary);
  await upsertById(manager, LegalDoc, 'LegalDoc', {
    id: scopedId(store.code, 'privacy', 1), storeId: id, docType: 'privacy', version: 'v2', content: `Privacy policy for ${store.name}`, status: 'active',
  }, summary);

  for (let i = 0; i < ctx.sizes.branchesPerStore; i += 1) {
    const branchId = scopedId(store.code, 'branch', i + 1);
    const branchStatus = i === ctx.sizes.branchesPerStore - 1 ? 'disabled' : 'active';
    await upsertById(manager, Branch, 'Branch', {
      id: branchId,
      storeId: id,
      name: `${store.name} Branch ${i + 1}`,
      status: branchStatus,
      dineInEnabled: store.vertical === 'restaurant' && i < 2,
      dineInSecureTableModeEnabled: store.vertical === 'restaurant' && i < 2,
      dineInVerificationMethod: i % 2 === 0 ? 'qrOnly' : 'qrPlusGeo',
      dineInGeoRadiusMeters: 150,
      locationLat: String(30.02 + i / 100),
      locationLng: String(31.22 + i / 100),
    }, summary);
  }

  for (let c = 0; c < customers.length; c += 1) {
    const customer = customers[c];
    await upsertById(manager, UserProfile, 'UserProfile', {
      uid: customer.uid,
      phone: `+1555000${String(c + 1).padStart(4, '0')}`,
      email: `${customer.uid}@demo.dev`,
      displayName: customer.name,
      locale: 'en',
      marketingOptIn: c % 2 === 0,
      status: 'active',
      disabledReason: null,
      disabledAt: null,
      disabledByUid: null,
    }, summary);
    await upsertById(manager, UserStoreContext, 'UserStoreContext', { uid: customer.uid, storeId: id }, summary);
    await upsertById(manager, UserSetting, 'UserSetting', { uid: customer.uid, config: { darkMode: c % 2 === 0, language: 'en' } }, summary);

    for (let a = 0; a < 2; a += 1) {
      await upsertById(manager, UserAddress, 'UserAddress', {
        id: scopedId(customer.uid.slice(-6), `addr${store.code}`, a + 1),
        uid: customer.uid,
        label: a === 0 ? 'Home' : 'Office',
        recipientName: customer.name,
        phone: `+1555000${String(c + 1).padStart(4, '0')}`,
        governorate: `Gov ${a + 1}`,
        city: a === 0 ? 'Cairo' : 'Alex',
        area: 'Central',
        street: `${10 + a} Demo Street`,
        building: `${1 + a}`,
        floor: `${a + 1}`,
        apartment: `${11 + a}`,
        landmark: `${store.name} landmark`,
        lat: String(30.05 + (c % 4) / 100),
        lng: String(31.24 + (c % 4) / 100),
        notes: 'Seeded address',
        isDefault: a === 0,
      }, summary);
    }
  }
}

async function seedCatalogAndContent(ctx: SeedContext, store: SeedStoreProfile, summary: SeedSummary) {
  const { manager } = ctx;
  const sid = storeId(store.code);
  const categoryNames = store.vertical === 'restaurant'
    ? ['Appetizers', 'Main Course', 'Desserts', 'Beverages', 'Sides', 'Combos']
    : store.vertical === 'pharmacy'
      ? ['Pain Relief', 'Vitamins', 'Skin Care', 'Baby Care', 'First Aid', 'Medical Devices']
      : ['Electronics', 'Fashion', 'Home', 'Sports', 'Beauty', 'Grocery'];

  for (let i = 0; i < categoryNames.length; i += 1) {
    await upsertById(manager, Category, 'Category', {
      id: scopedId(store.code, 'cat', i + 1),
      storeId: sid,
      name: categoryNames[i],
      slug: `${store.code}-${categoryNames[i].toLowerCase().replace(/\s+/g, '-')}`,
      parentId: null,
      sortOrder: i,
      status: i === categoryNames.length - 1 ? 'disabled' : 'active',
    }, summary);
  }

  const products = Math.max(20, ctx.sizes.productsPerStore);
  for (let i = 0; i < products; i += 1) {
    const pid = scopedId(store.code, 'prd', i + 1);
    const categoryId = scopedId(store.code, 'cat', (i % (categoryNames.length - 1)) + 1);
    const basePrice = 300 + i * 45;
    const stock = i % 10 === 0 ? 0 : i % 7 === 0 ? 3 : 35;
    await upsertById(manager, Product, 'Product', {
      id: pid,
      storeId: sid,
      categoryId,
      name: `${store.name} Item ${i + 1}`,
      slug: `${store.code}-item-${i + 1}`,
      description: `Seeded ${store.vertical} item ${i + 1}`,
      status: i % 15 === 0 ? 'disabled' : 'active',
    }, summary);

    await upsertById(manager, ProductVariant, 'ProductVariant', {
      id: scopedId(store.code, `var${i + 1}`, 1),
      productId: pid,
      sku: `${store.code.toUpperCase()}-${1000 + i}`,
      priceCents: strNum(basePrice * 10),
      stockQty: stock,
      attributes: { size: i % 2 ? 'M' : 'L', color: i % 3 ? 'Blue' : 'Black' },
      status: stock === 0 ? 'inactive' : 'active',
    }, summary);

    await upsertById(manager, ProductSpec, 'ProductSpec', {
      id: scopedId(store.code, `spec${i + 1}`, 1), productId: pid, specKey: 'Origin', specValue: 'Seed Lab', sortOrder: 0,
    }, summary);

    const mediaId = scopedId(store.code, `media${i + 1}`, 1);
    await upsertById(manager, MediaAsset, 'MediaAsset', {
      id: mediaId,
      storeId: sid,
      ownerType: 'product',
      ownerId: pid,
      kind: 'image',
      originalPath: `seed/${store.code}/products/${pid}/orig.jpg`,
      thumbnailPath: `seed/${store.code}/products/${pid}/thumb.jpg`,
      contentType: 'image/jpeg',
      sizeBytes: strNum(120000 + i * 1200),
      status: 'ready',
      createdByUid: ctx.demoUids.adminManagerUid,
    }, summary);

    await upsertById(manager, ProductImage, 'ProductImage', {
      id: scopedId(store.code, `pimg${i + 1}`, 1), productId: pid, mediaAssetId: mediaId, sortOrder: 0,
    }, summary);

    await upsertById(manager, InventoryAdjustment, 'InventoryAdjustment', {
      id: scopedId(store.code, `iadj${i + 1}`, 1),
      variantId: scopedId(store.code, `var${i + 1}`, 1),
      storeId: sid,
      productId: pid,
      deltaQty: i % 2 === 0 ? '5.000' : '-2.000',
      beforeQty: '20.000',
      afterQty: String(20 + (i % 2 === 0 ? 5 : -2)),
      reason: 'seed inventory calibration',
      importBatchId: null,
      performedByUid: ctx.demoUids.adminOpsUid,
      createdByAdminUid: ctx.demoUids.adminOpsUid,
    }, summary);

    const balanceRepo = manager.getRepository(InventoryBalance);
    const existingBalance = await balanceRepo.findOne({ where: { storeId: sid, productId: pid } as any });
    if (existingBalance) {
      await balanceRepo.save(balanceRepo.create({ ...existingBalance, onHandQty: String(stock) }));
      incUpdated(summary, 'InventoryBalance');
    } else {
      await balanceRepo.insert({ storeId: sid, productId: pid, onHandQty: String(stock) });
      incCreated(summary, 'InventoryBalance');
    }

    if (i < 8) {
      await upsertById(manager, FeaturedItem, 'FeaturedItem', { id: scopedId(store.code, 'feat', i + 1), storeId: sid, productId: pid, sortOrder: i }, summary);
    }
  }

  await upsertById(manager, Banner, 'Banner', {
    id: scopedId(store.code, 'banner', 1), storeId: sid, title: `${store.name} Weekly Offers`, mediaAssetId: scopedId(store.code, 'media1', 1), linkUrl: '/promo/weekly', sortOrder: 0, status: 'active',
  }, summary);
  await upsertById(manager, HomeSection, 'HomeSection', {
    id: scopedId(store.code, 'home', 1), storeId: sid, type: 'featured', config: { title: 'Top picks', style: 'carousel' }, sortOrder: 0, enabled: true,
  }, summary);
  await upsertById(manager, SeoSetting, 'SeoSetting', {
    id: scopedId(store.code, 'seo', 1), storeId: sid, pageType: 'home', pageKey: 'index', title: `${store.name} Online`, description: `${store.name} seeded SEO`, extra: { vertical: store.vertical },
  }, summary);
  await upsertById(manager, LandingPage, 'LandingPage', {
    id: scopedId(store.code, 'landing', 1), storeId: sid, slug: `${store.code}-welcome`, title: `${store.name} Welcome`, body: { blocks: [{ type: 'hero', title: store.name }] }, status: 'published',
  }, summary);
  await upsertById(manager, LandingPage, 'LandingPage', {
    id: scopedId(store.code, 'landing', 2), storeId: sid, slug: `${store.code}-draft`, title: `${store.name} Draft`, body: { blocks: [] }, status: 'draft',
  }, summary);
  await upsertById(manager, SitemapRun, 'SitemapRun', {
    id: scopedId(store.code, 'sitemap', 1), storeId: sid, status: 'done', urlsCount: products + categoryNames.length,
  }, summary);

  await upsertById(manager, ShippingMethod, 'ShippingMethod', { id: scopedId(store.code, 'ship', 1), storeId: sid, name: 'Standard', basePriceCents: strNum(700), status: 'active' }, summary);
  await upsertById(manager, ShippingMethod, 'ShippingMethod', { id: scopedId(store.code, 'ship', 2), storeId: sid, name: 'Express', basePriceCents: strNum(1200), status: 'active' }, summary);
  await upsertById(manager, ShippingMethod, 'ShippingMethod', { id: scopedId(store.code, 'ship', 3), storeId: sid, name: 'Disabled Method', basePriceCents: strNum(500), status: 'disabled' }, summary);

  await upsertById(manager, Governorate, 'Governorate', { id: scopedId(store.code, 'gov', 1), name: `${store.name} Gov A`, status: 'active' }, summary);
  await upsertById(manager, Governorate, 'Governorate', { id: scopedId(store.code, 'gov', 2), name: `${store.name} Gov B`, status: 'active' }, summary);
  await upsertById(manager, DeliveryZone, 'DeliveryZone', { id: scopedId(store.code, 'zone', 1), storeId: sid, governorateId: scopedId(store.code, 'gov', 1), name: 'Central Zone', lat: '30.0444200', lng: '31.2357100', priceCents: strNum(700), status: 'active' }, summary);
  await upsertById(manager, DeliveryZone, 'DeliveryZone', { id: scopedId(store.code, 'zone', 2), storeId: sid, governorateId: scopedId(store.code, 'gov', 2), name: 'Outer Zone', lat: '30.0844200', lng: '31.2757100', priceCents: strNum(1200), status: 'active' }, summary);
}

async function seedPromotionsAndGrowth(ctx: SeedContext, store: SeedStoreProfile, customers: Array<{ uid: string; name: string }>, summary: SeedSummary) {
  const { manager } = ctx;
  const sid = storeId(store.code);
  await upsertById(manager, Coupon, 'Coupon', { id: scopedId(store.code, 'coupon', 1), storeId: sid, code: `${store.code.toUpperCase()}10`, discountType: 'percent', discountValue: strNum(10), startsAt: dayOffset(2), endsAt: dayOffset(-10), perUserLimit: 2, status: 'active' }, summary);
  await upsertById(manager, Coupon, 'Coupon', { id: scopedId(store.code, 'coupon', 2), storeId: sid, code: `${store.code.toUpperCase()}OLD`, discountType: 'amount', discountValue: strNum(500), startsAt: dayOffset(60), endsAt: dayOffset(40), perUserLimit: 1, status: 'disabled' }, summary);
  await upsertById(manager, TargetedDiscount, 'TargetedDiscount', { id: scopedId(store.code, 'tdisc', 1), storeId: sid, name: 'VIP Segment', rules: { minOrders: 4, percent: 15 }, status: 'active' }, summary);
  await upsertById(manager, TargetedDiscount, 'TargetedDiscount', { id: scopedId(store.code, 'tdisc', 2), storeId: sid, name: 'Dormant Reactivation', rules: { daysInactive: 30, percent: 10 }, status: 'disabled' }, summary);
  await upsertById(manager, CashbackOffer, 'CashbackOffer', { id: scopedId(store.code, 'cash', 1), storeId: sid, name: 'Daily Cashback', percent: 5, rules: { minTotalCents: 2000 }, status: 'active' }, summary);
  await upsertById(manager, CashbackOffer, 'CashbackOffer', { id: scopedId(store.code, 'cash', 2), storeId: sid, name: 'Legacy Cashback', percent: 3, rules: { minTotalCents: 1000 }, status: 'disabled' }, summary);

  for (let i = 0; i < 12; i += 1) {
    const user = customers[i % customers.length];
    await upsertById(manager, MarketingAttributionEvent, 'MarketingAttributionEvent', {
      id: scopedId(store.code, 'mkt', i + 1),
      uid: user.uid,
      storeId: sid,
      source: ['facebook', 'google', 'tiktok'][i % 3],
      campaign: `campaign_${store.code}_${(i % 4) + 1}`,
      medium: ['cpc', 'organic', 'referral'][i % 3],
      term: `term_${i % 5}`,
      content: `creative_${i % 3}`,
      dedupeKey: `${store.code}_mkt_${i + 1}`,
    }, summary);
  }

  await upsertById(manager, PostPurchaseFlow, 'PostPurchaseFlow', {
    id: scopedId(store.code, 'ppflow', 1), storeId: sid, name: 'Upsell after order', config: { trigger: 'order_completed', recommendationType: 'similar' }, status: 'active',
  }, summary);
  for (let i = 0; i < 6; i += 1) {
    await upsertById(manager, PostPurchaseRun, 'PostPurchaseRun', {
      id: scopedId(store.code, 'pprun', i + 1), flowId: scopedId(store.code, 'ppflow', 1), uid: customers[i % customers.length].uid, status: i % 3 === 0 ? 'shown' : 'completed',
    }, summary);
  }
}

async function seedUsersActivity(ctx: SeedContext, store: SeedStoreProfile, customers: Array<{ uid: string; name: string }>, summary: SeedSummary) {
  const sid = storeId(store.code);
  const { manager } = ctx;
  for (let i = 0; i < customers.length; i += 1) {
    const user = customers[i];
    await upsertById(manager, WalletAccount, 'WalletAccount', { uid: user.uid, balanceCents: strNum(500 + i * 130) }, summary);
    await upsertById(manager, WalletTransaction, 'WalletTransaction', { id: scopedId(store.code + user.uid.slice(-4), 'wtx', 1), uid: user.uid, amountCents: strNum(1000 + i * 20), type: 'credit', note: `seed topup ${store.code}` }, summary);
    await upsertById(manager, WalletTransaction, 'WalletTransaction', { id: scopedId(store.code + user.uid.slice(-4), 'wtx', 2), uid: user.uid, amountCents: strNum(220), type: 'debit', note: `seed usage ${store.code}` }, summary);

    await upsertById(manager, AlertsPref, 'AlertsPref', { uid: user.uid, backInStock: i % 2 === 0, priceDrop: true }, summary);
    await upsertById(manager, NotificationToken, 'NotificationToken', { id: scopedId(store.code + user.uid.slice(-4), 'nt', 1), uid: user.uid, token: `${user.uid}_${store.code}_token`, platform: i % 2 ? 'android' : 'ios' }, summary);
    await upsertById(manager, Notification, 'Notification', { id: scopedId(store.code + user.uid.slice(-4), 'n', 1), uid: user.uid, title: `Welcome to ${store.name}`, body: 'Seeded unread notification', isRead: false }, summary);
    await upsertById(manager, Notification, 'Notification', { id: scopedId(store.code + user.uid.slice(-4), 'n', 2), uid: user.uid, title: `Order update ${store.code}`, body: 'Seeded read notification', isRead: true }, summary);

    if (i < 8) {
      await upsertById(manager, UserProductFavorite, 'UserProductFavorite', { id: scopedId(store.code + user.uid.slice(-4), 'pf', 1), uid: user.uid, productId: scopedId(store.code, 'prd', (i % 15) + 1) }, summary);
      await upsertById(manager, UserStoreFavorite, 'UserStoreFavorite', { id: scopedId(store.code + user.uid.slice(-4), 'sf', 1), uid: user.uid, storeId: sid }, summary);
      await upsertById(manager, AlertsSubscription, 'AlertsSubscription', { id: scopedId(store.code + user.uid.slice(-4), 'as', 1), uid: user.uid, productId: scopedId(store.code, 'prd', (i % 15) + 1), type: 'back_in_stock' }, summary);
    }
  }

  await upsertById(manager, LoyaltySetting, 'LoyaltySetting', { storeId: sid, pointsPerCurrencyUnit: 1, redeemStepPoints: 100, redeemStepValueCents: strNum(100) }, summary);
  await upsertById(manager, LoyaltyTier, 'LoyaltyTier', { id: scopedId(store.code, 'tier', 1), storeId: sid, name: 'Bronze', minPoints: 0, status: 'active' }, summary);
  await upsertById(manager, LoyaltyTier, 'LoyaltyTier', { id: scopedId(store.code, 'tier', 2), storeId: sid, name: 'Gold', minPoints: 1000, status: 'active' }, summary);
  for (let i = 0; i < customers.length; i += 1) {
    await upsertById(manager, LoyaltyTransaction, 'LoyaltyTransaction', { id: scopedId(store.code + customers[i].uid.slice(-4), 'ltx', 1), uid: customers[i].uid, storeId: sid, pointsDelta: 40 + i * 2, type: 'earn' }, summary);
  }
}

async function seedOrdersAndOperations(ctx: SeedContext, store: SeedStoreProfile, customers: Array<{ uid: string; name: string }>, summary: SeedSummary) {
  const sid = storeId(store.code);
  const { manager, sizes } = ctx;
  const branchPool = Array.from({ length: ctx.sizes.branchesPerStore }, (_, i) => scopedId(store.code, 'branch', i + 1));
  const orderCount = Math.max(30, sizes.ordersPerStore);

  for (let i = 0; i < orderCount; i += 1) {
    const oid = scopedId(store.code, 'ord', i + 1);
    const user = customers[i % customers.length];
    const status = ORDER_STATUSES[i % ORDER_STATUSES.length];
    const serviceType = store.vertical === 'restaurant' && i % 4 === 0 ? 'dineIn' : i % 3 === 0 ? 'pickup' : 'delivery';
    const branchId = branchPool[i % branchPool.length];
    const hasShipment = ['out_for_delivery', 'delivered'].includes(status);
    const total = 1500 + i * 120;

    const dineInSessionId = serviceType === 'dineIn' ? scopedId(store.code, 'dinseed', (i % 10) + 1) : null;
    const tableId = serviceType === 'dineIn' ? scopedId(store.code, 'table', ((i % 6) + 1)) : null;

    await upsertById(manager, Order, 'Order', {
      id: oid,
      storeId: sid,
      uid: user.uid,
      channel: i % 5 === 0 ? 'pos' : i % 3 === 0 ? 'web' : 'app',
      status,
      serviceType,
      branchId,
      tableId,
      dineInSessionId,
      subtotalCents: strNum(total),
      discountCents: strNum(i % 4 === 0 ? 200 : 0),
      shippingCents: strNum(serviceType === 'delivery' ? 120 : 0),
      taxCents: strNum(80),
      totalCents: strNum(total + (serviceType === 'delivery' ? 120 : 0) - (i % 4 === 0 ? 200 : 0)),
      paymentStatus: i % 9 === 0 ? 'failed' : i % 4 === 0 ? 'pending' : 'paid',
      riskStatus: i % 11 === 0 ? 'flagged' : 'clear',
      createdAt: dayOffset(i % 35),
    }, summary);

    await upsertById(manager, OrderItem, 'OrderItem', {
      id: scopedId(store.code, 'oit', i + 1),
      orderId: oid,
      productId: scopedId(store.code, 'prd', (i % 20) + 1),
      variantId: scopedId(store.code, `var${(i % 20) + 1}`, 1),
      nameSnapshot: `${store.name} Item ${(i % 20) + 1}`,
      priceCents: strNum(700 + (i % 5) * 80),
      qty: (i % 3) + 1,
    }, summary);

    await upsertById(manager, OrderStatusEvent, 'OrderStatusEvent', {
      id: scopedId(store.code, 'ose', i + 1),
      orderId: oid,
      status,
      note: 'Seeded lifecycle status',
      createdByUid: ctx.demoUids.adminManagerUid,
      createdAt: dayOffset(i % 20),
    }, summary);

    await upsertById(manager, PaymentSession, 'PaymentSession', {
      id: scopedId(store.code, 'ps', i + 1),
      orderId: oid,
      provider: 'demo-pay',
      providerSessionId: `${store.code}_sess_${i + 1}`,
      status: i % 9 === 0 ? 'failed' : i % 4 === 0 ? 'created' : 'confirmed',
      createdAt: dayOffset(i % 30),
    }, summary);

    if (hasShipment) {
      const shipmentId = scopedId(store.code, 'sh', i + 1);
      await upsertById(manager, Shipment, 'Shipment', { id: shipmentId, orderId: oid, carrier: 'SeedCarrier', trackingNumber: `${store.code.toUpperCase()}-TRK-${i + 1}`, status: status === 'delivered' ? 'delivered' : 'in_transit' }, summary);
      await upsertById(manager, TrackingEvent, 'TrackingEvent', { id: scopedId(store.code, 'te', i + 1), shipmentId, message: status === 'delivered' ? 'Delivered' : 'Out for delivery', location: `Branch ${branchId.slice(0, 6)}` }, summary);
    }

    if (i % 12 === 0) {
      const returnId = scopedId(store.code, 'ret', i + 1);
      const returnStatus = i % 24 === 0 ? 'rejected' : i % 3 === 0 ? 'pending' : 'approved';
      await upsertById(manager, Return, 'Return', {
        id: returnId,
        storeId: sid,
        orderId: oid,
        uid: user.uid,
        status: returnStatus,
        approvedAt: returnStatus === 'approved' ? dayOffset(2) : null,
        rejectedAt: returnStatus === 'rejected' ? dayOffset(1) : null,
        requestedAt: dayOffset(3),
      }, summary);
      await upsertById(manager, ReturnItem, 'ReturnItem', {
        id: scopedId(store.code, 'rit', i + 1),
        returnId,
        orderItemId: scopedId(store.code, 'oit', i + 1),
        qty: 1,
      }, summary);
      await upsertById(manager, Refund, 'Refund', {
        id: scopedId(store.code, 'rfd', i + 1),
        returnId,
        amountCents: strNum(400 + (i % 5) * 50),
        method: i % 2 === 0 ? 'wallet' : 'card',
        status: returnStatus === 'pending' ? 'pending' : 'completed',
        createdAt: dayOffset(1),
      }, summary);
    }

    if (i % 14 === 0) {
      await upsertById(manager, RiskFlag, 'RiskFlag', {
        id: scopedId(store.code, 'rf', i + 1),
        orderId: oid,
        status: i % 28 === 0 ? 'resolved' : 'open',
        reason: 'High-risk pattern from seeded rules',
        resolvedByUid: i % 28 === 0 ? ctx.demoUids.adminOpsUid : null,
        resolvedAt: i % 28 === 0 ? dayOffset(1) : null,
      }, summary);
    }
  }

  await upsertById(manager, RiskRule, 'RiskRule', { storeId: sid, config: { velocityThreshold: 5, maxOrderAmountCents: 60000 } }, summary);
}

async function seedSupportInsuranceAndOps(ctx: SeedContext, store: SeedStoreProfile, customers: Array<{ uid: string; name: string }>, summary: SeedSummary) {
  const sid = storeId(store.code);
  const { manager } = ctx;
  for (let i = 0; i < 10; i += 1) {
    const uid = customers[i % customers.length].uid;
    const ticketId = scopedId(store.code, 'tkt', i + 1);
    const status = i % 3 === 0 ? 'closed' : 'open';
    await upsertById(manager, SupportTicket, 'SupportTicket', { id: ticketId, uid, storeId: sid, subject: `Support issue #${i + 1} (${store.code})`, status }, summary);
    await upsertById(manager, SupportMessage, 'SupportMessage', { id: scopedId(store.code, 'tmsg', i + 1), ticketId, senderUid: uid, message: 'Customer message from seeded data', mediaAssetId: null }, summary);
    await upsertById(manager, SupportMessage, 'SupportMessage', { id: scopedId(store.code, 'tmsg', i + 101), ticketId, senderUid: ctx.demoUids.adminSupportUid, message: 'Support response from seeded data', mediaAssetId: null }, summary);
  }

  for (let i = 0; i < Math.max(6, ctx.sizes.insuranceOrdersPerStore); i += 1) {
    const uid = customers[i % customers.length].uid;
    const insId = scopedId(store.code, 'ins', i + 1);
    const status = ['draft', 'submitted', 'quoted', 'approved', 'rejected'][i % 5];
    await upsertById(manager, InsuranceOrder, 'InsuranceOrder', {
      id: insId,
      storeId: sid,
      uid,
      status,
      quoteLocked: status === 'quoted' || status === 'approved',
      deliveryCentsX2Applied: i % 2 === 0,
      createdAt: dayOffset(i + 1),
    }, summary);
    await upsertById(manager, InsuranceItem, 'InsuranceItem', { id: scopedId(store.code, 'insi', i + 1), insuranceOrderId: insId, name: 'Claimed item', qty: 1 + (i % 2), clientContributionCents: strNum(500), companyContributionCents: strNum(900) }, summary);
    const mediaId = scopedId(store.code, 'insm', i + 1);
    await upsertById(manager, MediaAsset, 'MediaAsset', {
      id: mediaId,
      storeId: sid,
      ownerType: 'insurance_order',
      ownerId: insId,
      kind: 'image',
      originalPath: `seed/${store.code}/insurance/${insId}/img.jpg`,
      thumbnailPath: `seed/${store.code}/insurance/${insId}/thumb.jpg`,
      contentType: 'image/jpeg',
      sizeBytes: strNum(98000),
      status: 'ready',
      createdByUid: uid,
    }, summary);
    await upsertById(manager, InsuranceFile, 'InsuranceFile', { id: scopedId(store.code, 'insf', i + 1), insuranceOrderId: insId, type: 'damage_photo', mediaAssetId: mediaId }, summary);
    await upsertById(manager, InsuranceStatusEvent, 'InsuranceStatusEvent', { id: scopedId(store.code, 'inse', i + 1), insuranceOrderId: insId, status, note: 'Seeded insurance lifecycle', createdByUid: uid }, summary);
  }

  for (let i = 0; i < ctx.sizes.branchesPerStore; i += 1) {
    const branchId = scopedId(store.code, 'branch', i + 1);
    const deviceId = scopedId(store.code, 'dev', i + 1);
    const employeeId = scopedId(store.code, 'emp', i + 1);
    const drawerId = scopedId(store.code, 'dr', i + 1);
    const drawerSessionId = scopedId(store.code, 'drs', i + 1);

    await upsertById(manager, Device, 'Device', { id: deviceId, storeId: sid, branchId, name: `${store.code.toUpperCase()} POS ${i + 1}`, status: i === ctx.sizes.branchesPerStore - 1 ? 'disabled' : 'active' }, summary);
    await upsertById(manager, Employee, 'Employee', { id: employeeId, storeId: sid, uid: i % 2 === 0 ? ctx.demoUids.adminOpsUid : ctx.demoUids.adminManagerUid, role: i % 2 === 0 ? 'cashier' : 'supervisor', status: 'active' }, summary);
    await upsertById(manager, Drawer, 'Drawer', { id: drawerId, storeId: sid, branchId, name: `${store.code.toUpperCase()} Drawer ${i + 1}`, status: 'active' }, summary);
    await upsertById(manager, DrawerSession, 'DrawerSession', { id: drawerSessionId, drawerId, openedByUid: ctx.demoUids.adminOpsUid, openedAt: dayOffset(i), closedByUid: i % 2 === 0 ? null : ctx.demoUids.adminOpsUid, closedAt: i % 2 === 0 ? null : dayOffset(0), openingBalanceCents: strNum(50000), closingBalanceCents: i % 2 === 0 ? null : strNum(52700) }, summary);
    await upsertById(manager, LedgerEntry, 'LedgerEntry', { id: scopedId(store.code, 'led', i + 1), storeId: sid, amountCents: strNum(12000 + i * 3500), type: i % 2 === 0 ? 'sale' : 'expense', channel: i % 2 === 0 ? 'pos' : 'backoffice', branchId, deviceId, employeeId, drawerSessionId, refType: i % 2 === 0 ? 'order' : 'expense', refId: i % 2 === 0 ? scopedId(store.code, 'ord', i + 1) : `exp_${store.code}_${i + 1}` }, summary);
  }
}

async function seedDineIn(ctx: SeedContext, store: SeedStoreProfile, customers: Array<{ uid: string; name: string }>, summary: SeedSummary) {
  if (store.vertical !== 'restaurant') {
    addSkip(summary, 'DineIn', `store ${store.code} is not restaurant vertical`);
    return;
  }
  const sid = storeId(store.code);
  const manager = ctx.manager;
  const branchIds = [scopedId(store.code, 'branch', 1), scopedId(store.code, 'branch', 2)];

  for (let i = 0; i < 8; i += 1) {
    const tableId = scopedId(store.code, 'table', i + 1);
    const branchId = branchIds[i % branchIds.length];
    const status = i === 6 ? 'maintenance' : i === 7 ? 'disabled' : 'active';
    const baseTable = {
      id: tableId,
      storeId: sid,
      branchId,
      code: `T${String(i + 1).padStart(2, '0')}`,
      tableNumber: `${i + 1}`,
      name: i % 2 === 0 ? `Window ${i + 1}` : null,
      seatsCount: 2 + (i % 4),
      status,
      qrVersion: 1,
      qrPayload: '',
      qrSignature: '',
      lastQrIssuedAt: dayOffset(4),
    };
    const qr = buildTableQrCode(sid, branchId, baseTable as any, Date.now() - i * 60000);
    await upsertById(manager, DineInTable, 'DineInTable', { ...baseTable, qrPayload: qr.payload, qrSignature: qr.signature }, summary);
  }

  for (let i = 0; i < 14; i += 1) {
    const status = i < 4 ? 'active' : i < 9 ? 'closed' : 'expired';
    const verifiedAt = dayOffset(i % 5);
    const expiresAt = status === 'expired' ? dayOffset(1) : new Date(Date.now() + 2 * 60 * 60 * 1000);
    await upsertById(manager, DineInSession, 'DineInSession', {
      id: scopedId(store.code, 'dinseed', i + 1),
      storeId: sid,
      branchId: branchIds[i % branchIds.length],
      tableId: scopedId(store.code, 'table', (i % 6) + 1),
      tableNumberSnapshot: String((i % 6) + 1),
      customerUid: customers[i % customers.length].uid,
      sessionToken: `${store.code}_din_session_${i + 1}`,
      sourceMode: i % 3 === 0 ? 'localOnly' : i % 2 === 0 ? 'hybrid' : 'cloudOnly',
      verifiedBy: i % 2 === 0 ? 'cloud' : 'local',
      verificationMethod: i % 2 === 0 ? 'qrOnly' : 'qrPlusGeo',
      verifiedAt,
      expiresAt,
      lastSeenAt: verifiedAt,
      status,
    }, summary);
  }

  for (let i = 0; i < 12; i += 1) {
    const callStatus = i < 4 ? 'open' : i < 8 ? 'acknowledged' : 'resolved';
    await upsertById(manager, DineInWaiterCall, 'DineInWaiterCall', {
      id: scopedId(store.code, 'wc', i + 1),
      storeId: sid,
      branchId: branchIds[i % branchIds.length],
      tableId: scopedId(store.code, 'table', (i % 6) + 1),
      sessionId: scopedId(store.code, 'dinseed', (i % 10) + 1),
      orderId: i % 2 === 0 ? scopedId(store.code, 'ord', i + 1) : null,
      customerUid: customers[i % customers.length].uid,
      callType: (['callWaiter', 'requestBill', 'needHelp', 'cleanup'] as const)[i % 4],
      note: `Seed waiter call ${i + 1}`,
      status: callStatus,
      resolvedAt: callStatus === 'resolved' ? dayOffset(0) : null,
      resolvedByAdminUid: callStatus === 'resolved' ? ctx.demoUids.adminOpsUid : null,
    }, summary);
  }

  for (let i = 0; i < 10; i += 1) {
    const orderId = scopedId(store.code, 'ord', (i * 3) + 1);
    await upsertById(manager, OrderReview, 'OrderReview', {
      id: scopedId(store.code, 'orv', i + 1),
      storeId: sid,
      orderId,
      uid: customers[i % customers.length].uid,
      rating: (i % 5) + 1,
      comment: `Dine-in review #${i + 1}`,
      branchId: branchIds[i % branchIds.length],
      tableId: scopedId(store.code, 'table', (i % 6) + 1),
      dineInSessionId: scopedId(store.code, 'dinseed', (i % 10) + 1),
      createdAt: dayOffset(i % 8),
    }, summary);
  }
}

async function seedCarts(manager: EntityManager, store: SeedStoreProfile, customers: Array<{ uid: string; name: string }>, summary: SeedSummary) {
  const sid = storeId(store.code);
  for (let i = 0; i < 8; i += 1) {
    const uid = customers[i].uid;
    const cartId = scopedId(store.code + uid.slice(-4), 'cart', 1);
    await upsertById(manager, Cart, 'Cart', { id: cartId, uid, storeId: sid, couponCode: i % 2 === 0 ? `${store.code.toUpperCase()}10` : null }, summary);
    await upsertById(manager, CartItem, 'CartItem', { id: scopedId(store.code + uid.slice(-4), 'ci', 1), cartId, productId: scopedId(store.code, 'prd', (i % 15) + 1), variantId: scopedId(store.code, `var${(i % 15) + 1}`, 1), qty: (i % 3) + 1, unitPriceCents: strNum(900 + i * 100) }, summary);
  }
}

async function seedPrefixMappings(manager: EntityManager, store: SeedStoreProfile, summary: SeedSummary) {
  const sid = storeId(store.code);
  for (let i = 0; i < 5; i += 1) {
    await upsertById(manager, ProductPrefixMapping, 'ProductPrefixMapping', {
      id: scopedId(store.code, 'ppm', i + 1),
      storeId: sid,
      prefix: `${store.code.toUpperCase()}P${i + 1}`,
      productId: scopedId(store.code, 'prd', i + 1),
      createdByUid: null,
    }, summary);
  }
}

export async function seedFullDemoScenario(ctx: SeedContext, summary: SeedSummary) {
  const customers = demoCustomers(ctx.sizes.customers);
  await seedAdminUsers(ctx, summary);

  for (const store of ctx.stores) {
    await seedStoreCore(ctx, store, customers, summary);
    await seedCatalogAndContent(ctx, store, summary);
    await seedPromotionsAndGrowth(ctx, store, customers, summary);
    await seedUsersActivity(ctx, store, customers, summary);
    await seedCarts(ctx.manager, store, customers, summary);
    await seedOrdersAndOperations(ctx, store, customers, summary);
    await seedSupportInsuranceAndOps(ctx, store, customers, summary);
    await seedDineIn(ctx, store, customers, summary);
    await seedPrefixMappings(ctx.manager, store, summary);
  }

  const seededStores = ctx.stores.map((s) => `${s.code}:${storeId(s.code)}`);
  addSkip(summary, 'SeedSummary', `stores=${seededStores.join(', ')}`);
  addSkip(summary, 'SeedSummary', `admins=${Object.values(ctx.demoUids).join(', ')}`);
  addSkip(summary, 'SeedSummary', `customers=${customers.slice(0, 8).map((c) => c.uid).join(', ')} (+${Math.max(0, customers.length - 8)} more)`);
}
