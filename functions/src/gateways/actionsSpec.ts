export type GatewayName = 'public' | 'client' | 'admin';

export type ActionSpecItem = {
  name: string;
  gateway: GatewayName;
  requiresAuth: boolean;
  requiresStore: boolean;
  role?: string;
  description: string;
};

const toSpecs = (
  gateway: GatewayName,
  names: string[],
  requiresAuth: boolean,
  requiresStore: boolean,
  role?: string,
): ActionSpecItem[] => names.map((name) => ({
  name,
  gateway,
  requiresAuth,
  requiresStore,
  role,
  description: `Executes ${name} for ${gateway} gateway.`,
}));

const PUBLIC = [
  'publicHealthPing','publicActionsList','publicCatalogGetHome','publicCatalogGetCategories','publicCatalogListProducts','publicCatalogSearchProducts','publicCatalogGetFilters','publicProductGetById','publicProductGetBySlug','publicCategoryGetById','publicCategoryGetBySlug','publicSeoGetPageMeta','publicSeoGetLanding',
];

const CLIENT = [
'clientHealthWhoAmI','clientActionsList','authEnsureUserProfile','profileGet','profileUpdate','accountDeleteRequest','addressesList','addressesCreate','addressesUpdate','addressesDelete','addressesSetDefault','storesList','storesGet','storeContextGetMyStore','storeContextSetMyStore','storeFavoritesList','storeFavoritesToggle','productFavoritesList','productFavoritesToggle','reviewsList','reviewsCanReview','reviewsCreate','cartGet','cartAddItem','cartUpdateQty','cartRemoveItem','cartClear','cartApplyCoupon','cartRemoveCoupon','shippingListMethods','shippingQuoteDelivery','checkoutPreview','checkoutCreatePaymentSession','paymentsStatus','paymentsConfirm','ordersList','ordersGet','ordersTracking','ordersInvoiceUrl','ordersReorder','notificationsRegisterToken','notificationsList','notificationsMarkRead','notificationsMarkAllRead','notificationsDelete','loyaltyGetDashboard','loyaltyListTransactions','loyaltyRedeem','walletGet','walletHistory','homeGetLayout','insuranceCreateDraft','insuranceAttachFiles','insuranceSubmit','insuranceGet','insuranceApproveQuote','insuranceRejectQuote','insuranceListMyOrders','marketingCapture','alertsGetPrefs','alertsUpdatePrefs','alertsSubscribeBackInStock','recoGetSimilar','recoGetCartUpsell','postPurchaseGetNudges','supportCreateTicket','supportListTickets','supportGetTicket','supportAddMessage','supportCloseTicket','settingsGet','settingsUpdate','legalGetDocs','mediaCreateUploadSpec','mediaFinalizeUpload',
];

