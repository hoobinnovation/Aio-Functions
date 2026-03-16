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
import { ProductPrefixMapping } from '../entities/ProductPrefixMapping';
import { InventoryImportBatch } from '../entities/InventoryImportBatch';
import { InventoryImportRow } from '../entities/InventoryImportRow';
import { InventoryBalance } from '../entities/InventoryBalance';
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
import { Order } from '../entities/Order';
import { OrderItem } from '../entities/OrderItem';
import { OrderStatusEvent } from '../entities/OrderStatusEvent';
import { Shipment } from '../entities/Shipment';
import { TrackingEvent } from '../entities/TrackingEvent';
import { PaymentSession } from '../entities/PaymentSession';
import { StorePaymentSetting } from '../entities/StorePaymentSetting';
import { InsuranceOrder } from '../entities/InsuranceOrder';
import { InsuranceFile } from '../entities/InsuranceFile';
import { InsuranceItem } from '../entities/InsuranceItem';
import { InsuranceStatusEvent } from '../entities/InsuranceStatusEvent';
import { RiskRule } from '../entities/RiskRule';
import { RiskFlag } from '../entities/RiskFlag';
import { Branch } from '../entities/Branch';
import { Device } from '../entities/Device';
import { Employee } from '../entities/Employee';
import { Drawer } from '../entities/Drawer';
import { DrawerSession } from '../entities/DrawerSession';
import { LedgerEntry } from '../entities/LedgerEntry';
import { Return } from '../entities/Return';
import { ReturnItem } from '../entities/ReturnItem';
import { Refund } from '../entities/Refund';
import { EdgeNode } from '../entities/EdgeNode';
import { EdgeIngestedEvent } from '../entities/EdgeIngestedEvent';
import { OrderReview } from '../entities/OrderReview';
import { DineInWaiterCall } from '../entities/DineInWaiterCall';
import { DineInSession } from '../entities/DineInSession';
import { DineInTable } from '../entities/DineInTable';
import { Phase5OrdersInsuranceAccounting1726000000000 } from '../migrations/1726000000000-Phase5OrdersInsuranceAccounting';
import { Phase6InventoryImport1727000000000 } from '../migrations/1727000000000-Phase6InventoryImport';
import { ReportsBasicIndexes1727100000000 } from '../migrations/1727100000000-ReportsBasicIndexes';
import { ReportsMarketingIndexes1727200000000 } from '../migrations/1727200000000-ReportsMarketingIndexes';
import { AccountingLedgerIndexes1727400000000 } from '../migrations/1727400000000-AccountingLedgerIndexes';
import { EdgeSyncIngest1728000000000 } from '../migrations/1728000000000-EdgeSyncIngest';
import { DineInSecureTableSession1728100000000 } from '../migrations/1728100000000-DineInSecureTableSession';
import { ExplicitDeliveryZoneContract1728200000000 } from '../migrations/1728200000000-ExplicitDeliveryZoneContract';
import { FawaterkPaymentSessionFields1728300000000 } from '../migrations/1728300000000-FawaterkPaymentSessionFields';
import { ProductImportReferences1728400000000 } from '../migrations/1728400000000-ProductImportReferences';
import { StoreFeatureVisibility1728500000000 } from '../migrations/1728500000000-StoreFeatureVisibility';
import { ProductMetricsAndProductReviews1728600000000 } from '../migrations/1728600000000-ProductMetricsAndProductReviews';
import { PhonePasswordAuthFoundation1728700000000 } from '../migrations/1728700000000-PhonePasswordAuthFoundation';
import { HybridCatalogFoundation1728800000000 } from '../migrations/1728800000000-HybridCatalogFoundation';
import { HybridCatalogIntegrity1728900000000 } from '../migrations/1728900000000-HybridCatalogIntegrity';
import { ProductImportReference } from '../entities/ProductImportReference';
import { AuthPhonePasswordCredential } from '../entities/AuthPhonePasswordCredential';
import { ProductCategory } from '../entities/ProductCategory';
import { ProductBaseMedia } from '../entities/ProductBaseMedia';
import { StoreProductMediaOverride } from '../entities/StoreProductMediaOverride';
import { AccountingAccount } from '../entities/AccountingAccount';
import { AccountingPeriod } from '../entities/AccountingPeriod';
import { AccountingJournalEntry } from '../entities/AccountingJournalEntry';
import { AccountingJournalEntryLine } from '../entities/AccountingJournalEntryLine';
import { AccountingPostingRule } from '../entities/AccountingPostingRule';
import { AccountingPostingEvent } from '../entities/AccountingPostingEvent';
import { AccountingFoundation1729000000000 } from '../migrations/1729000000000-AccountingFoundation';
import { AccountingPostingEvents1729100000000 } from '../migrations/1729100000000-AccountingPostingEvents';
import { Supplier } from '../entities/Supplier';
import { SupplierContact } from '../entities/SupplierContact';
import { SupplierVariant } from '../entities/SupplierVariant';
import { Warehouse } from '../entities/Warehouse';
import { WarehouseLocation } from '../entities/WarehouseLocation';
import { PurchaseOrder } from '../entities/PurchaseOrder';
import { PurchaseOrderItem } from '../entities/PurchaseOrderItem';
import { GoodsReceipt } from '../entities/GoodsReceipt';
import { GoodsReceiptItem } from '../entities/GoodsReceiptItem';
import { StockMovement } from '../entities/StockMovement';
import { InventoryLot } from '../entities/InventoryLot';
import { InventoryTransfer } from '../entities/InventoryTransfer';
import { InventoryTransferItem } from '../entities/InventoryTransferItem';
import { InventoryReservation } from '../entities/InventoryReservation';
import { ProcurementInventoryFoundation1729200000000 } from '../migrations/1729200000000-ProcurementInventoryFoundation';
import { POSSession } from '../entities/POSSession';
import { POSSale } from '../entities/POSSale';
import { POSSaleItem } from '../entities/POSSaleItem';
import { POSSalePayment } from '../entities/POSSalePayment';
import { POSReturn } from '../entities/POSReturn';
import { POSReturnItem } from '../entities/POSReturnItem';
import { POSCashierFoundation1729300000000 } from '../migrations/1729300000000-POSCashierFoundation';
import { PrescriptionRequest } from '../entities/PrescriptionRequest';
import { PrescriptionRequestFile } from '../entities/PrescriptionRequestFile';
import { PrescriptionRequestStatusEvent } from '../entities/PrescriptionRequestStatusEvent';
import { PrescriptionRequestItemDraft } from '../entities/PrescriptionRequestItemDraft';
import { PrescriptionRequestFoundation1729400000000 } from '../migrations/1729400000000-PrescriptionRequestFoundation';
import { ProductAlias } from '../entities/ProductAlias';
import { StoreVariantPriceOverride } from '../entities/StoreVariantPriceOverride';
import { ProductImportMapping } from '../entities/ProductImportMapping';
import { PriceImportSession } from '../entities/PriceImportSession';
import { PriceImportRow } from '../entities/PriceImportRow';
import { ProductAliasAndPriceImportFoundation1729500000000 } from '../migrations/1729500000000-ProductAliasAndPriceImportFoundation';
import PROD from "../utils/PROD";

