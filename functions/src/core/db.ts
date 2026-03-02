import { DataSource } from 'typeorm';
import { Store } from '../entities/Store';
import { AdminUser } from '../entities/AdminUser';
import { AdminRole } from '../entities/AdminRole';
import { AdminStoreAccess } from '../entities/AdminStoreAccess';
import { UserProfile } from '../entities/UserProfile';
import { MediaAsset } from '../entities/MediaAsset';
import { UserAddress } from '../entities/UserAddress';
import { UserAccountDeleteRequest } from '../entities/UserAccountDeleteRequest';
import { StoreSettings } from '../entities/StoreSettings';
import { UserStoreContext } from '../entities/UserStoreContext';
import { InitSchema1720000000000 } from '../migrations/1720000000000-InitSchema';
import { Phase2AccountsStores1723000000000 } from '../migrations/1723000000000-Phase2AccountsStores';
import { Category } from '../entities/Category';
import { Product } from '../entities/Product';
import { ProductVariant } from '../entities/ProductVariant';
import { ProductSpec } from '../entities/ProductSpec';
import { ProductImage } from '../entities/ProductImage';
import { InventoryAdjustment } from '../entities/InventoryAdjustment';
import { Banner } from '../entities/Banner';
import { FeaturedItem } from '../entities/FeaturedItem';
import { UserProductFavorite } from '../entities/UserProductFavorite';
import { UserStoreFavorite } from '../entities/UserStoreFavorite';
import { HomeSection } from '../entities/HomeSection';
import { SeoSetting } from '../entities/SeoSetting';
import { LandingPage } from '../entities/LandingPage';
import { SitemapRun } from '../entities/SitemapRun';
import { Phase3CatalogHomeSeo1724000000000 } from '../migrations/1724000000000-Phase3CatalogHomeSeo';
import { ShippingMethod } from '../entities/ShippingMethod';
import { Governorate } from '../entities/Governorate';
import { DeliveryZone } from '../entities/DeliveryZone';
import { Cart } from '../entities/Cart';
import { CartItem } from '../entities/CartItem';
import { Coupon } from '../entities/Coupon';
import { TargetedDiscount } from '../entities/TargetedDiscount';
import { CashbackOffer } from '../entities/CashbackOffer';
import { WalletAccount } from '../entities/WalletAccount';
import { WalletTransaction } from '../entities/WalletTransaction';
import { LoyaltySetting } from '../entities/LoyaltySetting';
import { LoyaltyTier } from '../entities/LoyaltyTier';
import { LoyaltyTransaction } from '../entities/LoyaltyTransaction';
import { NotificationToken } from '../entities/NotificationToken';
import { Notification } from '../entities/Notification';
import { MarketingAttributionEvent } from '../entities/MarketingAttributionEvent';
import { AlertsPref } from '../entities/AlertsPref';
import { AlertsSubscription } from '../entities/AlertsSubscription';
import { PostPurchaseFlow } from '../entities/PostPurchaseFlow';
import { PostPurchaseRun } from '../entities/PostPurchaseRun';
import { SupportTicket } from '../entities/SupportTicket';
import { SupportMessage } from '../entities/SupportMessage';
import { UserSetting } from '../entities/UserSetting';
import { LegalDoc } from '../entities/LegalDoc';
import { Phase4CommerceMarketing1725000000000 } from '../migrations/1725000000000-Phase4CommerceMarketing';

let db: DataSource | null = null;

export function getDataSource(): DataSource {
  if (db) return db;

  db = new DataSource({
    type: 'mysql',
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 3306),
    username: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    ssl: process.env.DB_SSL === 'true' ? {} : undefined,
    synchronize: false,
    logging: false,
    entities: [
      Store,
      AdminUser,
      AdminRole,
      AdminStoreAccess,
      UserProfile,
      UserAddress,
      UserAccountDeleteRequest,
      StoreSettings,
      UserStoreContext,
      MediaAsset,
      Category,
      Product,
      ProductVariant,
      ProductSpec,
      ProductImage,
      InventoryAdjustment,
      Banner,
      FeaturedItem,
      UserProductFavorite,
      UserStoreFavorite,
      HomeSection,
      SeoSetting,
      LandingPage,
      SitemapRun,
      ShippingMethod,
      Governorate,
      DeliveryZone,
      Cart,
      CartItem,
      Coupon,
      TargetedDiscount,
      CashbackOffer,
      WalletAccount,
      WalletTransaction,
      LoyaltySetting,
      LoyaltyTier,
      LoyaltyTransaction,
      NotificationToken,
      Notification,
      MarketingAttributionEvent,
      AlertsPref,
      AlertsSubscription,
      PostPurchaseFlow,
      PostPurchaseRun,
      SupportTicket,
      SupportMessage,
      UserSetting,
      LegalDoc,
    ],
    migrations: [InitSchema1720000000000, Phase2AccountsStores1723000000000, Phase3CatalogHomeSeo1724000000000, Phase4CommerceMarketing1725000000000],
  });

  return db;
}

export async function getInitializedDataSource(): Promise<DataSource> {
  const source = getDataSource();
  if (!source.isInitialized) {
    await source.initialize();
  }
  return source;
}
