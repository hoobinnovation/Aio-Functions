export type GatewayName = 'public' | 'client' | 'admin';

export type ActionSpec = {
  name: string;
  gateway: GatewayName;
  requiresAuth: boolean;
  requiresStore: boolean;
  moduleName: string;
};

const toSpecs = (
  gateway: GatewayName,
  names: string[],
  moduleName: string,
  requiresAuth: boolean,
  requiresStore: boolean,
): ActionSpec[] => names.map((name) => ({ name, gateway, requiresAuth, requiresStore, moduleName }));

const healthActions = [
  'publicHealthPing','clientHealthWhoAmI','adminHealthWhoAmI','adminHealthDbCheck','publicActionsList','clientActionsList','adminActionsList','adminHealthActionsCoverage',
];

const publicActions = [
  'publicCatalogGetHome','publicCatalogGetCategories','publicCatalogListProducts','publicCatalogSearchProducts','publicCatalogGetFilters','publicProductGetById','publicProductGetBySlug','publicCategoryGetById','publicCategoryGetBySlug','publicSeoGetPageMeta','publicSeoGetLanding',
];

const clientActions = [
  'authEnsureUserProfile','profileGet','profileUpdate','accountDeleteRequest','addressesList','addressesCreate','addressesUpdate','addressesDelete','addressesSetDefault','storesList','storesGet','storeContextGetMyStore','storeContextSetMyStore','storeFavoritesList','storeFavoritesToggle','productFavoritesList','productFavoritesToggle','reviewsList','reviewsCanReview','reviewsCreate','cartGet','cartAddItem','cartUpdateQty','cartRemoveItem','cartClear','cartApplyCoupon','cartRemoveCoupon','shippingListMethods','shippingQuoteDelivery','checkoutPreview','checkoutCreatePaymentSession','paymentsStatus','paymentsConfirm','ordersList','ordersGet','ordersTracking','ordersInvoiceUrl','ordersReorder','notificationsRegisterToken','notificationsList','notificationsMarkRead','notificationsMarkAllRead','notificationsDelete','loyaltyGetDashboard','loyaltyListTransactions','loyaltyRedeem','walletGet','walletHistory','homeGetLayout','insuranceCreateDraft','insuranceAttachFiles','insuranceSubmit','insuranceGet','insuranceApproveQuote','insuranceRejectQuote','insuranceListMyOrders','marketingCapture','alertsGetPrefs','alertsUpdatePrefs','alertsSubscribeBackInStock','recoGetSimilar','recoGetCartUpsell','postPurchaseGetNudges','supportCreateTicket','supportListTickets','supportGetTicket','supportAddMessage','supportCloseTicket','settingsGet','settingsUpdate','legalGetDocs','mediaCreateUploadSpec','mediaFinalizeUpload',
];

