import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { StoreEntity } from './entities/StoreEntity';
import { CategoryEntity } from './entities/CategoryEntity';
import { BannerEntity } from './entities/BannerEntity';
import { ProductEntity } from './entities/ProductEntity';
import { ProductVariantEntity } from './entities/ProductVariantEntity';
import { ProductAttributeEntity } from './entities/ProductAttributeEntity';
import { UserFavoriteEntity } from './entities/UserFavoriteEntity';
import { CartEntity } from './entities/CartEntity';
import { CartItemEntity } from './entities/CartItemEntity';
import { CouponEntity } from './entities/CouponEntity';
import { CouponRedemptionEntity } from './entities/CouponRedemptionEntity';
import { ShippingMethodEntity } from './entities/ShippingMethodEntity';
import { UserAddressEntity } from './entities/UserAddressEntity';
import { OrderEntity } from './entities/OrderEntity';
import { OrderItemEntity } from './entities/OrderItemEntity';
import { OrderStatusHistoryEntity } from './entities/OrderStatusHistoryEntity';
import { ShipmentEntity } from './entities/ShipmentEntity';
import { PaymentSessionEntity } from './entities/PaymentSessionEntity';
import { PaymentEventEntity } from './entities/PaymentEventEntity';
import { PaymentSettingEntity } from './entities/PaymentSettingEntity';
import { AdminUserEntity } from './entities/AdminUserEntity';
import { AdminRoleEntity } from './entities/AdminRoleEntity';
import { AdminStoreAccessEntity } from './entities/AdminStoreAccessEntity';
import { AuditLogEntity } from './entities/AuditLogEntity';
import { InitCatalogBrowse1750000000000 } from './migrations/1750000000000-InitCatalogBrowse';
import { NotificationEntity } from './entities/NotificationEntity';
import { NotificationTokenEntity } from './entities/NotificationTokenEntity';
import { NotificationCampaignEntity } from './entities/NotificationCampaignEntity';
import { LoyaltySettingEntity } from './entities/LoyaltySettingEntity';
import { LoyaltyTierEntity } from './entities/LoyaltyTierEntity';
import { LoyaltyAccountEntity } from './entities/LoyaltyAccountEntity';
import { LoyaltyTransactionEntity } from './entities/LoyaltyTransactionEntity';
import { AddNotificationsLoyalty1760000000000 } from './migrations/1760000000000-AddNotificationsLoyalty';
import { OrderTrackingEventEntity } from './entities/OrderTrackingEventEntity';
import { HomeSectionEntity } from './entities/HomeSectionEntity';
import { HomeSectionBannerEntity } from './entities/HomeSectionBannerEntity';
import { CashbackCampaignEntity } from './entities/CashbackCampaignEntity';
import { CashbackRedemptionEntity } from './entities/CashbackRedemptionEntity';
import { WalletAccountEntity } from './entities/WalletAccountEntity';
import { WalletTransactionEntity } from './entities/WalletTransactionEntity';
import { DiscountCampaignEntity } from './entities/DiscountCampaignEntity';
import { UserProfileEntity } from './entities/UserProfileEntity';
import { AddTrackingHomeWalletDiscounts1770000000000 } from './migrations/1770000000000-AddTrackingHomeWalletDiscounts';
import { DeliveryZoneEntity } from './entities/DeliveryZoneEntity';
import { InsuranceOrderEntity } from './entities/InsuranceOrderEntity';
import { InsuranceOrderItemEntity } from './entities/InsuranceOrderItemEntity';
import { InsuranceQuoteEventEntity } from './entities/InsuranceQuoteEventEntity';
import { BranchEntity } from './entities/BranchEntity';
import { DeviceEntity } from './entities/DeviceEntity';
import { EmployeeEntity } from './entities/EmployeeEntity';
import { CashDrawerEntity } from './entities/CashDrawerEntity';
import { CashDrawerSessionEntity } from './entities/CashDrawerSessionEntity';
import { AccountingEntryEntity } from './entities/AccountingEntryEntity';
import { PosOrderEntity } from './entities/PosOrderEntity';
import { MarketingTouchpointEntity } from './entities/MarketingTouchpointEntity';
import { OrderAttributionEntity } from './entities/OrderAttributionEntity';
import { AddInsuranceAccountingAttribution1780000000000 } from './migrations/1780000000000-AddInsuranceAccountingAttribution';
import { GatewayActionLogEntity } from './entities/GatewayActionLogEntity';
import { AddGatewayActionLogs1790000000000 } from './migrations/1790000000000-AddGatewayActionLogs';
import { MediaAssetEntity } from './entities/MediaAssetEntity';
import { AddMediaAssets1800000000000 } from './migrations/1800000000000-AddMediaAssets';