const ADMIN = [
'adminHealthWhoAmI','adminHealthDbCheck','adminHealthActionsCoverage','adminActionsList','adminMe','adminMediaCreateUploadSpec','adminMediaFinalizeUpload','adminStoresList','adminStoresGet','adminStoresCreate','adminStoresUpdate','adminStoresDisable','adminStoreSettingsGet','adminStoreSettingsUpdate','adminCustomersList','adminCustomersGet','adminCustomersUpdate','adminCustomersDisable','adminCustomersSearch','adminCategoriesList','adminCategoriesGet','adminCategoriesCreate','adminCategoriesUpdate','adminCategoriesDisable','adminBannersList','adminBannersGet','adminBannersCreate','adminBannersUpdate','adminBannersDisable','adminFeaturedList','adminFeaturedSearchProducts','adminFeaturedSet','adminProductsList','adminProductsGet','adminProductsCreate','adminProductsUpdate','adminProductsDisable','adminProductImagesList','adminProductImagesAdd','adminProductImagesRemove','adminProductImagesReorder','adminProductSpecsList','adminProductSpecsCreate','adminProductSpecsUpdate','adminProductSpecsDelete','adminProductVariantsList','adminProductVariantsCreate','adminProductVariantsUpdate','adminProductVariantsDelete','adminProductVariantsBulkStockUpdate','adminInventoryAdjust','adminInventoryHistory','adminInventoryLowStockReport','adminOrdersList','adminOrdersGet','adminOrdersUpdateStatus','adminOrdersSetTracking','adminOrdersAddInternalNote','adminOrdersInvoiceUrl','adminOrdersTrackingGet','adminOrdersTrackingAddEvent','adminOrdersTrackingDeleteEvent','adminOrdersTrackingUpdateShipment','adminShippingMethodsList','adminShippingMethodsGet','adminShippingMethodsCreate','adminShippingMethodsUpdate','adminShippingMethodsDisable','adminDeliveryZonesList','adminDeliveryZonesGet','adminDeliveryZonesCreate','adminDeliveryZonesUpdate','adminDeliveryZonesDisable','adminCouponsList','adminCouponsGet','adminCouponsCreate','adminCouponsUpdate','adminCouponsDisable','adminCashbackList','adminCashbackGet','adminCashbackCreate','adminCashbackUpdate','adminCashbackDisable','adminDiscountsList','adminDiscountsGet','adminDiscountsCreate','adminDiscountsUpdate','adminDiscountsDisable','adminDiscountsPreviewAudienceCount','adminHomeSectionsList','adminHomeSectionsGet','adminHomeSectionsCreate','adminHomeSectionsUpdate','adminHomeSectionsDisable','adminHomeSectionsReorder','adminNotificationsSend','adminNotificationsList','adminLoyaltyGetSettings','adminLoyaltyUpdateSettings','adminLoyaltyAdjustUserPoints','adminLoyaltyTiersList','adminLoyaltyTiersCreate','adminLoyaltyTiersUpdate','adminLoyaltyTiersDisable','reportsOverview','reportsTopProducts','reportsOrdersByStatus','reportsInventorySummary','reportsCustomersSummary','reportsReturnsSummary','reportsLoyaltySummary','reportsCashbackSummary','adminReportsAttributionOverview','adminReportsTopCampaigns','adminSeoGet','adminSeoUpdate','adminLandingPagesList','adminLandingPagesGet','adminLandingPagesCreate','adminLandingPagesUpdate','adminLandingPagesPublish','adminLandingPagesUnpublish','adminLandingPagesDisable','adminSitemapRegenerate','adminRiskRulesGet','adminRiskRulesUpdate','adminRiskFlaggedOrdersList','adminRiskFlaggedOrdersResolve','adminPostPurchaseFlowsList','adminPostPurchaseFlowsGet','adminPostPurchaseFlowsCreate','adminPostPurchaseFlowsUpdate','adminPostPurchaseFlowsDisable','adminPostPurchaseRunsList','adminInsuranceList','adminInsuranceGet','adminInsuranceAddItem','adminInsuranceUpdateItem','adminInsuranceRemoveItem','adminInsuranceLockQuote','adminInsuranceSendQuote','adminInsuranceSetShipmentTracking','adminBranchesList','adminBranchesCreate','adminBranchesUpdate','adminBranchesDisable','adminDevicesList','adminDevicesCreate','adminDevicesUpdate','adminDevicesDisable','adminEmployeesList','adminEmployeesCreate','adminEmployeesUpdate','adminEmployeesDisable','adminDrawersList','adminDrawersCreate','adminDrawersUpdate','adminDrawersDisable','adminDrawerSessionsOpen','adminDrawerSessionsClose','adminAccountingKpis','adminAccountingLedger','adminAccountingCreateExpense','adminAccountingCreateAdjustment','adminAccountingCreatePOSSale','adminReturnsList','adminReturnsGet','adminReturnsApprove','adminReturnsReject','adminReturnsRefundPartial','adminReturnsRefundFull','adminReturnsUpdateStatus',
];

export const PUBLIC_ACTIONS = toSpecs('public', PUBLIC, false, false);
export const CLIENT_ACTIONS = toSpecs('client', CLIENT, true, false);
export const ADMIN_ACTIONS = toSpecs('admin', ADMIN, true, true, 'STORE_ADMIN');
export const ALL_ACTIONS = [...PUBLIC_ACTIONS, ...CLIENT_ACTIONS, ...ADMIN_ACTIONS];

export const ACTION_SPEC_BY_NAME = new Map(ALL_ACTIONS.map((x) => [x.name, x]));