const adminActions = [
'adminMe','adminMediaCreateUploadSpec','adminMediaFinalizeUpload','adminStoresList','adminStoresGet','adminStoresCreate','adminStoresUpdate','adminStoresDisable','adminStoreSettingsGet','adminStoreSettingsUpdate','adminCustomersList','adminCustomersGet','adminCustomersUpdate','adminCustomersDisable','adminCustomersSearch','adminCategoriesList','adminCategoriesGet','adminCategoriesCreate','adminCategoriesUpdate','adminCategoriesDisable','adminBannersList','adminBannersGet','adminBannersCreate','adminBannersUpdate','adminBannersDisable','adminFeaturedList','adminFeaturedSearchProducts','adminFeaturedSet','adminProductsList','adminProductsGet','adminProductsCreate','adminProductsUpdate','adminProductsDisable','adminProductImagesList','adminProductImagesAdd','adminProductImagesRemove','adminProductImagesReorder','adminProductSpecsList','adminProductSpecsCreate','adminProductSpecsUpdate','adminProductSpecsDelete','adminProductVariantsList','adminProductVariantsCreate','adminProductVariantsUpdate','adminProductVariantsDelete','adminProductVariantsBulkStockUpdate','adminInventoryAdjust','adminInventoryHistory','adminInventoryLowStockReport','adminOrdersList','adminOrdersGet','adminOrdersUpdateStatus','adminOrdersSetTracking','adminOrdersAddInternalNote','adminOrdersInvoiceUrl','adminOrdersTrackingGet','adminOrdersTrackingAddEvent','adminOrdersTrackingDeleteEvent','adminOrdersTrackingUpdateShipment','adminShippingMethodsList','adminShippingMethodsGet','adminShippingMethodsCreate','adminShippingMethodsUpdate','adminShippingMethodsDisable','adminDeliveryZonesList','adminDeliveryZonesGet','adminDeliveryZonesCreate','adminDeliveryZonesUpdate','adminDeliveryZonesDisable','adminCouponsList','adminCouponsGet','adminCouponsCreate','adminCouponsUpdate','adminCouponsDisable','adminCashbackList','adminCashbackGet','adminCashbackCreate','adminCashbackUpdate','adminCashbackDisable','adminDiscountsList','adminDiscountsGet','adminDiscountsCreate','adminDiscountsUpdate','adminDiscountsDisable','adminDiscountsPreviewAudienceCount','adminHomeSectionsList','adminHomeSectionsGet','adminHomeSectionsCreate','adminHomeSectionsUpdate','adminHomeSectionsDisable','adminHomeSectionsReorder','adminNotificationsSend','adminNotificationsList','adminLoyaltyGetSettings','adminLoyaltyUpdateSettings','adminLoyaltyAdjustUserPoints','adminLoyaltyTiersList','adminLoyaltyTiersCreate','adminLoyaltyTiersUpdate','adminLoyaltyTiersDisable','reportsOverview','reportsTopProducts','reportsOrdersByStatus','reportsInventorySummary','reportsCustomersSummary','reportsReturnsSummary','reportsLoyaltySummary','reportsCashbackSummary','adminReportsAttributionOverview','adminReportsTopCampaigns','adminSeoGet','adminSeoUpdate','adminLandingPagesList','adminLandingPagesGet','adminLandingPagesCreate','adminLandingPagesUpdate','adminLandingPagesPublish','adminLandingPagesUnpublish','adminLandingPagesDisable','adminSitemapRegenerate','adminRiskRulesGet','adminRiskRulesUpdate','adminRiskFlaggedOrdersList','adminRiskFlaggedOrdersResolve','adminPostPurchaseFlowsList','adminPostPurchaseFlowsGet','adminPostPurchaseFlowsCreate','adminPostPurchaseFlowsUpdate','adminPostPurchaseFlowsDisable','adminPostPurchaseRunsList','adminInsuranceList','adminInsuranceGet','adminInsuranceAddItem','adminInsuranceUpdateItem','adminInsuranceRemoveItem','adminInsuranceLockQuote','adminInsuranceSendQuote','adminInsuranceSetShipmentTracking','adminBranchesList','adminBranchesCreate','adminBranchesUpdate','adminBranchesDisable','adminDevicesList','adminDevicesCreate','adminDevicesUpdate','adminDevicesDisable','adminEmployeesList','adminEmployeesCreate','adminEmployeesUpdate','adminEmployeesDisable','adminDrawersList','adminDrawersCreate','adminDrawersUpdate','adminDrawersDisable','adminDrawerSessionsOpen','adminDrawerSessionsClose','adminAccountingKpis','adminAccountingLedger','adminAccountingCreateExpense','adminAccountingCreateAdjustment','adminAccountingCreatePOSSale','adminReturnsList','adminReturnsGet','adminReturnsApprove','adminReturnsReject','adminReturnsRefundPartial','adminReturnsRefundFull','adminReturnsUpdateStatus',
];

export const ACTION_SPECS: ActionSpec[] = [
  ...toSpecs('public', healthActions.filter((a)=>a.startsWith('public')), 'healthHandlers', false, false),
  ...toSpecs('client', healthActions.filter((a)=>a.startsWith('client')), 'healthHandlers', true, false),
  ...toSpecs('admin', healthActions.filter((a)=>a.startsWith('admin')), 'healthHandlers', true, false),
  ...toSpecs('public', publicActions, 'publicDomainHandlers', false, true),
  ...toSpecs('client', clientActions, 'clientDomainHandlers', true, false),
  ...toSpecs('admin', adminActions, 'adminDomainHandlers', true, true),
];
