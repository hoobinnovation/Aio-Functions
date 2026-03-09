import { publicHealthPing, publicActionsList } from '../actions/public/publicActions';
import { publicDevSeedDummyData } from '../actions/handlers/public/dev/publicDevSeedDummyData';
import {
    publicCatalogGetHome,
    publicCatalogGetCategories,
    publicCatalogListProducts,
    publicCatalogSearchProducts,
    publicCatalogGetFilters,
    publicProductGetById,
    publicProductGetBySlug,
    publicCategoryGetById,
    publicCategoryGetBySlug,
    publicSeoGetPageMeta,
    publicSeoGetLanding,
} from '../actions/public/catalogPublicActions';
import {
    clientHealthWhoAmI,
    clientActionsList,
    authEnsureUserProfile,
    profileGet,
    profileUpdate,
    accountDeleteRequest,
    addressesList,
    addressesCreate,
    addressesUpdate,
    addressesDelete,
    addressesSetDefault,
    storesList,
    storesGet,
    storeContextGetMyStore,
    storeContextSetMyStore,
    mediaCreateUploadSpec,
    mediaFinalizeUpload,
} from '../actions/client/clientActions';
import {
    checkoutCreatePaymentSession,
    paymentsStatus,
    paymentsConfirm,
    ordersList,
    ordersGet,
    ordersTracking,
    ordersInvoiceUrl,
    ordersReorder,
    insuranceCreateDraft,
    insuranceAttachFiles,
    insuranceSubmit,
    insuranceGet,
    insuranceApproveQuote,
    insuranceRejectQuote,
    insuranceListMyOrders,
} from '../actions/client/ordersClientActions';
import {
    cartGet,
    cartAddItem,
    cartUpdateQty,
    cartRemoveItem,
    cartClear,
    cartApplyCoupon,
    cartRemoveCoupon,
    shippingListMethods,
    shippingQuoteDelivery,
    checkoutPreview,
    notificationsRegisterToken,
    notificationsList,
    notificationsMarkRead,
    notificationsMarkAllRead,
    notificationsDelete,
    loyaltyGetDashboard,
    loyaltyListTransactions,
    loyaltyRedeem,
    walletGet,
    walletHistory,
    marketingCapture,
    alertsGetPrefs,
    alertsUpdatePrefs,
    alertsSubscribeBackInStock,
    recoGetSimilar,
    recoGetCartUpsell,
    postPurchaseGetNudges,
    supportCreateTicket,
    supportListTickets,
    supportGetTicket,
    supportAddMessage,
    supportCloseTicket,
    settingsGet,
    settingsUpdate,
    legalGetDocs,
    reviewsCanReview,
    reviewsCreate,
} from '../actions/client/commerceClientActions';
import {
    homeGetLayout,
    catalogGetCategories,
    catalogListProducts,
    productFavoritesList,
    productFavoritesToggle,
    storeFavoritesList,
    storeFavoritesToggle,
} from '../actions/client/catalogClientActions';
import {
    dineInScanTableCode,
    dineInGetSession,
    dineInCloseSession,
    dineInCallWaiter,
    dineInRequestBill,
} from '../actions/client/dineInClientActions';
import {
    adminHealthWhoAmI,
    adminHealthDbCheck,
    adminHealthActionsCoverage,
    adminActionsList,
    adminMe,
    adminStoresList,
    adminStoresGet,
    adminStoresCreate,
    adminStoresUpdate,
    adminStoresDisable,
    adminStoreSettingsGet,
    adminStoreSettingsUpdate,
    adminCustomersList,
    adminCustomersGet,
    adminCustomersUpdate,
    adminCustomersDisable,
    adminCustomersSearch,
    adminMediaCreateUploadSpec,
    adminMediaFinalizeUpload,
} from '../actions/admin/adminActions';
import {
    adminOrdersList,
    adminOrdersGet,
    adminOrdersUpdateStatus,
    adminOrdersSetTracking,
    adminOrdersAddInternalNote,
    adminOrdersInvoiceUrl,
    adminOrdersTrackingGet,
    adminOrdersTrackingAddEvent,
    adminOrdersTrackingDeleteEvent,
    adminOrdersTrackingUpdateShipment,
    adminRiskRulesGet,
    adminRiskRulesUpdate,
    adminRiskFlaggedOrdersList,
    adminRiskFlaggedOrdersResolve,
    adminBranchesList,
    adminBranchesCreate,
    adminBranchesUpdate,
    adminBranchesDisable,
    adminDevicesList,
    adminDevicesCreate,
    adminDevicesUpdate,
    adminDevicesDisable,
    adminEmployeesList,
    adminEmployeesCreate,
    adminEmployeesUpdate,
    adminEmployeesDisable,
    adminDrawersList,
    adminDrawersCreate,
    adminDrawersUpdate,
    adminDrawersDisable,
    adminDrawerSessionsOpen,
    adminDrawerSessionsClose,
    adminAccountingCreateExpense,
    adminAccountingCreateAdjustment,
    adminAccountingCreatePOSSale,
    adminReturnsList,
    adminReturnsGet,
    adminReturnsApprove,
    adminReturnsReject,
    adminReturnsRefundPartial,
    adminReturnsRefundFull,
    adminReturnsUpdateStatus,
} from '../actions/admin/ordersAdminActions';
import {
    adminCategoriesList,
    adminCategoriesGet,
    adminCategoriesCreate,
    adminCategoriesUpdate,
    adminCategoriesDisable,
    adminBannersList,
    adminBannersGet,
    adminBannersCreate,
    adminBannersUpdate,
    adminBannersDisable,
    adminFeaturedList,
    adminFeaturedSearchProducts,
    adminFeaturedSet,
    adminProductsList,
    adminProductsGet,
    adminProductsCreate,
    adminProductsUpdate,
    adminProductsDisable,
    adminProductImagesList,
    adminProductImagesAdd,
    adminProductImagesRemove,
    adminProductImagesReorder,
    adminProductSpecsList,
    adminProductSpecsCreate,
    adminProductSpecsUpdate,
    adminProductSpecsDelete,
    adminProductVariantsList,
    adminProductVariantsCreate,
    adminProductVariantsUpdate,
    adminProductVariantsDelete,
    adminProductVariantsBulkStockUpdate,
    adminInventoryAdjust,
    adminInventoryHistory,
    adminInventoryLowStockReport,
    adminHomeSectionsList,
    adminHomeSectionsGet,
    adminHomeSectionsCreate,
    adminHomeSectionsUpdate,
    adminHomeSectionsDisable,
    adminHomeSectionsReorder,
    adminSeoGet,
    adminSeoUpdate,
    adminLandingPagesList,
    adminLandingPagesGet,
    adminLandingPagesCreate,
    adminLandingPagesUpdate,
    adminLandingPagesPublish,
    adminLandingPagesUnpublish,
    adminLandingPagesDisable,
    adminSitemapRegenerate,
} from '../actions/admin/catalogAdminActions';
import { ActionHandler } from '../core/protocol';
import { adminProductsBulkImportFromJson } from '../actions/admin/productsBulkImportAdminActions';
import {
    adminInsuranceList,
    adminInsuranceGet,
    adminInsuranceAddItem,
    adminInsuranceUpdateItem,
    adminInsuranceRemoveItem,
    adminInsuranceLockQuote,
    adminInsuranceSendQuote,
    adminInsuranceSetShipmentTracking,
} from '../actions/admin/insuranceAdminActions';
import {
    adminInventoryImportCreateBatch,
    adminInventoryImportPreview,
    adminInventoryImportGetUnmappedPrefixes,
    adminInventoryImportResolvePrefixes,
    adminInventoryImportApply,
    adminInventoryImportGet,
} from '../actions/admin/inventoryImportAdminActions';
import {
    reportsOverview,
    reportsTopProducts,
    reportsOrdersByStatus,
    reportsInventorySummary,
    reportsCustomersSummary,
    reportsReturnsSummary,
    reportsLoyaltySummary,
    reportsCashbackSummary,
} from '../actions/admin/reportsBasicAdminActions';
import {
    adminReportsAttributionOverview,
    adminReportsTopCampaigns,
} from '../actions/admin/reportsMarketingAdminActions';
import { adminAccountingKpis, adminAccountingLedger } from '../actions/admin/accountingAdminActions';
import {
    adminDineInSettingsGet,
    adminDineInSettingsUpdate,
    adminDineInTablesList,
    adminDineInTablesGet,
    adminDineInTablesCreate,
    adminDineInTablesUpdate,
    adminDineInTablesDisable,
    adminDineInTablesGenerateQr,
    adminDineInTablesRegenerateQr,
    adminDineInTablesBulkGeneratePdfData,
    adminDineInSessionsList,
    adminDineInSessionsGet,
    adminDineInSessionsClose,
    adminDineInWaiterCallsList,
    adminDineInWaiterCallsGet,
    adminDineInWaiterCallsAcknowledge,
    adminDineInWaiterCallsResolve,
    adminDineInDashboardStats,
} from '../actions/admin/dineInAdminActions';
import {
    adminShippingMethodsList,
    adminShippingMethodsGet,
    adminShippingMethodsCreate,
    adminShippingMethodsUpdate,
    adminShippingMethodsDisable,
    adminDeliveryZonesList,
    adminDeliveryZonesGet,
    adminDeliveryZonesCreate,
    adminDeliveryZonesUpdate,
    adminDeliveryZonesDisable,
    adminCouponsList,
    adminCouponsGet,
    adminCouponsCreate,
    adminCouponsUpdate,
    adminCouponsDisable,
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
    adminNotificationsSend,
    adminNotificationsList,
    adminLoyaltyGetSettings,
    adminLoyaltyUpdateSettings,
    adminLoyaltyAdjustUserPoints,
    adminLoyaltyTiersList,
    adminLoyaltyTiersCreate,
    adminLoyaltyTiersUpdate,
    adminLoyaltyTiersDisable,
    adminPostPurchaseFlowsList,
    adminPostPurchaseFlowsGet,
    adminPostPurchaseFlowsCreate,
    adminPostPurchaseFlowsUpdate,
    adminPostPurchaseFlowsDisable,
    adminPostPurchaseRunsList,
} from '../actions/admin/commerceAdminActions';