const requiredEnv = ['DB_HOST', 'DB_PORT', 'DB_USER', 'DB_PASS', 'DB_NAME'] as const;

const validateEnv = (): void => {
  for (const key of requiredEnv) {
    if (!process.env[key]) throw new Error(`Missing required env var: ${key}`);
  }
};

let ds: DataSource | null = null;
let initOnce: Promise<DataSource> | null = null;

const createDataSource = (): DataSource => {
  validateEnv();
  return new DataSource({
    type: 'mysql',
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    username: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
    extra: { connectionLimit: 10, enableKeepAlive: true, keepAliveInitialDelay: 0, queueLimit: 0 },
    entities: [
      StoreEntity,
      CategoryEntity,
      BannerEntity,
      ProductEntity,
      ProductVariantEntity,
      ProductAttributeEntity,
      UserFavoriteEntity,
      CartEntity,
      CartItemEntity,
      CouponEntity,
      CouponRedemptionEntity,
      ShippingMethodEntity,
      UserAddressEntity,
      OrderEntity,
      OrderItemEntity,
      OrderStatusHistoryEntity,
      ShipmentEntity,
      PaymentSessionEntity,
      PaymentEventEntity,
      PaymentSettingEntity,
      AdminUserEntity,
      AdminRoleEntity,
      AdminStoreAccessEntity,
      AuditLogEntity,
      NotificationEntity,
      NotificationTokenEntity,
      NotificationCampaignEntity,
      LoyaltySettingEntity,
      LoyaltyTierEntity,
      LoyaltyAccountEntity,
      LoyaltyTransactionEntity,
      OrderTrackingEventEntity,
      HomeSectionEntity,
      HomeSectionBannerEntity,
      CashbackCampaignEntity,
      CashbackRedemptionEntity,
      WalletAccountEntity,
      WalletTransactionEntity,
      DiscountCampaignEntity,
      UserProfileEntity,
      DeliveryZoneEntity,
      InsuranceOrderEntity,
      InsuranceOrderItemEntity,
      InsuranceQuoteEventEntity,
      BranchEntity,
      DeviceEntity,
      EmployeeEntity,
      CashDrawerEntity,
      CashDrawerSessionEntity,
      AccountingEntryEntity,
      PosOrderEntity,
      MarketingTouchpointEntity,
      OrderAttributionEntity,
      GatewayActionLogEntity,
      MediaAssetEntity,
    ],
    migrations: [InitCatalogBrowse1750000000000, AddNotificationsLoyalty1760000000000, AddTrackingHomeWalletDiscounts1770000000000, AddInsuranceAccountingAttribution1780000000000, AddGatewayActionLogs1790000000000, AddMediaAssets1800000000000],
    synchronize: false,
    logging: false,
  });
};

export const getDataSource = async (): Promise<DataSource> => {
  if (ds?.isInitialized) return ds;
  if (!ds) ds = createDataSource();
  if (!initOnce) {
    initOnce = ds.initialize().finally(() => {
      initOnce = null;
    });
  }
  await initOnce;
  return ds;
};
