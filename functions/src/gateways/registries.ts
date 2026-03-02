import { publicHealthPing, publicActionsList } from '../actions/public/publicActions';
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
  clientHealthWhoAmI, clientActionsList, authEnsureUserProfile, profileGet, profileUpdate, accountDeleteRequest,
  addressesList, addressesCreate, addressesUpdate, addressesDelete, addressesSetDefault,
  storesList, storesGet, storeContextGetMyStore, storeContextSetMyStore, mediaCreateUploadSpec, mediaFinalizeUpload,
} from '../actions/client/clientActions';
import { cartGet, cartAddItem, cartUpdateQty, cartRemoveItem, cartClear, cartApplyCoupon, cartRemoveCoupon, shippingListMethods, shippingQuoteDelivery, checkoutPreview, notificationsRegisterToken, notificationsList, notificationsMarkRead, notificationsMarkAllRead, notificationsDelete, loyaltyGetDashboard, loyaltyListTransactions, loyaltyRedeem, walletGet, walletHistory, marketingCapture, alertsGetPrefs, alertsUpdatePrefs, alertsSubscribeBackInStock, recoGetSimilar, recoGetCartUpsell, postPurchaseGetNudges, supportCreateTicket, supportListTickets, supportGetTicket, supportAddMessage, supportCloseTicket, settingsGet, settingsUpdate, legalGetDocs } from '../actions/client/commerceClientActions';
import { homeGetLayout, productFavoritesList, productFavoritesToggle, storeFavoritesList, storeFavoritesToggle } from '../actions/client/catalogClientActions';
import {
  adminHealthWhoAmI, adminHealthDbCheck, adminHealthActionsCoverage, adminActionsList, adminMe,
  adminStoresList, adminStoresGet, adminStoresCreate, adminStoresUpdate, adminStoresDisable,
  adminStoreSettingsGet, adminStoreSettingsUpdate, adminCustomersList, adminCustomersGet, adminCustomersUpdate,
  adminCustomersDisable, adminCustomersSearch, adminMediaCreateUploadSpec, adminMediaFinalizeUpload,
} from '../actions/admin/adminActions';
import { adminShippingMethodsList, adminShippingMethodsGet, adminShippingMethodsCreate, adminShippingMethodsUpdate, adminShippingMethodsDisable, adminDeliveryZonesList, adminDeliveryZonesGet, adminDeliveryZonesCreate, adminDeliveryZonesUpdate, adminDeliveryZonesDisable, adminCouponsList, adminCouponsGet, adminCouponsCreate, adminCouponsUpdate, adminCouponsDisable, adminCashbackList, adminCashbackGet, adminCashbackCreate, adminCashbackUpdate, adminCashbackDisable, adminDiscountsList, adminDiscountsGet, adminDiscountsCreate, adminDiscountsUpdate, adminDiscountsDisable, adminDiscountsPreviewAudienceCount, adminNotificationsSend, adminNotificationsList, adminLoyaltyGetSettings, adminLoyaltyUpdateSettings, adminLoyaltyAdjustUserPoints, adminLoyaltyTiersList, adminLoyaltyTiersCreate, adminLoyaltyTiersUpdate, adminLoyaltyTiersDisable, adminReportsAttributionOverview, adminReportsTopCampaigns, adminPostPurchaseFlowsList, adminPostPurchaseFlowsGet, adminPostPurchaseFlowsCreate, adminPostPurchaseFlowsUpdate, adminPostPurchaseFlowsDisable, adminPostPurchaseRunsList } from '../actions/admin/commerceAdminActions';
import {
  adminCategoriesList, adminCategoriesGet, adminCategoriesCreate, adminCategoriesUpdate, adminCategoriesDisable,
  adminBannersList, adminBannersGet, adminBannersCreate, adminBannersUpdate, adminBannersDisable,
  adminFeaturedList, adminFeaturedSearchProducts, adminFeaturedSet,
  adminProductsList, adminProductsGet, adminProductsCreate, adminProductsUpdate, adminProductsDisable,
  adminProductImagesList, adminProductImagesAdd, adminProductImagesRemove, adminProductImagesReorder,
  adminProductSpecsList, adminProductSpecsCreate, adminProductSpecsUpdate, adminProductSpecsDelete,
  adminProductVariantsList, adminProductVariantsCreate, adminProductVariantsUpdate, adminProductVariantsDelete, adminProductVariantsBulkStockUpdate,
  adminInventoryAdjust, adminInventoryHistory, adminInventoryLowStockReport,
  adminHomeSectionsList, adminHomeSectionsGet, adminHomeSectionsCreate, adminHomeSectionsUpdate, adminHomeSectionsDisable, adminHomeSectionsReorder,
  adminSeoGet, adminSeoUpdate,
  adminLandingPagesList, adminLandingPagesGet, adminLandingPagesCreate, adminLandingPagesUpdate, adminLandingPagesPublish, adminLandingPagesUnpublish, adminLandingPagesDisable,
  adminSitemapRegenerate,
} from '../actions/admin/catalogAdminActions';
import { ActionHandler } from '../core/protocol';

