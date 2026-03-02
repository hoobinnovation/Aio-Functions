import { ActionHandler } from '../../types';
import { genericActionHandler } from '../shared';
import { mediaActionHandlers } from '../../../modules/media/actions';

export const adminMe: ActionHandler = genericActionHandler('admin', 'adminMe');
export const adminMediaCreateUploadSpec: ActionHandler = mediaActionHandlers.adminMediaCreateUploadSpec;
export const adminMediaFinalizeUpload: ActionHandler = mediaActionHandlers.adminMediaFinalizeUpload;
export const adminStoresList: ActionHandler = genericActionHandler('admin', 'adminStoresList');
export const adminStoresGet: ActionHandler = genericActionHandler('admin', 'adminStoresGet');
export const adminStoresCreate: ActionHandler = genericActionHandler('admin', 'adminStoresCreate');
export const adminStoresUpdate: ActionHandler = genericActionHandler('admin', 'adminStoresUpdate');
export const adminStoresDisable: ActionHandler = genericActionHandler('admin', 'adminStoresDisable');
export const adminStoreSettingsGet: ActionHandler = genericActionHandler('admin', 'adminStoreSettingsGet');
export const adminStoreSettingsUpdate: ActionHandler = genericActionHandler('admin', 'adminStoreSettingsUpdate');
export const adminCustomersList: ActionHandler = genericActionHandler('admin', 'adminCustomersList');
export const adminCustomersGet: ActionHandler = genericActionHandler('admin', 'adminCustomersGet');
export const adminCustomersUpdate: ActionHandler = genericActionHandler('admin', 'adminCustomersUpdate');
export const adminCustomersDisable: ActionHandler = genericActionHandler('admin', 'adminCustomersDisable');
export const adminCustomersSearch: ActionHandler = genericActionHandler('admin', 'adminCustomersSearch');
export const adminCategoriesList: ActionHandler = genericActionHandler('admin', 'adminCategoriesList');
export const adminCategoriesGet: ActionHandler = genericActionHandler('admin', 'adminCategoriesGet');
export const adminCategoriesCreate: ActionHandler = genericActionHandler('admin', 'adminCategoriesCreate');
export const adminCategoriesUpdate: ActionHandler = genericActionHandler('admin', 'adminCategoriesUpdate');
export const adminCategoriesDisable: ActionHandler = genericActionHandler('admin', 'adminCategoriesDisable');
export const adminBannersList: ActionHandler = genericActionHandler('admin', 'adminBannersList');
export const adminBannersGet: ActionHandler = genericActionHandler('admin', 'adminBannersGet');
export const adminBannersCreate: ActionHandler = genericActionHandler('admin', 'adminBannersCreate');
export const adminBannersUpdate: ActionHandler = genericActionHandler('admin', 'adminBannersUpdate');
export const adminBannersDisable: ActionHandler = genericActionHandler('admin', 'adminBannersDisable');
export const adminFeaturedList: ActionHandler = genericActionHandler('admin', 'adminFeaturedList');
export const adminFeaturedSearchProducts: ActionHandler = genericActionHandler('admin', 'adminFeaturedSearchProducts');
export const adminFeaturedSet: ActionHandler = genericActionHandler('admin', 'adminFeaturedSet');
export const adminProductsList: ActionHandler = genericActionHandler('admin', 'adminProductsList');
export const adminProductsGet: ActionHandler = genericActionHandler('admin', 'adminProductsGet');
export const adminProductsCreate: ActionHandler = genericActionHandler('admin', 'adminProductsCreate');
export const adminProductsUpdate: ActionHandler = genericActionHandler('admin', 'adminProductsUpdate');
export const adminProductsDisable: ActionHandler = genericActionHandler('admin', 'adminProductsDisable');
export const adminProductImagesList: ActionHandler = genericActionHandler('admin', 'adminProductImagesList');
export const adminProductImagesAdd: ActionHandler = genericActionHandler('admin', 'adminProductImagesAdd');
export const adminProductImagesRemove: ActionHandler = genericActionHandler('admin', 'adminProductImagesRemove');
export const adminProductImagesReorder: ActionHandler = genericActionHandler('admin', 'adminProductImagesReorder');
export const adminProductSpecsList: ActionHandler = genericActionHandler('admin', 'adminProductSpecsList');
export const adminProductSpecsCreate: ActionHandler = genericActionHandler('admin', 'adminProductSpecsCreate');
export const adminProductSpecsUpdate: ActionHandler = genericActionHandler('admin', 'adminProductSpecsUpdate');
export const adminProductSpecsDelete: ActionHandler = genericActionHandler('admin', 'adminProductSpecsDelete');
export const adminProductVariantsList: ActionHandler = genericActionHandler('admin', 'adminProductVariantsList');
export const adminProductVariantsCreate: ActionHandler = genericActionHandler('admin', 'adminProductVariantsCreate');
export const adminProductVariantsUpdate: ActionHandler = genericActionHandler('admin', 'adminProductVariantsUpdate');
export const adminProductVariantsDelete: ActionHandler = genericActionHandler('admin', 'adminProductVariantsDelete');
export const adminProductVariantsBulkStockUpdate: ActionHandler = genericActionHandler('admin', 'adminProductVariantsBulkStockUpdate');
export const adminInventoryAdjust: ActionHandler = genericActionHandler('admin', 'adminInventoryAdjust');
export const adminInventoryHistory: ActionHandler = genericActionHandler('admin', 'adminInventoryHistory');
export const adminInventoryLowStockReport: ActionHandler = genericActionHandler('admin', 'adminInventoryLowStockReport');
export const adminOrdersList: ActionHandler = genericActionHandler('admin', 'adminOrdersList');
export const adminOrdersGet: ActionHandler = genericActionHandler('admin', 'adminOrdersGet');
export const adminOrdersUpdateStatus: ActionHandler = genericActionHandler('admin', 'adminOrdersUpdateStatus');
export const adminOrdersSetTracking: ActionHandler = genericActionHandler('admin', 'adminOrdersSetTracking');
export const adminOrdersAddInternalNote: ActionHandler = genericActionHandler('admin', 'adminOrdersAddInternalNote');
export const adminOrdersInvoiceUrl: ActionHandler = genericActionHandler('admin', 'adminOrdersInvoiceUrl');
export const adminOrdersTrackingGet: ActionHandler = genericActionHandler('admin', 'adminOrdersTrackingGet');
export const adminOrdersTrackingAddEvent: ActionHandler = genericActionHandler('admin', 'adminOrdersTrackingAddEvent');
export const adminOrdersTrackingDeleteEvent: ActionHandler = genericActionHandler('admin', 'adminOrdersTrackingDeleteEvent');
export const adminOrdersTrackingUpdateShipment: ActionHandler = genericActionHandler('admin', 'adminOrdersTrackingUpdateShipment');
export const adminShippingMethodsList: ActionHandler = genericActionHandler('admin', 'adminShippingMethodsList');
export const adminShippingMethodsGet: ActionHandler = genericActionHandler('admin', 'adminShippingMethodsGet');
export const adminShippingMethodsCreate: ActionHandler = genericActionHandler('admin', 'adminShippingMethodsCreate');
export const adminShippingMethodsUpdate: ActionHandler = genericActionHandler('admin', 'adminShippingMethodsUpdate');
export const adminShippingMethodsDisable: ActionHandler = genericActionHandler('admin', 'adminShippingMethodsDisable');
export const adminDeliveryZonesList: ActionHandler = genericActionHandler('admin', 'adminDeliveryZonesList');
export const adminDeliveryZonesGet: ActionHandler = genericActionHandler('admin', 'adminDeliveryZonesGet');
export const adminDeliveryZonesCreate: ActionHandler = genericActionHandler('admin', 'adminDeliveryZonesCreate');
export const adminDeliveryZonesUpdate: ActionHandler = genericActionHandler('admin', 'adminDeliveryZonesUpdate');
export const adminDeliveryZonesDisable: ActionHandler = genericActionHandler('admin', 'adminDeliveryZonesDisable');
export const adminCouponsList: ActionHandler = genericActionHandler('admin', 'adminCouponsList');
export const adminCouponsGet: ActionHandler = genericActionHandler('admin', 'adminCouponsGet');
export const adminCouponsCreate: ActionHandler = genericActionHandler('admin', 'adminCouponsCreate');
export const adminCouponsUpdate: ActionHandler = genericActionHandler('admin', 'adminCouponsUpdate');
export const adminCouponsDisable: ActionHandler = genericActionHandler('admin', 'adminCouponsDisable');
export const adminCashbackList: ActionHandler = genericActionHandler('admin', 'adminCashbackList');
export const adminCashbackGet: ActionHandler = genericActionHandler('admin', 'adminCashbackGet');
export const adminCashbackCreate: ActionHandler = genericActionHandler('admin', 'adminCashbackCreate');
export const adminCashbackUpdate: ActionHandler = genericActionHandler('admin', 'adminCashbackUpdate');
export const adminCashbackDisable: ActionHandler = genericActionHandler('admin', 'adminCashbackDisable');
export const adminDiscountsList: ActionHandler = genericActionHandler('admin', 'adminDiscountsList');
export const adminDiscountsGet: ActionHandler = genericActionHandler('admin', 'adminDiscountsGet');
export const adminDiscountsCreate: ActionHandler = genericActionHandler('admin', 'adminDiscountsCreate');
export const adminDiscountsUpdate: ActionHandler = genericActionHandler('admin', 'adminDiscountsUpdate');
export const adminDiscountsDisable: ActionHandler = genericActionHandler('admin', 'adminDiscountsDisable');
export const adminDiscountsPreviewAudienceCount: ActionHandler = genericActionHandler('admin', 'adminDiscountsPreviewAudienceCount');
export const adminHomeSectionsList: ActionHandler = genericActionHandler('admin', 'adminHomeSectionsList');
export const adminHomeSectionsGet: ActionHandler = genericActionHandler('admin', 'adminHomeSectionsGet');
export const adminHomeSectionsCreate: ActionHandler = genericActionHandler('admin', 'adminHomeSectionsCreate');
export const adminHomeSectionsUpdate: ActionHandler = genericActionHandler('admin', 'adminHomeSectionsUpdate');
export const adminHomeSectionsDisable: ActionHandler = genericActionHandler('admin', 'adminHomeSectionsDisable');
export const adminHomeSectionsReorder: ActionHandler = genericActionHandler('admin', 'adminHomeSectionsReorder');
export const adminNotificationsSend: ActionHandler = genericActionHandler('admin', 'adminNotificationsSend');
export const adminNotificationsList: ActionHandler = genericActionHandler('admin', 'adminNotificationsList');
export const adminLoyaltyGetSettings: ActionHandler = genericActionHandler('admin', 'adminLoyaltyGetSettings');
export const adminLoyaltyUpdateSettings: ActionHandler = genericActionHandler('admin', 'adminLoyaltyUpdateSettings');
export const adminLoyaltyAdjustUserPoints: ActionHandler = genericActionHandler('admin', 'adminLoyaltyAdjustUserPoints');
export const adminLoyaltyTiersList: ActionHandler = genericActionHandler('admin', 'adminLoyaltyTiersList');
export const adminLoyaltyTiersCreate: ActionHandler = genericActionHandler('admin', 'adminLoyaltyTiersCreate');
export const adminLoyaltyTiersUpdate: ActionHandler = genericActionHandler('admin', 'adminLoyaltyTiersUpdate');
export const adminLoyaltyTiersDisable: ActionHandler = genericActionHandler('admin', 'adminLoyaltyTiersDisable');
export const reportsOverview: ActionHandler = genericActionHandler('admin', 'reportsOverview');
export const reportsTopProducts: ActionHandler = genericActionHandler('admin', 'reportsTopProducts');
export const reportsOrdersByStatus: ActionHandler = genericActionHandler('admin', 'reportsOrdersByStatus');
export const reportsInventorySummary: ActionHandler = genericActionHandler('admin', 'reportsInventorySummary');
export const reportsCustomersSummary: ActionHandler = genericActionHandler('admin', 'reportsCustomersSummary');
export const reportsReturnsSummary: ActionHandler = genericActionHandler('admin', 'reportsReturnsSummary');
export const reportsLoyaltySummary: ActionHandler = genericActionHandler('admin', 'reportsLoyaltySummary');
export const reportsCashbackSummary: ActionHandler = genericActionHandler('admin', 'reportsCashbackSummary');
export const adminReportsAttributionOverview: ActionHandler = genericActionHandler('admin', 'adminReportsAttributionOverview');
export const adminReportsTopCampaigns: ActionHandler = genericActionHandler('admin', 'adminReportsTopCampaigns');
export const adminSeoGet: ActionHandler = genericActionHandler('admin', 'adminSeoGet');
export const adminSeoUpdate: ActionHandler = genericActionHandler('admin', 'adminSeoUpdate');
export const adminLandingPagesList: ActionHandler = genericActionHandler('admin', 'adminLandingPagesList');
export const adminLandingPagesGet: ActionHandler = genericActionHandler('admin', 'adminLandingPagesGet');
export const adminLandingPagesCreate: ActionHandler = genericActionHandler('admin', 'adminLandingPagesCreate');
export const adminLandingPagesUpdate: ActionHandler = genericActionHandler('admin', 'adminLandingPagesUpdate');
export const adminLandingPagesPublish: ActionHandler = genericActionHandler('admin', 'adminLandingPagesPublish');
export const adminLandingPagesUnpublish: ActionHandler = genericActionHandler('admin', 'adminLandingPagesUnpublish');
export const adminLandingPagesDisable: ActionHandler = genericActionHandler('admin', 'adminLandingPagesDisable');
export const adminSitemapRegenerate: ActionHandler = genericActionHandler('admin', 'adminSitemapRegenerate');
export const adminRiskRulesGet: ActionHandler = genericActionHandler('admin', 'adminRiskRulesGet');
export const adminRiskRulesUpdate: ActionHandler = genericActionHandler('admin', 'adminRiskRulesUpdate');
export const adminRiskFlaggedOrdersList: ActionHandler = genericActionHandler('admin', 'adminRiskFlaggedOrdersList');
export const adminRiskFlaggedOrdersResolve: ActionHandler = genericActionHandler('admin', 'adminRiskFlaggedOrdersResolve');
export const adminPostPurchaseFlowsList: ActionHandler = genericActionHandler('admin', 'adminPostPurchaseFlowsList');
export const adminPostPurchaseFlowsGet: ActionHandler = genericActionHandler('admin', 'adminPostPurchaseFlowsGet');
export const adminPostPurchaseFlowsCreate: ActionHandler = genericActionHandler('admin', 'adminPostPurchaseFlowsCreate');
export const adminPostPurchaseFlowsUpdate: ActionHandler = genericActionHandler('admin', 'adminPostPurchaseFlowsUpdate');
export const adminPostPurchaseFlowsDisable: ActionHandler = genericActionHandler('admin', 'adminPostPurchaseFlowsDisable');
export const adminPostPurchaseRunsList: ActionHandler = genericActionHandler('admin', 'adminPostPurchaseRunsList');
export const adminInsuranceList: ActionHandler = genericActionHandler('admin', 'adminInsuranceList');
export const adminInsuranceGet: ActionHandler = genericActionHandler('admin', 'adminInsuranceGet');
export const adminInsuranceAddItem: ActionHandler = genericActionHandler('admin', 'adminInsuranceAddItem');
export const adminInsuranceUpdateItem: ActionHandler = genericActionHandler('admin', 'adminInsuranceUpdateItem');
export const adminInsuranceRemoveItem: ActionHandler = genericActionHandler('admin', 'adminInsuranceRemoveItem');
export const adminInsuranceLockQuote: ActionHandler = genericActionHandler('admin', 'adminInsuranceLockQuote');
export const adminInsuranceSendQuote: ActionHandler = genericActionHandler('admin', 'adminInsuranceSendQuote');
export const adminInsuranceSetShipmentTracking: ActionHandler = genericActionHandler('admin', 'adminInsuranceSetShipmentTracking');
export const adminBranchesList: ActionHandler = genericActionHandler('admin', 'adminBranchesList');
export const adminBranchesCreate: ActionHandler = genericActionHandler('admin', 'adminBranchesCreate');
export const adminBranchesUpdate: ActionHandler = genericActionHandler('admin', 'adminBranchesUpdate');
export const adminBranchesDisable: ActionHandler = genericActionHandler('admin', 'adminBranchesDisable');
export const adminDevicesList: ActionHandler = genericActionHandler('admin', 'adminDevicesList');
export const adminDevicesCreate: ActionHandler = genericActionHandler('admin', 'adminDevicesCreate');
export const adminDevicesUpdate: ActionHandler = genericActionHandler('admin', 'adminDevicesUpdate');
export const adminDevicesDisable: ActionHandler = genericActionHandler('admin', 'adminDevicesDisable');
export const adminEmployeesList: ActionHandler = genericActionHandler('admin', 'adminEmployeesList');
export const adminEmployeesCreate: ActionHandler = genericActionHandler('admin', 'adminEmployeesCreate');
export const adminEmployeesUpdate: ActionHandler = genericActionHandler('admin', 'adminEmployeesUpdate');
export const adminEmployeesDisable: ActionHandler = genericActionHandler('admin', 'adminEmployeesDisable');
export const adminDrawersList: ActionHandler = genericActionHandler('admin', 'adminDrawersList');
export const adminDrawersCreate: ActionHandler = genericActionHandler('admin', 'adminDrawersCreate');
export const adminDrawersUpdate: ActionHandler = genericActionHandler('admin', 'adminDrawersUpdate');
export const adminDrawersDisable: ActionHandler = genericActionHandler('admin', 'adminDrawersDisable');
export const adminDrawerSessionsOpen: ActionHandler = genericActionHandler('admin', 'adminDrawerSessionsOpen');
export const adminDrawerSessionsClose: ActionHandler = genericActionHandler('admin', 'adminDrawerSessionsClose');
export const adminAccountingKpis: ActionHandler = genericActionHandler('admin', 'adminAccountingKpis');
export const adminAccountingLedger: ActionHandler = genericActionHandler('admin', 'adminAccountingLedger');
export const adminAccountingCreateExpense: ActionHandler = genericActionHandler('admin', 'adminAccountingCreateExpense');
export const adminAccountingCreateAdjustment: ActionHandler = genericActionHandler('admin', 'adminAccountingCreateAdjustment');
export const adminAccountingCreatePOSSale: ActionHandler = genericActionHandler('admin', 'adminAccountingCreatePOSSale');
export const adminReturnsList: ActionHandler = genericActionHandler('admin', 'adminReturnsList');
export const adminReturnsGet: ActionHandler = genericActionHandler('admin', 'adminReturnsGet');
export const adminReturnsApprove: ActionHandler = genericActionHandler('admin', 'adminReturnsApprove');
export const adminReturnsReject: ActionHandler = genericActionHandler('admin', 'adminReturnsReject');
export const adminReturnsRefundPartial: ActionHandler = genericActionHandler('admin', 'adminReturnsRefundPartial');
export const adminReturnsRefundFull: ActionHandler = genericActionHandler('admin', 'adminReturnsRefundFull');
export const adminReturnsUpdateStatus: ActionHandler = genericActionHandler('admin', 'adminReturnsUpdateStatus');