const m = () => new Map<string, ActionHandler>();
const add = (r: Map<string, ActionHandler>, key: string, handler: ActionHandler) => {
    r.set(key, handler);
};

export const registryPublic = m();
add(registryPublic, 'publicHealthPing', publicHealthPing as ActionHandler);
add(registryPublic, 'publicActionsList', publicActionsList as ActionHandler);
add(registryPublic, 'publicDevSeedDummyData', publicDevSeedDummyData as ActionHandler);
add(registryPublic, 'publicCatalogGetHome', publicCatalogGetHome as ActionHandler);
add(registryPublic, 'publicCatalogGetCategories', publicCatalogGetCategories as ActionHandler);
add(registryPublic, 'publicCatalogListProducts', publicCatalogListProducts as ActionHandler);
add(registryPublic, 'publicCatalogSearchProducts', publicCatalogSearchProducts as ActionHandler);
add(registryPublic, 'publicCatalogGetFilters', publicCatalogGetFilters as ActionHandler);
add(registryPublic, 'publicProductGetById', publicProductGetById as ActionHandler);
add(registryPublic, 'publicProductGetBySlug', publicProductGetBySlug as ActionHandler);
add(registryPublic, 'publicCategoryGetById', publicCategoryGetById as ActionHandler);
add(registryPublic, 'publicCategoryGetBySlug', publicCategoryGetBySlug as ActionHandler);
add(registryPublic, 'publicSeoGetPageMeta', publicSeoGetPageMeta as ActionHandler);
add(registryPublic, 'publicSeoGetLanding', publicSeoGetLanding as ActionHandler);

