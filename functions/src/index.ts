import { setGlobalOptions } from 'firebase-functions/v2';
import { checkoutCreatePaymentSession, checkoutPreview } from './callables/checkout';
import { shippingListMethods, shippingQuoteDelivery } from './callables/shipping';
import { paymentsConfirm, paymentsStatus } from './callables/payments';
import { ordersGet, ordersInvoiceUrl, ordersList, ordersReorder } from './callables/orders';
import { favoritesList, favoritesToggle } from './callables/favorites';
import { cartAddItem, cartApplyCoupon, cartGet, cartRemoveItem, cartSetItemQty } from './callables/cart';
import {
  adminOrdersAddInternalNote,
  adminOrdersGet,
  adminOrdersList,
  adminOrdersPrintInvoiceUrl,
  adminOrdersSetTracking,
  adminOrdersUpdateStatus,
} from './callables/admin/orders';
import {
  adminShippingMethodsCreate,
  adminShippingMethodsDisable,
  adminShippingMethodsList,
  adminShippingMethodsUpdate,
} from './callables/admin/shippingMethods';
import { adminPaymentSettingsGet, adminPaymentSettingsUpdate } from './callables/admin/paymentSettings';
import { adminCouponsCreate, adminCouponsDisable, adminCouponsList, adminCouponsUpdate } from './callables/admin/coupons';
import {
  adminProductsCreate,
  adminProductsList,
  adminProductsSetVariantStock,
  adminProductsUpdate,
} from './callables/admin/products';
import { invoiceHttp } from './http/invoice';

import {
  notificationsDelete,
  notificationsList,
  notificationsMarkAllRead,
  notificationsMarkRead,
  notificationsRegisterToken,
} from './callables/notifications';
import { loyaltyGetDashboard, loyaltyListTransactions, loyaltyRedeem } from './callables/loyalty';
import { reportsOverview, reportsOrdersByStatus, reportsTopProducts } from './callables/reports';
import { adminNotificationsList, adminNotificationsSend } from './callables/admin/notifications';
import {
  adminLoyaltyAdjustUserPoints,
  adminLoyaltyGetSettings,
  adminLoyaltyTiersCreate,
  adminLoyaltyTiersDelete,
  adminLoyaltyTiersList,
  adminLoyaltyTiersUpdate,
  adminLoyaltyUpdateSettings,
} from './callables/admin/loyalty';
import { notificationsDispatcher } from './http/notifications_dispatcher';
import { marketingCapture } from './callables/marketing';
import { insuranceApproveQuote, insuranceAttachFiles, insuranceCreateDraft, insuranceGet, insuranceRejectQuote, insuranceSubmit } from './callables/insurance';
import { adminInsuranceAddItem, adminInsuranceGet, adminInsuranceList, adminInsuranceLockQuote, adminInsuranceRemoveItem, adminInsuranceSendQuote, adminInsuranceSetShipmentTracking, adminInsuranceUpdateItem } from './callables/admin/insurance';
import { adminAccountingCloseDrawerSession, adminAccountingCreateExpense, adminAccountingCreatePOSSale, adminAccountingKpis, adminAccountingLedger, adminAccountingOpenDrawerSession } from './callables/admin/accounting';
import { adminReportsAttributionOverview, adminReportsTopCampaigns } from './callables/admin/attributionReports';

import { homeGetLayout } from './callables/home';
import { walletGet, walletHistory } from './callables/wallet';
import { ordersTracking } from './callables/ordersTracking';
import {
  adminHomeSectionsCreate,
  adminHomeSectionsDisable,
  adminHomeSectionsGet,
  adminHomeSectionsList,
  adminHomeSectionsReorder,
  adminHomeSectionsUpdate,
} from './callables/admin/homeSections';
import { adminCashbackCreate, adminCashbackDisable, adminCashbackGet, adminCashbackList, adminCashbackUpdate } from './callables/admin/cashback';
import {
  adminDiscountsCreate,
  adminDiscountsDisable,
  adminDiscountsGet,
  adminDiscountsList,
  adminDiscountsPreviewAudienceCount,
  adminDiscountsUpdate,
} from './callables/admin/discounts';
import {
  adminOrdersTrackingAddEvent,
  adminOrdersTrackingDeleteEvent,
  adminOrdersTrackingGet,
  adminOrdersTrackingUpdateShipment,
} from './callables/admin/ordersTracking';