export const handlers: Record<string, ActionHandler> = {
  adminMe,
  adminMediaCreateUploadSpec,
  adminMediaFinalizeUpload,
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
  adminHomeSectionsList,
  adminHomeSectionsGet,
  adminHomeSectionsCreate,
  adminHomeSectionsUpdate,
  adminHomeSectionsDisable,
  adminHomeSectionsReorder,
  adminNotificationsSend,
  adminNotificationsList,
  adminLoyaltyGetSettings,
  adminLoyaltyUpdateSettings,
  adminLoyaltyAdjustUserPoints,
  adminLoyaltyTiersList,
  adminLoyaltyTiersCreate,
  adminLoyaltyTiersUpdate,
  adminLoyaltyTiersDisable,
  reportsOverview,
  reportsTopProducts,
  reportsOrdersByStatus,
  reportsInventorySummary,
  reportsCustomersSummary,
  reportsReturnsSummary,
  reportsLoyaltySummary,
  reportsCashbackSummary,
  adminReportsAttributionOverview,
  adminReportsTopCampaigns,
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
  adminRiskRulesGet,
  adminRiskRulesUpdate,
  adminRiskFlaggedOrdersList,
  adminRiskFlaggedOrdersResolve,
  adminPostPurchaseFlowsList,
  adminPostPurchaseFlowsGet,
  adminPostPurchaseFlowsCreate,
  adminPostPurchaseFlowsUpdate,
  adminPostPurchaseFlowsDisable,
  adminPostPurchaseRunsList,
  adminInsuranceList,
  adminInsuranceGet,
  adminInsuranceAddItem,
  adminInsuranceUpdateItem,
  adminInsuranceRemoveItem,
  adminInsuranceLockQuote,
  adminInsuranceSendQuote,
  adminInsuranceSetShipmentTracking,
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
  adminAccountingKpis,
  adminAccountingLedger,
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
};