export const registryClient = m();
add(registryClient, 'clientHealthWhoAmI', clientHealthWhoAmI as ActionHandler);
add(registryClient, 'clientActionsList', clientActionsList as ActionHandler);
add(registryClient, 'authEnsureUserProfile', authEnsureUserProfile as ActionHandler);
add(registryClient, 'profileGet', profileGet as ActionHandler);
add(registryClient, 'profileUpdate', profileUpdate as ActionHandler);
add(registryClient, 'accountDeleteRequest', accountDeleteRequest as ActionHandler);
add(registryClient, 'addressesList', addressesList as ActionHandler);
add(registryClient, 'addressesCreate', addressesCreate as ActionHandler);
add(registryClient, 'addressesUpdate', addressesUpdate as ActionHandler);
add(registryClient, 'addressesDelete', addressesDelete as ActionHandler);
add(registryClient, 'addressesSetDefault', addressesSetDefault as ActionHandler);
add(registryClient, 'storesList', storesList as ActionHandler);
add(registryClient, 'storesGet', storesGet as ActionHandler);
add(registryClient, 'storeContextGetMyStore', storeContextGetMyStore as ActionHandler);
add(registryClient, 'storeContextSetMyStore', storeContextSetMyStore as ActionHandler);
add(registryClient, 'homeGetLayout', homeGetLayout as ActionHandler);
add(registryClient, 'catalogGetCategories', catalogGetCategories as ActionHandler);
add(registryClient, 'catalogListProducts', catalogListProducts as ActionHandler);
add(registryClient, 'productFavoritesList', productFavoritesList as ActionHandler);
add(registryClient, 'productFavoritesToggle', productFavoritesToggle as ActionHandler);
add(registryClient, 'storeFavoritesList', storeFavoritesList as ActionHandler);
add(registryClient, 'storeFavoritesToggle', storeFavoritesToggle as ActionHandler);
add(registryClient, 'mediaCreateUploadSpec', mediaCreateUploadSpec as ActionHandler);
add(registryClient, 'mediaFinalizeUpload', mediaFinalizeUpload as ActionHandler);
add(registryClient, 'cartGet', cartGet as ActionHandler);
add(registryClient, 'cartAddItem', cartAddItem as ActionHandler);
add(registryClient, 'cartUpdateQty', cartUpdateQty as ActionHandler);
add(registryClient, 'cartRemoveItem', cartRemoveItem as ActionHandler);
add(registryClient, 'cartClear', cartClear as ActionHandler);
add(registryClient, 'cartApplyCoupon', cartApplyCoupon as ActionHandler);
add(registryClient, 'cartRemoveCoupon', cartRemoveCoupon as ActionHandler);
add(registryClient, 'shippingListMethods', shippingListMethods as ActionHandler);
add(registryClient, 'shippingQuoteDelivery', shippingQuoteDelivery as ActionHandler);
add(registryClient, 'checkoutPreview', checkoutPreview as ActionHandler);
add(registryClient, 'notificationsRegisterToken', notificationsRegisterToken as ActionHandler);
add(registryClient, 'notificationsList', notificationsList as ActionHandler);
add(registryClient, 'notificationsMarkRead', notificationsMarkRead as ActionHandler);
add(registryClient, 'notificationsMarkAllRead', notificationsMarkAllRead as ActionHandler);
add(registryClient, 'notificationsDelete', notificationsDelete as ActionHandler);
add(registryClient, 'loyaltyGetDashboard', loyaltyGetDashboard as ActionHandler);
add(registryClient, 'loyaltyListTransactions', loyaltyListTransactions as ActionHandler);
add(registryClient, 'loyaltyRedeem', loyaltyRedeem as ActionHandler);
add(registryClient, 'walletGet', walletGet as ActionHandler);
add(registryClient, 'walletHistory', walletHistory as ActionHandler);
add(registryClient, 'marketingCapture', marketingCapture as ActionHandler);
add(registryClient, 'alertsGetPrefs', alertsGetPrefs as ActionHandler);
add(registryClient, 'alertsUpdatePrefs', alertsUpdatePrefs as ActionHandler);
add(registryClient, 'alertsSubscribeBackInStock', alertsSubscribeBackInStock as ActionHandler);
add(registryClient, 'recoGetSimilar', recoGetSimilar as ActionHandler);
add(registryClient, 'recoGetCartUpsell', recoGetCartUpsell as ActionHandler);
add(registryClient, 'postPurchaseGetNudges', postPurchaseGetNudges as ActionHandler);
add(registryClient, 'supportCreateTicket', supportCreateTicket as ActionHandler);
add(registryClient, 'supportListTickets', supportListTickets as ActionHandler);
add(registryClient, 'supportGetTicket', supportGetTicket as ActionHandler);
add(registryClient, 'supportAddMessage', supportAddMessage as ActionHandler);
add(registryClient, 'supportCloseTicket', supportCloseTicket as ActionHandler);
add(registryClient, 'settingsGet', settingsGet as ActionHandler);
add(registryClient, 'settingsUpdate', settingsUpdate as ActionHandler);
add(registryClient, 'legalGetDocs', legalGetDocs as ActionHandler);
add(registryClient, 'checkoutCreatePaymentSession', checkoutCreatePaymentSession as ActionHandler);
add(registryClient, 'paymentsStatus', paymentsStatus as ActionHandler);
add(registryClient, 'paymentsConfirm', paymentsConfirm as ActionHandler);
add(registryClient, 'ordersList', ordersList as ActionHandler);
add(registryClient, 'ordersGet', ordersGet as ActionHandler);
add(registryClient, 'ordersTracking', ordersTracking as ActionHandler);
add(registryClient, 'ordersInvoiceUrl', ordersInvoiceUrl as ActionHandler);
add(registryClient, 'ordersReorder', ordersReorder as ActionHandler);
add(registryClient, 'insuranceCreateDraft', insuranceCreateDraft as ActionHandler);
add(registryClient, 'insuranceAttachFiles', insuranceAttachFiles as ActionHandler);
add(registryClient, 'insuranceSubmit', insuranceSubmit as ActionHandler);
add(registryClient, 'insuranceGet', insuranceGet as ActionHandler);
add(registryClient, 'insuranceApproveQuote', insuranceApproveQuote as ActionHandler);
add(registryClient, 'insuranceRejectQuote', insuranceRejectQuote as ActionHandler);
add(registryClient, 'insuranceListMyOrders', insuranceListMyOrders as ActionHandler);
add(registryClient, 'dineInScanTableCode', dineInScanTableCode as ActionHandler);
add(registryClient, 'dineInGetSession', dineInGetSession as ActionHandler);
add(registryClient, 'dineInCloseSession', dineInCloseSession as ActionHandler);
add(registryClient, 'dineInCallWaiter', dineInCallWaiter as ActionHandler);
add(registryClient, 'dineInRequestBill', dineInRequestBill as ActionHandler);
add(registryClient, 'reviewsCanReview', reviewsCanReview as ActionHandler);
add(registryClient, 'reviewsCreate', reviewsCreate as ActionHandler);