setGlobalOptions({ region: 'us-central1', memory: '256MiB', timeoutSeconds: 60, maxInstances: 20 });

export {
  checkoutPreview,
  shippingListMethods,
  shippingQuoteDelivery,
  checkoutCreatePaymentSession,
  paymentsConfirm,
  paymentsStatus,
  ordersList,
  ordersGet,
  ordersInvoiceUrl,
  ordersReorder,
  favoritesList,
  favoritesToggle,
  cartGet,
  cartAddItem,
  cartSetItemQty,
  cartRemoveItem,
  cartApplyCoupon,
  adminOrdersList,
  adminOrdersGet,
  adminOrdersUpdateStatus,
  adminOrdersSetTracking,
  adminOrdersAddInternalNote,
  adminOrdersPrintInvoiceUrl,
  adminShippingMethodsList,
  adminShippingMethodsCreate,
  adminShippingMethodsUpdate,
  adminShippingMethodsDisable,
  adminPaymentSettingsGet,
  adminPaymentSettingsUpdate,
  adminCouponsList,
  adminCouponsCreate,
  adminCouponsUpdate,
  adminCouponsDisable,
  adminProductsList,
  adminProductsCreate,
  adminProductsUpdate,
  adminProductsSetVariantStock,
  invoiceHttp,

  notificationsRegisterToken,
  notificationsList,
  notificationsMarkRead,
  notificationsMarkAllRead,
  notificationsDelete,
  loyaltyGetDashboard,
  loyaltyListTransactions,
  loyaltyRedeem,
  reportsOverview,
  reportsTopProducts,
  reportsOrdersByStatus,
  adminNotificationsSend,
  adminNotificationsList,
  adminLoyaltyGetSettings,
  adminLoyaltyUpdateSettings,
  adminLoyaltyTiersList,
  adminLoyaltyTiersCreate,
  adminLoyaltyTiersUpdate,
  adminLoyaltyTiersDelete,
  adminLoyaltyAdjustUserPoints,
  notificationsDispatcher,

  homeGetLayout,
  walletGet,
  walletHistory,
  ordersTracking,
  adminHomeSectionsList,
  adminHomeSectionsGet,
  adminHomeSectionsCreate,
  adminHomeSectionsUpdate,
  adminHomeSectionsDisable,
  adminHomeSectionsReorder,
  adminCashbackList,
  adminCashbackGet,
  adminCashbackCreate,
  adminCashbackUpdate,
  adminCashbackDisable,
  adminDiscountsList,
  adminDiscountsGet,
  adminDiscountsCreate,
  adminDiscountsUpdate,
  adminDiscountsDisable,
  adminDiscountsPreviewAudienceCount,
  adminOrdersTrackingGet,
  adminOrdersTrackingAddEvent,
  adminOrdersTrackingDeleteEvent,
  adminOrdersTrackingUpdateShipment,

  marketingCapture,
  insuranceCreateDraft,
  insuranceAttachFiles,
  insuranceSubmit,
  insuranceGet,
  insuranceApproveQuote,
  insuranceRejectQuote,
  adminInsuranceList,
  adminInsuranceGet,
  adminInsuranceAddItem,
  adminInsuranceUpdateItem,
  adminInsuranceRemoveItem,
  adminInsuranceLockQuote,
  adminInsuranceSendQuote,
  adminInsuranceSetShipmentTracking,
  adminAccountingKpis,
  adminAccountingLedger,
  adminAccountingCreateExpense,
  adminAccountingOpenDrawerSession,
  adminAccountingCloseDrawerSession,
  adminAccountingCreatePOSSale,
  adminReportsAttributionOverview,
  adminReportsTopCampaigns,
};