const m = () => new Map<string, ActionHandler>();
const add = (r: Map<string, ActionHandler>, key: string, handler: ActionHandler) => { r.set(key, handler); };

export const registryPublic = m();
add(registryPublic,'publicHealthPing', publicHealthPing as ActionHandler);
add(registryPublic,'publicActionsList', publicActionsList as ActionHandler);
add(registryPublic,'publicCatalogGetHome', publicCatalogGetHome as ActionHandler);
add(registryPublic,'publicCatalogGetCategories', publicCatalogGetCategories as ActionHandler);
add(registryPublic,'publicCatalogListProducts', publicCatalogListProducts as ActionHandler);
add(registryPublic,'publicCatalogSearchProducts', publicCatalogSearchProducts as ActionHandler);
add(registryPublic,'publicCatalogGetFilters', publicCatalogGetFilters as ActionHandler);
add(registryPublic,'publicProductGetById', publicProductGetById as ActionHandler);
add(registryPublic,'publicProductGetBySlug', publicProductGetBySlug as ActionHandler);
add(registryPublic,'publicCategoryGetById', publicCategoryGetById as ActionHandler);
add(registryPublic,'publicCategoryGetBySlug', publicCategoryGetBySlug as ActionHandler);
add(registryPublic,'publicSeoGetPageMeta', publicSeoGetPageMeta as ActionHandler);
add(registryPublic,'publicSeoGetLanding', publicSeoGetLanding as ActionHandler);

export const registryClient = m();
add(registryClient,'clientHealthWhoAmI',clientHealthWhoAmI as ActionHandler);
add(registryClient,'clientActionsList',clientActionsList as ActionHandler);
add(registryClient,'authEnsureUserProfile',authEnsureUserProfile as ActionHandler);
add(registryClient,'profileGet',profileGet as ActionHandler);
add(registryClient,'profileUpdate',profileUpdate as ActionHandler);
add(registryClient,'accountDeleteRequest',accountDeleteRequest as ActionHandler);
add(registryClient,'addressesList',addressesList as ActionHandler);
add(registryClient,'addressesCreate',addressesCreate as ActionHandler);
add(registryClient,'addressesUpdate',addressesUpdate as ActionHandler);
add(registryClient,'addressesDelete',addressesDelete as ActionHandler);
add(registryClient,'addressesSetDefault',addressesSetDefault as ActionHandler);
add(registryClient,'storesList',storesList as ActionHandler);
add(registryClient,'storesGet',storesGet as ActionHandler);
add(registryClient,'storeContextGetMyStore',storeContextGetMyStore as ActionHandler);
add(registryClient,'storeContextSetMyStore',storeContextSetMyStore as ActionHandler);
add(registryClient,'homeGetLayout',homeGetLayout as ActionHandler);
add(registryClient,'productFavoritesList',productFavoritesList as ActionHandler);
add(registryClient,'productFavoritesToggle',productFavoritesToggle as ActionHandler);
add(registryClient,'storeFavoritesList',storeFavoritesList as ActionHandler);
add(registryClient,'storeFavoritesToggle',storeFavoritesToggle as ActionHandler);
add(registryClient,'mediaCreateUploadSpec',mediaCreateUploadSpec as ActionHandler);
add(registryClient,'mediaFinalizeUpload',mediaFinalizeUpload as ActionHandler);
add(registryClient,'cartGet',cartGet as ActionHandler);
add(registryClient,'cartAddItem',cartAddItem as ActionHandler);
add(registryClient,'cartUpdateQty',cartUpdateQty as ActionHandler);
add(registryClient,'cartRemoveItem',cartRemoveItem as ActionHandler);
add(registryClient,'cartClear',cartClear as ActionHandler);
add(registryClient,'cartApplyCoupon',cartApplyCoupon as ActionHandler);
add(registryClient,'cartRemoveCoupon',cartRemoveCoupon as ActionHandler);
add(registryClient,'shippingListMethods',shippingListMethods as ActionHandler);
add(registryClient,'shippingQuoteDelivery',shippingQuoteDelivery as ActionHandler);
add(registryClient,'checkoutPreview',checkoutPreview as ActionHandler);
add(registryClient,'notificationsRegisterToken',notificationsRegisterToken as ActionHandler);
add(registryClient,'notificationsList',notificationsList as ActionHandler);
add(registryClient,'notificationsMarkRead',notificationsMarkRead as ActionHandler);
add(registryClient,'notificationsMarkAllRead',notificationsMarkAllRead as ActionHandler);
add(registryClient,'notificationsDelete',notificationsDelete as ActionHandler);
add(registryClient,'loyaltyGetDashboard',loyaltyGetDashboard as ActionHandler);
add(registryClient,'loyaltyListTransactions',loyaltyListTransactions as ActionHandler);
add(registryClient,'loyaltyRedeem',loyaltyRedeem as ActionHandler);
add(registryClient,'walletGet',walletGet as ActionHandler);
add(registryClient,'walletHistory',walletHistory as ActionHandler);
add(registryClient,'marketingCapture',marketingCapture as ActionHandler);
add(registryClient,'alertsGetPrefs',alertsGetPrefs as ActionHandler);
add(registryClient,'alertsUpdatePrefs',alertsUpdatePrefs as ActionHandler);
add(registryClient,'alertsSubscribeBackInStock',alertsSubscribeBackInStock as ActionHandler);
add(registryClient,'recoGetSimilar',recoGetSimilar as ActionHandler);
add(registryClient,'recoGetCartUpsell',recoGetCartUpsell as ActionHandler);
add(registryClient,'postPurchaseGetNudges',postPurchaseGetNudges as ActionHandler);
add(registryClient,'supportCreateTicket',supportCreateTicket as ActionHandler);
add(registryClient,'supportListTickets',supportListTickets as ActionHandler);
add(registryClient,'supportGetTicket',supportGetTicket as ActionHandler);
add(registryClient,'supportAddMessage',supportAddMessage as ActionHandler);
add(registryClient,'supportCloseTicket',supportCloseTicket as ActionHandler);
add(registryClient,'settingsGet',settingsGet as ActionHandler);
add(registryClient,'settingsUpdate',settingsUpdate as ActionHandler);
add(registryClient,'legalGetDocs',legalGetDocs as ActionHandler);