export const registryAdmin = m();
add(registryAdmin, 'adminHealthWhoAmI', adminHealthWhoAmI as ActionHandler);
add(registryAdmin, 'adminHealthDbCheck', adminHealthDbCheck as ActionHandler);
add(registryAdmin, 'adminHealthActionsCoverage', adminHealthActionsCoverage as ActionHandler);
add(registryAdmin, 'adminActionsList', adminActionsList as ActionHandler);
add(registryAdmin, 'adminMe', adminMe as ActionHandler);
add(registryAdmin, 'adminStoresList', adminStoresList as ActionHandler);
add(registryAdmin, 'adminStoresGet', adminStoresGet as ActionHandler);
add(registryAdmin, 'adminStoresCreate', adminStoresCreate as ActionHandler);
add(registryAdmin, 'adminStoresUpdate', adminStoresUpdate as ActionHandler);
add(registryAdmin, 'adminStoresDisable', adminStoresDisable as ActionHandler);
add(registryAdmin, 'adminStoreSettingsGet', adminStoreSettingsGet as ActionHandler);
add(registryAdmin, 'adminStoreSettingsUpdate', adminStoreSettingsUpdate as ActionHandler);
add(registryAdmin, 'adminCustomersList', adminCustomersList as ActionHandler);
add(registryAdmin, 'adminCustomersGet', adminCustomersGet as ActionHandler);
add(registryAdmin, 'adminCustomersUpdate', adminCustomersUpdate as ActionHandler);
add(registryAdmin, 'adminCustomersDisable', adminCustomersDisable as ActionHandler);
add(registryAdmin, 'adminCustomersSearch', adminCustomersSearch as ActionHandler);
add(registryAdmin, 'adminCategoriesList', adminCategoriesList as ActionHandler);
add(registryAdmin, 'adminCategoriesGet', adminCategoriesGet as ActionHandler);
add(registryAdmin, 'adminCategoriesCreate', adminCategoriesCreate as ActionHandler);
add(registryAdmin, 'adminCategoriesUpdate', adminCategoriesUpdate as ActionHandler);
add(registryAdmin, 'adminCategoriesDisable', adminCategoriesDisable as ActionHandler);
add(registryAdmin, 'adminBannersList', adminBannersList as ActionHandler);
add(registryAdmin, 'adminBannersGet', adminBannersGet as ActionHandler);
add(registryAdmin, 'adminBannersCreate', adminBannersCreate as ActionHandler);
add(registryAdmin, 'adminBannersUpdate', adminBannersUpdate as ActionHandler);
add(registryAdmin, 'adminBannersDisable', adminBannersDisable as ActionHandler);
add(registryAdmin, 'adminFeaturedList', adminFeaturedList as ActionHandler);
add(registryAdmin, 'adminFeaturedSearchProducts', adminFeaturedSearchProducts as ActionHandler);
add(registryAdmin, 'adminFeaturedSet', adminFeaturedSet as ActionHandler);
add(registryAdmin, 'adminProductsList', adminProductsList as ActionHandler);
add(registryAdmin, 'adminProductsGet', adminProductsGet as ActionHandler);
add(registryAdmin, 'adminProductsCreate', adminProductsCreate as ActionHandler);
add(registryAdmin, 'adminProductsUpdate', adminProductsUpdate as ActionHandler);
add(registryAdmin, 'adminProductsDisable', adminProductsDisable as ActionHandler);
add(registryAdmin, 'adminProductsBulkImportFromJson', adminProductsBulkImportFromJson as ActionHandler);
add(registryAdmin, 'adminProductImagesList', adminProductImagesList as ActionHandler);
add(registryAdmin, 'adminProductImagesAdd', adminProductImagesAdd as ActionHandler);
add(registryAdmin, 'adminProductImagesRemove', adminProductImagesRemove as ActionHandler);
add(registryAdmin, 'adminProductImagesReorder', adminProductImagesReorder as ActionHandler);
add(registryAdmin, 'adminProductSpecsList', adminProductSpecsList as ActionHandler);
add(registryAdmin, 'adminProductSpecsCreate', adminProductSpecsCreate as ActionHandler);
add(registryAdmin, 'adminProductSpecsUpdate', adminProductSpecsUpdate as ActionHandler);
add(registryAdmin, 'adminProductSpecsDelete', adminProductSpecsDelete as ActionHandler);
add(registryAdmin, 'adminProductVariantsList', adminProductVariantsList as ActionHandler);
add(registryAdmin, 'adminProductVariantsCreate', adminProductVariantsCreate as ActionHandler);
add(registryAdmin, 'adminProductVariantsUpdate', adminProductVariantsUpdate as ActionHandler);
add(registryAdmin, 'adminProductVariantsDelete', adminProductVariantsDelete as ActionHandler);
add(registryAdmin, 'adminProductVariantsBulkStockUpdate', adminProductVariantsBulkStockUpdate as ActionHandler);
add(registryAdmin, 'adminInventoryAdjust', adminInventoryAdjust as ActionHandler);
add(registryAdmin, 'adminInventoryHistory', adminInventoryHistory as ActionHandler);
add(registryAdmin, 'adminInventoryLowStockReport', adminInventoryLowStockReport as ActionHandler);
add(registryAdmin, 'adminHomeSectionsList', adminHomeSectionsList as ActionHandler);
add(registryAdmin, 'adminHomeSectionsGet', adminHomeSectionsGet as ActionHandler);
add(registryAdmin, 'adminHomeSectionsCreate', adminHomeSectionsCreate as ActionHandler);
add(registryAdmin, 'adminHomeSectionsUpdate', adminHomeSectionsUpdate as ActionHandler);
add(registryAdmin, 'adminHomeSectionsDisable', adminHomeSectionsDisable as ActionHandler);
add(registryAdmin, 'adminHomeSectionsReorder', adminHomeSectionsReorder as ActionHandler);
add(registryAdmin, 'adminSeoGet', adminSeoGet as ActionHandler);
add(registryAdmin, 'adminSeoUpdate', adminSeoUpdate as ActionHandler);
add(registryAdmin, 'adminLandingPagesList', adminLandingPagesList as ActionHandler);
add(registryAdmin, 'adminLandingPagesGet', adminLandingPagesGet as ActionHandler);
add(registryAdmin, 'adminLandingPagesCreate', adminLandingPagesCreate as ActionHandler);
add(registryAdmin, 'adminLandingPagesUpdate', adminLandingPagesUpdate as ActionHandler);
add(registryAdmin, 'adminLandingPagesPublish', adminLandingPagesPublish as ActionHandler);
add(registryAdmin, 'adminLandingPagesUnpublish', adminLandingPagesUnpublish as ActionHandler);
add(registryAdmin, 'adminLandingPagesDisable', adminLandingPagesDisable as ActionHandler);
add(registryAdmin, 'adminSitemapRegenerate', adminSitemapRegenerate as ActionHandler);
add(registryAdmin, 'adminMediaCreateUploadSpec', adminMediaCreateUploadSpec as ActionHandler);
add(registryAdmin, 'adminMediaFinalizeUpload', adminMediaFinalizeUpload as ActionHandler);
add(registryAdmin, 'adminOrdersList', adminOrdersList as ActionHandler);
add(registryAdmin, 'adminOrdersGet', adminOrdersGet as ActionHandler);
add(registryAdmin, 'adminOrdersUpdateStatus', adminOrdersUpdateStatus as ActionHandler);
add(registryAdmin, 'adminOrdersSetTracking', adminOrdersSetTracking as ActionHandler);
add(registryAdmin, 'adminOrdersAddInternalNote', adminOrdersAddInternalNote as ActionHandler);
add(registryAdmin, 'adminOrdersInvoiceUrl', adminOrdersInvoiceUrl as ActionHandler);
add(registryAdmin, 'adminOrdersTrackingGet', adminOrdersTrackingGet as ActionHandler);
add(registryAdmin, 'adminOrdersTrackingAddEvent', adminOrdersTrackingAddEvent as ActionHandler);
add(registryAdmin, 'adminOrdersTrackingDeleteEvent', adminOrdersTrackingDeleteEvent as ActionHandler);
add(registryAdmin, 'adminOrdersTrackingUpdateShipment', adminOrdersTrackingUpdateShipment as ActionHandler);
add(registryAdmin, 'adminInsuranceList', adminInsuranceList as ActionHandler);
add(registryAdmin, 'adminInsuranceGet', adminInsuranceGet as ActionHandler);
add(registryAdmin, 'adminInsuranceAddItem', adminInsuranceAddItem as ActionHandler);
add(registryAdmin, 'adminInsuranceUpdateItem', adminInsuranceUpdateItem as ActionHandler);
add(registryAdmin, 'adminInsuranceRemoveItem', adminInsuranceRemoveItem as ActionHandler);
add(registryAdmin, 'adminInsuranceLockQuote', adminInsuranceLockQuote as ActionHandler);
add(registryAdmin, 'adminInsuranceSendQuote', adminInsuranceSendQuote as ActionHandler);
add(registryAdmin, 'adminInsuranceSetShipmentTracking', adminInsuranceSetShipmentTracking as ActionHandler);
add(registryAdmin, 'adminInventoryImportCreateBatch', adminInventoryImportCreateBatch as ActionHandler);
add(registryAdmin, 'adminInventoryImportPreview', adminInventoryImportPreview as ActionHandler);
add(registryAdmin, 'adminInventoryImportGetUnmappedPrefixes', adminInventoryImportGetUnmappedPrefixes as ActionHandler);
add(registryAdmin, 'adminInventoryImportResolvePrefixes', adminInventoryImportResolvePrefixes as ActionHandler);
add(registryAdmin, 'adminInventoryImportApply', adminInventoryImportApply as ActionHandler);
add(registryAdmin, 'adminInventoryImportGet', adminInventoryImportGet as ActionHandler);
add(registryAdmin, 'adminRiskRulesGet', adminRiskRulesGet as ActionHandler);
add(registryAdmin, 'adminRiskRulesUpdate', adminRiskRulesUpdate as ActionHandler);
add(registryAdmin, 'adminRiskFlaggedOrdersList', adminRiskFlaggedOrdersList as ActionHandler);
add(registryAdmin, 'adminRiskFlaggedOrdersResolve', adminRiskFlaggedOrdersResolve as ActionHandler);
add(registryAdmin, 'adminBranchesList', adminBranchesList as ActionHandler);
add(registryAdmin, 'adminBranchesCreate', adminBranchesCreate as ActionHandler);
add(registryAdmin, 'adminBranchesUpdate', adminBranchesUpdate as ActionHandler);
add(registryAdmin, 'adminBranchesDisable', adminBranchesDisable as ActionHandler);
add(registryAdmin, 'adminDevicesList', adminDevicesList as ActionHandler);
add(registryAdmin, 'adminDevicesCreate', adminDevicesCreate as ActionHandler);
add(registryAdmin, 'adminDevicesUpdate', adminDevicesUpdate as ActionHandler);
add(registryAdmin, 'adminDevicesDisable', adminDevicesDisable as ActionHandler);
add(registryAdmin, 'adminEmployeesList', adminEmployeesList as ActionHandler);
add(registryAdmin, 'adminEmployeesCreate', adminEmployeesCreate as ActionHandler);
add(registryAdmin, 'adminEmployeesUpdate', adminEmployeesUpdate as ActionHandler);
add(registryAdmin, 'adminEmployeesDisable', adminEmployeesDisable as ActionHandler);
add(registryAdmin, 'adminDrawersList', adminDrawersList as ActionHandler);
add(registryAdmin, 'adminDrawersCreate', adminDrawersCreate as ActionHandler);
add(registryAdmin, 'adminDrawersUpdate', adminDrawersUpdate as ActionHandler);
add(registryAdmin, 'adminDrawersDisable', adminDrawersDisable as ActionHandler);
add(registryAdmin, 'adminDrawerSessionsOpen', adminDrawerSessionsOpen as ActionHandler);
add(registryAdmin, 'adminDrawerSessionsClose', adminDrawerSessionsClose as ActionHandler);
add(registryAdmin, 'adminAccountingKpis', adminAccountingKpis as ActionHandler);
add(registryAdmin, 'adminAccountingLedger', adminAccountingLedger as ActionHandler);
add(registryAdmin, 'adminAccountingCreateExpense', adminAccountingCreateExpense as ActionHandler);
add(registryAdmin, 'adminAccountingCreateAdjustment', adminAccountingCreateAdjustment as ActionHandler);
add(registryAdmin, 'adminAccountingCreatePOSSale', adminAccountingCreatePOSSale as ActionHandler);
add(registryAdmin, 'reportsOverview', reportsOverview as ActionHandler);
add(registryAdmin, 'reportsTopProducts', reportsTopProducts as ActionHandler);
add(registryAdmin, 'reportsOrdersByStatus', reportsOrdersByStatus as ActionHandler);
add(registryAdmin, 'reportsInventorySummary', reportsInventorySummary as ActionHandler);
add(registryAdmin, 'reportsCustomersSummary', reportsCustomersSummary as ActionHandler);
add(registryAdmin, 'reportsReturnsSummary', reportsReturnsSummary as ActionHandler);
add(registryAdmin, 'reportsLoyaltySummary', reportsLoyaltySummary as ActionHandler);
add(registryAdmin, 'reportsCashbackSummary', reportsCashbackSummary as ActionHandler);
add(registryAdmin, 'adminReturnsList', adminReturnsList as ActionHandler);
add(registryAdmin, 'adminReturnsGet', adminReturnsGet as ActionHandler);
add(registryAdmin, 'adminReturnsApprove', adminReturnsApprove as ActionHandler);
add(registryAdmin, 'adminReturnsReject', adminReturnsReject as ActionHandler);
add(registryAdmin, 'adminReturnsRefundPartial', adminReturnsRefundPartial as ActionHandler);
add(registryAdmin, 'adminReturnsRefundFull', adminReturnsRefundFull as ActionHandler);
add(registryAdmin, 'adminReturnsUpdateStatus', adminReturnsUpdateStatus as ActionHandler);
add(registryAdmin, 'adminShippingMethodsList', adminShippingMethodsList as ActionHandler);
add(registryAdmin, 'adminShippingMethodsGet', adminShippingMethodsGet as ActionHandler);
add(registryAdmin, 'adminShippingMethodsCreate', adminShippingMethodsCreate as ActionHandler);
add(registryAdmin, 'adminShippingMethodsUpdate', adminShippingMethodsUpdate as ActionHandler);
add(registryAdmin, 'adminShippingMethodsDisable', adminShippingMethodsDisable as ActionHandler);
add(registryAdmin, 'adminDeliveryZonesList', adminDeliveryZonesList as ActionHandler);
add(registryAdmin, 'adminDeliveryZonesGet', adminDeliveryZonesGet as ActionHandler);
add(registryAdmin, 'adminDeliveryZonesCreate', adminDeliveryZonesCreate as ActionHandler);
add(registryAdmin, 'adminDeliveryZonesUpdate', adminDeliveryZonesUpdate as ActionHandler);
add(registryAdmin, 'adminDeliveryZonesDisable', adminDeliveryZonesDisable as ActionHandler);
add(registryAdmin, 'adminCouponsList', adminCouponsList as ActionHandler);
add(registryAdmin, 'adminCouponsGet', adminCouponsGet as ActionHandler);
add(registryAdmin, 'adminCouponsCreate', adminCouponsCreate as ActionHandler);
add(registryAdmin, 'adminCouponsUpdate', adminCouponsUpdate as ActionHandler);
add(registryAdmin, 'adminCouponsDisable', adminCouponsDisable as ActionHandler);
add(registryAdmin, 'adminCashbackList', adminCashbackList as ActionHandler);
add(registryAdmin, 'adminCashbackGet', adminCashbackGet as ActionHandler);
add(registryAdmin, 'adminCashbackCreate', adminCashbackCreate as ActionHandler);
add(registryAdmin, 'adminCashbackUpdate', adminCashbackUpdate as ActionHandler);
add(registryAdmin, 'adminCashbackDisable', adminCashbackDisable as ActionHandler);
add(registryAdmin, 'adminDiscountsList', adminDiscountsList as ActionHandler);
add(registryAdmin, 'adminDiscountsGet', adminDiscountsGet as ActionHandler);
add(registryAdmin, 'adminDiscountsCreate', adminDiscountsCreate as ActionHandler);
add(registryAdmin, 'adminDiscountsUpdate', adminDiscountsUpdate as ActionHandler);
add(registryAdmin, 'adminDiscountsDisable', adminDiscountsDisable as ActionHandler);
add(registryAdmin, 'adminDiscountsPreviewAudienceCount', adminDiscountsPreviewAudienceCount as ActionHandler);
add(registryAdmin, 'adminNotificationsSend', adminNotificationsSend as ActionHandler);
add(registryAdmin, 'adminNotificationsList', adminNotificationsList as ActionHandler);
add(registryAdmin, 'adminLoyaltyGetSettings', adminLoyaltyGetSettings as ActionHandler);
add(registryAdmin, 'adminLoyaltyUpdateSettings', adminLoyaltyUpdateSettings as ActionHandler);
add(registryAdmin, 'adminLoyaltyAdjustUserPoints', adminLoyaltyAdjustUserPoints as ActionHandler);
add(registryAdmin, 'adminLoyaltyTiersList', adminLoyaltyTiersList as ActionHandler);
add(registryAdmin, 'adminLoyaltyTiersCreate', adminLoyaltyTiersCreate as ActionHandler);
add(registryAdmin, 'adminLoyaltyTiersUpdate', adminLoyaltyTiersUpdate as ActionHandler);
add(registryAdmin, 'adminLoyaltyTiersDisable', adminLoyaltyTiersDisable as ActionHandler);
add(registryAdmin, 'adminReportsAttributionOverview', adminReportsAttributionOverview as ActionHandler);
add(registryAdmin, 'adminReportsTopCampaigns', adminReportsTopCampaigns as ActionHandler);
add(registryAdmin, 'adminPostPurchaseFlowsList', adminPostPurchaseFlowsList as ActionHandler);
add(registryAdmin, 'adminPostPurchaseFlowsGet', adminPostPurchaseFlowsGet as ActionHandler);
add(registryAdmin, 'adminPostPurchaseFlowsCreate', adminPostPurchaseFlowsCreate as ActionHandler);
add(registryAdmin, 'adminPostPurchaseFlowsUpdate', adminPostPurchaseFlowsUpdate as ActionHandler);
add(registryAdmin, 'adminPostPurchaseFlowsDisable', adminPostPurchaseFlowsDisable as ActionHandler);
add(registryAdmin, 'adminPostPurchaseRunsList', adminPostPurchaseRunsList as ActionHandler);
add(registryAdmin, 'adminDineInSettingsGet', adminDineInSettingsGet as ActionHandler);
add(registryAdmin, 'adminDineInSettingsUpdate', adminDineInSettingsUpdate as ActionHandler);
add(registryAdmin, 'adminDineInTablesList', adminDineInTablesList as ActionHandler);
add(registryAdmin, 'adminDineInTablesGet', adminDineInTablesGet as ActionHandler);
add(registryAdmin, 'adminDineInTablesCreate', adminDineInTablesCreate as ActionHandler);
add(registryAdmin, 'adminDineInTablesUpdate', adminDineInTablesUpdate as ActionHandler);
add(registryAdmin, 'adminDineInTablesDisable', adminDineInTablesDisable as ActionHandler);
add(registryAdmin, 'adminDineInTablesGenerateQr', adminDineInTablesGenerateQr as ActionHandler);
add(registryAdmin, 'adminDineInTablesRegenerateQr', adminDineInTablesRegenerateQr as ActionHandler);
add(registryAdmin, 'adminDineInTablesBulkGeneratePdfData', adminDineInTablesBulkGeneratePdfData as ActionHandler);
add(registryAdmin, 'adminDineInSessionsList', adminDineInSessionsList as ActionHandler);
add(registryAdmin, 'adminDineInSessionsGet', adminDineInSessionsGet as ActionHandler);
add(registryAdmin, 'adminDineInSessionsClose', adminDineInSessionsClose as ActionHandler);
add(registryAdmin, 'adminDineInWaiterCallsList', adminDineInWaiterCallsList as ActionHandler);
add(registryAdmin, 'adminDineInWaiterCallsGet', adminDineInWaiterCallsGet as ActionHandler);
add(registryAdmin, 'adminDineInWaiterCallsAcknowledge', adminDineInWaiterCallsAcknowledge as ActionHandler);
add(registryAdmin, 'adminDineInWaiterCallsResolve', adminDineInWaiterCallsResolve as ActionHandler);
add(registryAdmin, 'adminDineInDashboardStats', adminDineInDashboardStats as ActionHandler);