let db: DataSource | null = null;

export function getDataSource(sync=false): DataSource {
  if (db) return db;

  db = new DataSource({
    type: 'mysql',
      host: PROD ?'mysql-190437-0.cloudclusters.net' :'localhost',
      port: Number(PROD ? '10090':3306),
      username: PROD?'cloud_functions':'root',
      password: PROD?'WNb2cN&PY,$65U-jWA^JdBZ5S7(y]7E`tY=^ztfaK<9NGgF@fV`FV[]y':'',
      database: PROD?'aio':'aio',
      synchronize: sync,
    logging: !PROD,
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
      ProductCategory,
      ProductBaseMedia,
      StoreProductMediaOverride,
      ProductAlias,
      StoreVariantPriceOverride,
      InventoryAdjustment,
      ProductPrefixMapping,
      ProductImportMapping,
      InventoryImportBatch,
      InventoryImportRow,
      PriceImportSession,
      PriceImportRow,
      InventoryBalance,
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
      Order,
      OrderItem,
      OrderStatusEvent,
      Shipment,
      TrackingEvent,
      PaymentSession,
      StorePaymentSetting,
      InsuranceOrder,
      InsuranceFile,
      InsuranceItem,
      InsuranceStatusEvent,
      RiskRule,
      RiskFlag,
      Branch,
      Device,
      Employee,
      Drawer,
      DrawerSession,
      LedgerEntry,
      Return,
      ReturnItem,
      Refund,
      EdgeNode,
      EdgeIngestedEvent,
      DineInTable,
      DineInSession,
      DineInWaiterCall,
      OrderReview,
      AuthPhonePasswordCredential,
      ProductImportReference,
      AccountingAccount,
      AccountingPeriod,
      AccountingJournalEntry,
      AccountingJournalEntryLine,
      AccountingPostingRule,
      AccountingPostingEvent,
      Supplier,
      SupplierContact,
      SupplierVariant,
      Warehouse,
      WarehouseLocation,
      PurchaseOrder,
      PurchaseOrderItem,
      GoodsReceipt,
      GoodsReceiptItem,
      StockMovement,
      InventoryLot,
      InventoryTransfer,
      InventoryTransferItem,
      InventoryReservation,
      POSSession,
      POSSale,
      POSSaleItem,
      POSSalePayment,
      POSReturn,
      POSReturnItem,
      PrescriptionRequest,
      PrescriptionRequestFile,
      PrescriptionRequestStatusEvent,
      PrescriptionRequestItemDraft,
    ],
    migrations: [InitSchema1720000000000, Phase2AccountsStores1723000000000, Phase3CatalogHomeSeo1724000000000, Phase4CommerceMarketing1725000000000, Phase5OrdersInsuranceAccounting1726000000000, Phase6InventoryImport1727000000000, ReportsBasicIndexes1727100000000, ReportsMarketingIndexes1727200000000, AccountingLedgerIndexes1727400000000, EdgeSyncIngest1728000000000, DineInSecureTableSession1728100000000, ExplicitDeliveryZoneContract1728200000000, FawaterkPaymentSessionFields1728300000000, ProductImportReferences1728400000000, StoreFeatureVisibility1728500000000, ProductMetricsAndProductReviews1728600000000, PhonePasswordAuthFoundation1728700000000, HybridCatalogFoundation1728800000000, HybridCatalogIntegrity1728900000000, AccountingFoundation1729000000000, AccountingPostingEvents1729100000000, ProcurementInventoryFoundation1729200000000, POSCashierFoundation1729300000000, PrescriptionRequestFoundation1729400000000, ProductAliasAndPriceImportFoundation1729500000000],
  });

  return db;
}

export async function getInitializedDataSource(sync = false): Promise<DataSource> {
  const source = getDataSource(sync);
  if (!source.isInitialized) {
    await source.initialize();
  }
  return source;
}