export const registryAdmin = m();
add(registryAdmin,'adminHealthWhoAmI',adminHealthWhoAmI as ActionHandler);
add(registryAdmin,'adminHealthDbCheck',adminHealthDbCheck as ActionHandler);
add(registryAdmin,'adminHealthActionsCoverage',adminHealthActionsCoverage as ActionHandler);
add(registryAdmin,'adminActionsList',adminActionsList as ActionHandler);
add(registryAdmin,'adminMe',adminMe as ActionHandler);
add(registryAdmin,'adminStoresList',adminStoresList as ActionHandler);
add(registryAdmin,'adminStoresGet',adminStoresGet as ActionHandler);
add(registryAdmin,'adminStoresCreate',adminStoresCreate as ActionHandler);
add(registryAdmin,'adminStoresUpdate',adminStoresUpdate as ActionHandler);
add(registryAdmin,'adminStoresDisable',adminStoresDisable as ActionHandler);
add(registryAdmin,'adminStoreSettingsGet',adminStoreSettingsGet as ActionHandler);
add(registryAdmin,'adminStoreSettingsUpdate',adminStoreSettingsUpdate as ActionHandler);
add(registryAdmin,'adminCustomersList',adminCustomersList as ActionHandler);
add(registryAdmin,'adminCustomersGet',adminCustomersGet as ActionHandler);
add(registryAdmin,'adminCustomersUpdate',adminCustomersUpdate as ActionHandler);
add(registryAdmin,'adminCustomersDisable',adminCustomersDisable as ActionHandler);
add(registryAdmin,'adminCustomersSearch',adminCustomersSearch as ActionHandler);
add(registryAdmin,'adminCategoriesList',adminCategoriesList as ActionHandler);
add(registryAdmin,'adminCategoriesGet',adminCategoriesGet as ActionHandler);
add(registryAdmin,'adminCategoriesCreate',adminCategoriesCreate as ActionHandler);
add(registryAdmin,'adminCategoriesUpdate',adminCategoriesUpdate as ActionHandler);
add(registryAdmin,'adminCategoriesDisable',adminCategoriesDisable as ActionHandler);
add(registryAdmin,'adminBannersList',adminBannersList as ActionHandler);
add(registryAdmin,'adminBannersGet',adminBannersGet as ActionHandler);
add(registryAdmin,'adminBannersCreate',adminBannersCreate as ActionHandler);
add(registryAdmin,'adminBannersUpdate',adminBannersUpdate as ActionHandler);
add(registryAdmin,'adminBannersDisable',adminBannersDisable as ActionHandler);
add(registryAdmin,'adminFeaturedList',adminFeaturedList as ActionHandler);
add(registryAdmin,'adminFeaturedSearchProducts',adminFeaturedSearchProducts as ActionHandler);
add(registryAdmin,'adminFeaturedSet',adminFeaturedSet as ActionHandler);
add(registryAdmin,'adminProductsList',adminProductsList as ActionHandler);
add(registryAdmin,'adminProductsGet',adminProductsGet as ActionHandler);
add(registryAdmin,'adminProductsCreate',adminProductsCreate as ActionHandler);
add(registryAdmin,'adminProductsUpdate',adminProductsUpdate as ActionHandler);
add(registryAdmin,'adminProductsDisable',adminProductsDisable as ActionHandler);
add(registryAdmin,'adminProductImagesList',adminProductImagesList as ActionHandler);
add(registryAdmin,'adminProductImagesAdd',adminProductImagesAdd as ActionHandler);
add(registryAdmin,'adminProductImagesRemove',adminProductImagesRemove as ActionHandler);
add(registryAdmin,'adminProductImagesReorder',adminProductImagesReorder as ActionHandler);
add(registryAdmin,'adminProductSpecsList',adminProductSpecsList as ActionHandler);
add(registryAdmin,'adminProductSpecsCreate',adminProductSpecsCreate as ActionHandler);
add(registryAdmin,'adminProductSpecsUpdate',adminProductSpecsUpdate as ActionHandler);
add(registryAdmin,'adminProductSpecsDelete',adminProductSpecsDelete as ActionHandler);
add(registryAdmin,'adminProductVariantsList',adminProductVariantsList as ActionHandler);
add(registryAdmin,'adminProductVariantsCreate',adminProductVariantsCreate as ActionHandler);
add(registryAdmin,'adminProductVariantsUpdate',adminProductVariantsUpdate as ActionHandler);
add(registryAdmin,'adminProductVariantsDelete',adminProductVariantsDelete as ActionHandler);
add(registryAdmin,'adminProductVariantsBulkStockUpdate',adminProductVariantsBulkStockUpdate as ActionHandler);
add(registryAdmin,'adminInventoryAdjust',adminInventoryAdjust as ActionHandler);
add(registryAdmin,'adminInventoryHistory',adminInventoryHistory as ActionHandler);
add(registryAdmin,'adminInventoryLowStockReport',adminInventoryLowStockReport as ActionHandler);
add(registryAdmin,'adminHomeSectionsList',adminHomeSectionsList as ActionHandler);
add(registryAdmin,'adminHomeSectionsGet',adminHomeSectionsGet as ActionHandler);
add(registryAdmin,'adminHomeSectionsCreate',adminHomeSectionsCreate as ActionHandler);
add(registryAdmin,'adminHomeSectionsUpdate',adminHomeSectionsUpdate as ActionHandler);
add(registryAdmin,'adminHomeSectionsDisable',adminHomeSectionsDisable as ActionHandler);
add(registryAdmin,'adminHomeSectionsReorder',adminHomeSectionsReorder as ActionHandler);
add(registryAdmin,'adminSeoGet',adminSeoGet as ActionHandler);
add(registryAdmin,'adminSeoUpdate',adminSeoUpdate as ActionHandler);
add(registryAdmin,'adminLandingPagesList',adminLandingPagesList as ActionHandler);
add(registryAdmin,'adminLandingPagesGet',adminLandingPagesGet as ActionHandler);
add(registryAdmin,'adminLandingPagesCreate',adminLandingPagesCreate as ActionHandler);
add(registryAdmin,'adminLandingPagesUpdate',adminLandingPagesUpdate as ActionHandler);
add(registryAdmin,'adminLandingPagesPublish',adminLandingPagesPublish as ActionHandler);
add(registryAdmin,'adminLandingPagesUnpublish',adminLandingPagesUnpublish as ActionHandler);
add(registryAdmin,'adminLandingPagesDisable',adminLandingPagesDisable as ActionHandler);
add(registryAdmin,'adminSitemapRegenerate',adminSitemapRegenerate as ActionHandler);
add(registryAdmin,'adminMediaCreateUploadSpec',adminMediaCreateUploadSpec as ActionHandler);
add(registryAdmin,'adminMediaFinalizeUpload',adminMediaFinalizeUpload as ActionHandler);
