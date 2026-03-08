import Joi from 'joi';
import { ACTION_SPECS } from './validate';
import { isDevRelaxedValidationEnabled } from '../utils/queryNormalization';

const relaxedQueryValidation = isDevRelaxedValidationEnabled();
const requiredInStrictProd = (schema: any) => (relaxedQueryValidation ? schema.optional() : schema.required());

const uploadPayload = Joi.object({
  ownerType: Joi.string().required(),
  ownerId: Joi.string().required(),
  kind: Joi.string().valid('image', 'document').required(),
  contentType: Joi.string().required(),
  sizeBytes: Joi.number().integer().positive().required(),
  fileExt: Joi.string().pattern(/^[a-zA-Z0-9]+$/).required(),
}).required();

const finalizePayload = Joi.object({
  assetId: Joi.string().guid({ version: ['uuidv4', 'uuidv5'] }).required(),
}).required();

const addressPayload = Joi.object({
  label: Joi.string().max(40).required(),
  recipientName: Joi.string().max(80).required(),
  phone: Joi.string().max(32).allow(null, ''),
  governorate: Joi.string().max(80).required(),
  city: Joi.string().max(80).required(),
  area: Joi.string().max(120).allow(null, ''),
  street: Joi.string().max(160).required(),
  building: Joi.string().max(60).allow(null, ''),
  floor: Joi.string().max(30).allow(null, ''),
  apartment: Joi.string().max(30).allow(null, ''),
  landmark: Joi.string().max(160).allow(null, ''),
  lat: Joi.number().required(),
  lng: Joi.number().required(),
  notes: Joi.string().max(300).allow(null, ''),
  isDefault: Joi.boolean().optional(),
});

const profileUpdatePayload = Joi.object({
  phone: Joi.string().max(32).allow(null, ''),
  email: Joi.string().max(255).allow(null, ''),
  displayName: Joi.string().max(80).allow(null, ''),
  locale: Joi.string().max(10).allow(null, ''),
  marketingOptIn: Joi.boolean().optional(),
}).required();

[
  'publicHealthPing',
  'publicActionsList',
  'clientHealthWhoAmI',
  'clientActionsList',
  'authEnsureUserProfile',
  'profileGet',
  'addressesList',
  'storesList',
  'storeContextGetMyStore',
  'adminHealthWhoAmI',
  'adminHealthDbCheck',
  'adminHealthActionsCoverage',
  'adminActionsList',
  'adminMe',
  'adminStoresList',
].forEach((name) => {
  ACTION_SPECS[name] = {
    schema: Joi.any().optional(),
    notes: 'No payload',
    errorCodes: ['VALIDATION_ERROR'],
  };
});

ACTION_SPECS.profileUpdate = { schema: profileUpdatePayload, notes: 'Update own profile', errorCodes: ['VALIDATION_ERROR', 'ACCOUNT_DISABLED'] };
ACTION_SPECS.accountDeleteRequest = { schema: Joi.object({ reason: Joi.string().max(500).allow(null, '') }).required(), notes: 'Create delete request', errorCodes: ['VALIDATION_ERROR'] };
ACTION_SPECS.addressesCreate = { schema: addressPayload.required(), notes: 'Create address', errorCodes: ['VALIDATION_ERROR', 'ACCOUNT_DISABLED'] };
ACTION_SPECS.addressesUpdate = { schema: addressPayload.keys({ id: Joi.string().guid({ version: ['uuidv4', 'uuidv5'] }).required() }).required(), notes: 'Update address', errorCodes: ['VALIDATION_ERROR', 'NOT_FOUND'] };
ACTION_SPECS.addressesDelete = { schema: Joi.object({ id: Joi.string().guid({ version: ['uuidv4', 'uuidv5'] }).required() }).required(), notes: 'Delete address', errorCodes: ['VALIDATION_ERROR', 'NOT_FOUND'] };
ACTION_SPECS.addressesSetDefault = { schema: Joi.object({ id: Joi.string().guid({ version: ['uuidv4', 'uuidv5'] }).required() }).required(), notes: 'Set default address', errorCodes: ['VALIDATION_ERROR', 'NOT_FOUND'] };
ACTION_SPECS.storesGet = { schema: Joi.object({ storeId: Joi.string().required() }).required(), notes: 'Get active store', errorCodes: ['VALIDATION_ERROR', 'NOT_FOUND'] };
ACTION_SPECS.storeContextSetMyStore = { schema: Joi.object({ storeId: Joi.string().required() }).required(), notes: 'Set selected store', errorCodes: ['VALIDATION_ERROR'] };

ACTION_SPECS.adminStoresGet = { schema: Joi.object({ storeId: Joi.string().required() }).required(), notes: 'Admin get store', errorCodes: ['VALIDATION_ERROR', 'NOT_FOUND'] };
ACTION_SPECS.adminStoresCreate = { schema: Joi.object({ storeId: Joi.string().required(), name: Joi.string().max(120).required(), currency: Joi.string().max(8).optional(), taxMode: Joi.string().max(24).optional(), supportWhatsApp: Joi.string().max(32).allow(null, ''), supportEmail: Joi.string().max(255).allow(null, ''), pickupEnabled: Joi.boolean().optional(), deliveryEnabled: Joi.boolean().optional() }).required(), notes: 'Create store', errorCodes: ['VALIDATION_ERROR', 'CONFLICT'] };
ACTION_SPECS.adminStoresUpdate = { schema: Joi.object({ storeId: Joi.string().required(), name: Joi.string().max(120).required(), status: Joi.string().max(24).optional() }).required(), notes: 'Update store', errorCodes: ['VALIDATION_ERROR', 'NOT_FOUND'] };
ACTION_SPECS.adminStoresDisable = { schema: Joi.object({ storeId: Joi.string().required(), reason: Joi.string().max(300).allow(null, '') }).required(), notes: 'Disable store', errorCodes: ['VALIDATION_ERROR', 'NOT_FOUND'] };
ACTION_SPECS.adminStoreSettingsGet = { schema: Joi.object({ storeId: Joi.string().required() }).required(), notes: 'Get store settings', errorCodes: ['VALIDATION_ERROR', 'NOT_FOUND'] };
ACTION_SPECS.adminStoreSettingsUpdate = { schema: Joi.object({ storeId: Joi.string().required(), currency: Joi.string().max(8).required(), taxMode: Joi.string().max(24).required(), supportWhatsApp: Joi.string().max(32).allow(null, ''), supportEmail: Joi.string().max(255).allow(null, ''), pickupEnabled: Joi.boolean().required(), deliveryEnabled: Joi.boolean().required() }).required(), notes: 'Update store settings', errorCodes: ['VALIDATION_ERROR'] };
ACTION_SPECS.adminCustomersList = { schema: Joi.object({ limit: Joi.number().integer().min(1).max(100).optional(), offset: Joi.number().integer().min(0).optional() }).optional(), notes: 'List customers', errorCodes: ['VALIDATION_ERROR'] };
ACTION_SPECS.adminCustomersGet = { schema: Joi.object({ uid: Joi.string().required() }).required(), notes: 'Get customer', errorCodes: ['VALIDATION_ERROR', 'NOT_FOUND'] };
ACTION_SPECS.adminCustomersUpdate = { schema: Joi.object({ uid: Joi.string().required(), phone: Joi.string().max(32).allow(null, ''), email: Joi.string().max(255).allow(null, ''), displayName: Joi.string().max(80).allow(null, ''), locale: Joi.string().max(10).allow(null, ''), marketingOptIn: Joi.boolean().optional(), status: Joi.string().max(24).optional() }).required(), notes: 'Update customer', errorCodes: ['VALIDATION_ERROR', 'NOT_FOUND'] };
ACTION_SPECS.adminCustomersDisable = { schema: Joi.object({ uid: Joi.string().required(), reason: Joi.string().max(300).allow(null, '') }).required(), notes: 'Disable customer', errorCodes: ['VALIDATION_ERROR', 'NOT_FOUND'] };
ACTION_SPECS.adminCustomersSearch = { schema: Joi.object({ query: Joi.string().allow('', null), limit: Joi.number().integer().min(1).max(100).optional() }).optional(), notes: 'Search customers', errorCodes: ['VALIDATION_ERROR'] };

ACTION_SPECS.mediaCreateUploadSpec = { schema: uploadPayload, notes: 'Client media upload spec creation', errorCodes: ['VALIDATION_ERROR', 'CONFIG_ERROR'] };
ACTION_SPECS.adminMediaCreateUploadSpec = { schema: uploadPayload, notes: 'Admin media upload spec creation', errorCodes: ['VALIDATION_ERROR', 'CONFIG_ERROR'] };
ACTION_SPECS.mediaFinalizeUpload = { schema: finalizePayload, notes: 'Client finalize upload', errorCodes: ['VALIDATION_ERROR', 'NOT_FOUND', 'FORBIDDEN'] };
ACTION_SPECS.adminMediaFinalizeUpload = { schema: finalizePayload, notes: 'Admin finalize upload', errorCodes: ['VALIDATION_ERROR', 'NOT_FOUND', 'FORBIDDEN'] };


const idSchema = Joi.object({ id: Joi.string().guid({ version: ['uuidv4', 'uuidv5'] }).required() }).required();
const storeScoped = Joi.object({ storeId: Joi.string().required() }).required();

['publicCatalogGetHome','publicCatalogGetCategories','publicCatalogGetFilters','productFavoritesList','storeFavoritesList'].forEach((n)=>{ACTION_SPECS[n]={schema:Joi.any().optional(),notes:'No payload',errorCodes:['VALIDATION_ERROR']};});
ACTION_SPECS.homeGetLayout={schema:Joi.object({ mode:Joi.string().valid('live','preview').optional() }).optional(),notes:'Home layout by mode',errorCodes:['VALIDATION_ERROR']};
ACTION_SPECS.publicCatalogListProducts={schema:Joi.object({categoryId:Joi.string().optional(),limit:Joi.number().integer().min(1).max(100).optional(),offset:Joi.number().integer().min(0).optional()}).optional(),notes:'Catalog list',errorCodes:['VALIDATION_ERROR']};
ACTION_SPECS.publicCatalogSearchProducts={schema:Joi.object({query:Joi.string().allow('',null),limit:Joi.number().integer().min(1).max(100).optional(),offset:Joi.number().integer().min(0).optional()}).optional(),notes:'Catalog search',errorCodes:['VALIDATION_ERROR']};
ACTION_SPECS.publicProductGetById={schema:Joi.object({productId:Joi.string().required()}).required(),notes:'Product by id',errorCodes:['VALIDATION_ERROR']};
ACTION_SPECS.publicProductGetBySlug={schema:Joi.object({slug:Joi.string().required()}).required(),notes:'Product by slug',errorCodes:['VALIDATION_ERROR']};
ACTION_SPECS.publicCategoryGetById={schema:Joi.object({categoryId:Joi.string().required()}).required(),notes:'Category by id',errorCodes:['VALIDATION_ERROR']};
ACTION_SPECS.publicCategoryGetBySlug={schema:Joi.object({slug:Joi.string().required()}).required(),notes:'Category by slug',errorCodes:['VALIDATION_ERROR']};
ACTION_SPECS.publicSeoGetPageMeta={schema:Joi.object({pageType:Joi.string().required(),pageKey:Joi.string().required()}).required(),notes:'SEO meta',errorCodes:['VALIDATION_ERROR']};
ACTION_SPECS.publicSeoGetLanding={schema:Joi.object({slug:Joi.string().required()}).required(),notes:'Landing',errorCodes:['VALIDATION_ERROR']};
ACTION_SPECS.productFavoritesToggle={schema:Joi.object({productId:Joi.string().required()}).required(),notes:'Toggle favorite product',errorCodes:['VALIDATION_ERROR']};
ACTION_SPECS.storeFavoritesToggle={schema:Joi.object({storeId:Joi.string().required()}).required(),notes:'Toggle favorite store',errorCodes:['VALIDATION_ERROR']};

['adminCategoriesList','adminBannersList','adminFeaturedList','adminProductsList','adminHomeSectionsList','adminLandingPagesList','adminInventoryLowStockReport','adminSitemapRegenerate'].forEach((n)=>{ACTION_SPECS[n]={schema:storeScoped,notes:'Store scoped list',errorCodes:['VALIDATION_ERROR']};});
['adminCategoriesGet','adminCategoriesDisable','adminBannersGet','adminBannersDisable','adminProductsGet','adminProductsDisable','adminHomeSectionsGet','adminHomeSectionsDisable','adminLandingPagesGet','adminLandingPagesPublish','adminLandingPagesUnpublish','adminLandingPagesDisable'].forEach((n)=>{ACTION_SPECS[n]={schema:idSchema,notes:'By id',errorCodes:['VALIDATION_ERROR']};});
ACTION_SPECS.adminCategoriesCreate={schema:Joi.object({storeId:Joi.string().required(),name:Joi.string().required(),slug:Joi.string().required(),parentId:Joi.string().allow(null,''),sortOrder:Joi.number().integer().optional(),status:Joi.string().optional()}).required(),notes:'Create category',errorCodes:['VALIDATION_ERROR']};
ACTION_SPECS.adminCategoriesUpdate={schema:Joi.object({id:Joi.string().required(),name:Joi.string().optional(),slug:Joi.string().optional(),parentId:Joi.string().allow(null,''),sortOrder:Joi.number().integer().optional(),status:Joi.string().optional()}).required(),notes:'Update category',errorCodes:['VALIDATION_ERROR']};
ACTION_SPECS.adminBannersCreate={schema:Joi.object({storeId:Joi.string().required(),title:Joi.string().required(),mediaAssetId:Joi.string().required(),linkUrl:Joi.string().allow(null,''),sortOrder:Joi.number().integer().optional(),status:Joi.string().optional()}).required(),notes:'Create banner',errorCodes:['VALIDATION_ERROR']};
ACTION_SPECS.adminBannersUpdate={schema:Joi.object({id:Joi.string().required(),title:Joi.string().optional(),mediaAssetId:Joi.string().optional(),linkUrl:Joi.string().allow(null,''),sortOrder:Joi.number().integer().optional(),status:Joi.string().optional()}).required(),notes:'Update banner',errorCodes:['VALIDATION_ERROR']};
ACTION_SPECS.adminFeaturedSearchProducts={schema:Joi.object({storeId:Joi.string().required(),query:Joi.string().allow('',null),limit:Joi.number().integer().min(1).max(100).optional()}).required(),notes:'Search products for featured',errorCodes:['VALIDATION_ERROR']};
ACTION_SPECS.adminFeaturedSet={schema:Joi.object({storeId:Joi.string().required(),productIds:Joi.any().required()}).required(),notes:'Set featured',errorCodes:['VALIDATION_ERROR']};
ACTION_SPECS.adminProductsCreate={schema:Joi.object({storeId:Joi.string().required(),categoryId:Joi.string().required(),name:Joi.string().required(),slug:Joi.string().required(),description:Joi.string().allow(null,''),status:Joi.string().optional()}).required(),notes:'Create product',errorCodes:['VALIDATION_ERROR']};
ACTION_SPECS.adminProductsUpdate={schema:Joi.object({id:Joi.string().required(),categoryId:Joi.string().optional(),name:Joi.string().optional(),slug:Joi.string().optional(),description:Joi.string().allow(null,''),status:Joi.string().optional()}).required(),notes:'Update product',errorCodes:['VALIDATION_ERROR']};
ACTION_SPECS.adminProductImagesList={schema:Joi.object({productId:Joi.string().required()}).required(),notes:'list images',errorCodes:['VALIDATION_ERROR']};
ACTION_SPECS.adminProductImagesAdd={schema:Joi.object({productId:Joi.string().required(),mediaAssetId:Joi.string().required(),sortOrder:Joi.number().integer().optional()}).required(),notes:'add image',errorCodes:['VALIDATION_ERROR']};
ACTION_SPECS.adminProductImagesRemove={schema:idSchema,notes:'remove image',errorCodes:['VALIDATION_ERROR']};
ACTION_SPECS.adminProductImagesReorder={schema:Joi.object({productId:Joi.string().required(),items:Joi.any().required()}).required(),notes:'reorder images',errorCodes:['VALIDATION_ERROR']};
ACTION_SPECS.adminProductSpecsList={schema:Joi.object({productId:Joi.string().required()}).required(),notes:'list specs',errorCodes:['VALIDATION_ERROR']};
ACTION_SPECS.adminProductSpecsCreate={schema:Joi.object({productId:Joi.string().required(),specKey:Joi.string().required(),specValue:Joi.string().required(),sortOrder:Joi.number().integer().optional()}).required(),notes:'create spec',errorCodes:['VALIDATION_ERROR']};
ACTION_SPECS.adminProductSpecsUpdate={schema:Joi.object({id:Joi.string().required(),productId:Joi.string().required(),specKey:Joi.string().optional(),specValue:Joi.string().optional(),sortOrder:Joi.number().integer().optional()}).required(),notes:'update spec',errorCodes:['VALIDATION_ERROR']};
ACTION_SPECS.adminProductSpecsDelete={schema:idSchema,notes:'delete spec',errorCodes:['VALIDATION_ERROR']};
ACTION_SPECS.adminProductVariantsList={schema:Joi.object({productId:Joi.string().required()}).required(),notes:'list variants',errorCodes:['VALIDATION_ERROR']};
ACTION_SPECS.adminProductVariantsCreate={schema:Joi.object({productId:Joi.string().required(),sku:Joi.string().required(),priceCents:Joi.number().integer().required(),stockQty:Joi.number().integer().required(),attributes:Joi.any().optional(),status:Joi.string().optional()}).required(),notes:'create variant',errorCodes:['VALIDATION_ERROR']};
ACTION_SPECS.adminProductVariantsUpdate={schema:Joi.object({id:Joi.string().required(),productId:Joi.string().required(),sku:Joi.string().optional(),priceCents:Joi.number().integer().optional(),stockQty:Joi.number().integer().optional(),attributes:Joi.any().optional(),status:Joi.string().optional()}).required(),notes:'update variant',errorCodes:['VALIDATION_ERROR']};
ACTION_SPECS.adminProductVariantsDelete={schema:idSchema,notes:'delete variant',errorCodes:['VALIDATION_ERROR']};
ACTION_SPECS.adminProductVariantsBulkStockUpdate={schema:Joi.object({items:Joi.any().required()}).required(),notes:'bulk stock',errorCodes:['VALIDATION_ERROR']};
ACTION_SPECS.adminInventoryAdjust={schema:Joi.object({variantId:Joi.string().required(),deltaQty:Joi.number().integer().required(),reason:Joi.string().allow(null,'')}).required(),notes:'adjust inventory',errorCodes:['VALIDATION_ERROR']};
ACTION_SPECS.adminInventoryHistory={schema:Joi.object({variantId:Joi.string().required()}).required(),notes:'inventory history',errorCodes:['VALIDATION_ERROR']};
ACTION_SPECS.adminHomeSectionsGet={schema:idSchema,notes:'get section',errorCodes:['VALIDATION_ERROR']};
ACTION_SPECS.adminHomeSectionsCreate={schema:Joi.object({storeId:Joi.string().required(),type:Joi.string().valid('heroCarousel','categoryGrid','productRail','promoStrip','infoTiles').required(),config:Joi.any().optional(),sortOrder:Joi.number().integer().optional(),enabled:Joi.boolean().optional()}).required(),notes:'create section',errorCodes:['VALIDATION_ERROR']};
ACTION_SPECS.adminHomeSectionsUpdate={schema:Joi.object({id:Joi.string().required(),type:Joi.string().valid('heroCarousel','categoryGrid','productRail','promoStrip','infoTiles').optional(),config:Joi.any().optional(),sortOrder:Joi.number().integer().optional(),enabled:Joi.boolean().optional()}).required(),notes:'update section',errorCodes:['VALIDATION_ERROR']};
ACTION_SPECS.adminHomeSectionsReorder={schema:Joi.object({storeId:Joi.string().required(),items:Joi.any().required()}).required(),notes:'reorder section',errorCodes:['VALIDATION_ERROR']};
ACTION_SPECS.adminSeoGet={schema:Joi.object({storeId:Joi.string().required(),pageType:Joi.string().required(),pageKey:Joi.string().required()}).required(),notes:'get seo',errorCodes:['VALIDATION_ERROR']};
ACTION_SPECS.adminSeoUpdate={schema:Joi.object({id:Joi.string().optional(),storeId:Joi.string().required(),pageType:Joi.string().required(),pageKey:Joi.string().required(),title:Joi.string().allow(null,''),description:Joi.string().allow(null,''),extra:Joi.any().optional()}).required(),notes:'update seo',errorCodes:['VALIDATION_ERROR']};
ACTION_SPECS.adminLandingPagesGet={schema:idSchema,notes:'get landing page',errorCodes:['VALIDATION_ERROR']};
ACTION_SPECS.adminLandingPagesCreate={schema:Joi.object({storeId:Joi.string().required(),slug:Joi.string().required(),title:Joi.string().required(),body:Joi.any().required()}).required(),notes:'create landing',errorCodes:['VALIDATION_ERROR']};
ACTION_SPECS.adminLandingPagesUpdate={schema:Joi.object({id:Joi.string().required(),slug:Joi.string().optional(),title:Joi.string().optional(),body:Joi.any().optional(),status:Joi.string().optional()}).required(),notes:'update landing',errorCodes:['VALIDATION_ERROR']};

const phase4ClientAny = ['cartGet','cartClear','cartRemoveCoupon','notificationsList','notificationsMarkAllRead','loyaltyGetDashboard','loyaltyListTransactions','walletGet','walletHistory','alertsGetPrefs','recoGetCartUpsell','postPurchaseGetNudges','supportListTickets','settingsGet'];
phase4ClientAny.forEach((n)=>{ACTION_SPECS[n]={schema:Joi.any().optional(),notes:'phase4',errorCodes:['VALIDATION_ERROR']};});
ACTION_SPECS.cartAddItem={schema:Joi.object({productId:Joi.string().required(),variantId:Joi.string().required(),qty:Joi.number().integer().min(1).required()}).required(),notes:'phase4',errorCodes:['VALIDATION_ERROR']};
ACTION_SPECS.cartUpdateQty={schema:Joi.object({itemId:Joi.string().required(),qty:Joi.number().integer().min(1).required()}).required(),notes:'phase4',errorCodes:['VALIDATION_ERROR']};
ACTION_SPECS.cartRemoveItem={schema:Joi.object({itemId:Joi.string().required()}).required(),notes:'phase4',errorCodes:['VALIDATION_ERROR']};
ACTION_SPECS.cartApplyCoupon={schema:Joi.object({code:Joi.string().required()}).required(),notes:'phase4',errorCodes:['VALIDATION_ERROR']};
ACTION_SPECS.shippingQuoteDelivery={schema:Joi.object({lat:Joi.number().required(),lng:Joi.number().required()}).required(),notes:'phase4',errorCodes:['VALIDATION_ERROR']};
ACTION_SPECS.checkoutPreview={schema:Joi.any().optional(),notes:'phase4',errorCodes:['VALIDATION_ERROR']};
ACTION_SPECS.notificationsRegisterToken={schema:Joi.object({token:Joi.string().required(),platform:Joi.string().optional()}).required(),notes:'phase4',errorCodes:['VALIDATION_ERROR']};
ACTION_SPECS.notificationsMarkRead={schema:Joi.object({id:Joi.string().required()}).required(),notes:'phase4',errorCodes:['VALIDATION_ERROR']};
ACTION_SPECS.notificationsDelete={schema:Joi.object({id:Joi.string().required()}).required(),notes:'phase4',errorCodes:['VALIDATION_ERROR']};
ACTION_SPECS.loyaltyRedeem={schema:Joi.object({points:Joi.number().integer().min(1).required()}).required(),notes:'phase4',errorCodes:['VALIDATION_ERROR']};
ACTION_SPECS.marketingCapture={schema:Joi.object({source:Joi.string().allow(null,''),campaign:Joi.string().allow(null,''),medium:Joi.string().allow(null,''),term:Joi.string().allow(null,''),content:Joi.string().allow(null,''),dedupeKey:Joi.string().allow(null,'')}).required(),notes:'phase4',errorCodes:['VALIDATION_ERROR']};
ACTION_SPECS.alertsUpdatePrefs={schema:Joi.object({backInStock:Joi.boolean().required(),priceDrop:Joi.boolean().required()}).required(),notes:'phase4',errorCodes:['VALIDATION_ERROR']};
ACTION_SPECS.alertsSubscribeBackInStock={schema:Joi.object({productId:Joi.string().required()}).required(),notes:'phase4',errorCodes:['VALIDATION_ERROR']};
ACTION_SPECS.recoGetSimilar={schema:Joi.object({productId:Joi.string().required()}).required(),notes:'phase4',errorCodes:['VALIDATION_ERROR']};
ACTION_SPECS.supportCreateTicket={schema:Joi.object({subject:Joi.string().required(),message:Joi.string().required(),mediaAssetId:Joi.string().allow(null,'')}).required(),notes:'phase4',errorCodes:['VALIDATION_ERROR']};
ACTION_SPECS.supportGetTicket={schema:Joi.object({ticketId:Joi.string().required()}).required(),notes:'phase4',errorCodes:['VALIDATION_ERROR']};
ACTION_SPECS.supportAddMessage={schema:Joi.object({ticketId:Joi.string().required(),message:Joi.string().required(),mediaAssetId:Joi.string().allow(null,'')}).required(),notes:'phase4',errorCodes:['VALIDATION_ERROR']};
ACTION_SPECS.supportCloseTicket={schema:Joi.object({ticketId:Joi.string().required()}).required(),notes:'phase4',errorCodes:['VALIDATION_ERROR']};
ACTION_SPECS.settingsUpdate={schema:Joi.object({config:Joi.any().required()}).required(),notes:'phase4',errorCodes:['VALIDATION_ERROR']};
ACTION_SPECS.legalGetDocs={schema:Joi.object({docType:Joi.string().optional()}).optional(),notes:'phase4',errorCodes:['VALIDATION_ERROR']};
ACTION_SPECS.adminDiscountsPreviewAudienceCount={schema:Joi.object({storeId:Joi.string().required()}).required(),notes:'phase4',errorCodes:['VALIDATION_ERROR']};
ACTION_SPECS.adminNotificationsSend={schema:Joi.object({title:Joi.string().required(),body:Joi.string().required(),limit:Joi.number().integer().optional()}).required(),notes:'phase4',errorCodes:['VALIDATION_ERROR']};
ACTION_SPECS.adminNotificationsList={schema:Joi.object({limit:Joi.number().integer().optional()}).optional(),notes:'phase4',errorCodes:['VALIDATION_ERROR']};
ACTION_SPECS.adminLoyaltyGetSettings={schema:Joi.object({storeId:Joi.string().required()}).required(),notes:'phase4',errorCodes:['VALIDATION_ERROR']};
ACTION_SPECS.adminLoyaltyUpdateSettings={schema:Joi.object({storeId:Joi.string().required(),pointsPerCurrencyUnit:Joi.number().integer().required(),redeemStepPoints:Joi.number().integer().required(),redeemStepValueCents:Joi.number().integer().required()}).required(),notes:'phase4',errorCodes:['VALIDATION_ERROR']};
ACTION_SPECS.adminLoyaltyAdjustUserPoints={schema:Joi.object({uid:Joi.string().required(),storeId:Joi.string().required(),pointsDelta:Joi.number().integer().required()}).required(),notes:'phase4',errorCodes:['VALIDATION_ERROR']};
ACTION_SPECS.adminReportsAttributionOverview={schema:Joi.object({storeId:Joi.string().required()}).required(),notes:'phase4',errorCodes:['VALIDATION_ERROR']};
ACTION_SPECS.adminReportsTopCampaigns={schema:Joi.object({storeId:Joi.string().required(),limit:Joi.number().integer().optional()}).required(),notes:'phase4',errorCodes:['VALIDATION_ERROR']};
ACTION_SPECS.adminPostPurchaseRunsList={schema:Joi.object({limit:Joi.number().integer().optional()}).optional(),notes:'phase4',errorCodes:['VALIDATION_ERROR']};
if(!ACTION_SPECS.adminShippingMethodsList) ACTION_SPECS.adminShippingMethodsList={schema:Joi.any().optional(),notes:'phase4',errorCodes:['VALIDATION_ERROR']};
if(!ACTION_SPECS.adminShippingMethodsGet) ACTION_SPECS.adminShippingMethodsGet={schema:Joi.any().optional(),notes:'phase4',errorCodes:['VALIDATION_ERROR']};
if(!ACTION_SPECS.adminShippingMethodsCreate) ACTION_SPECS.adminShippingMethodsCreate={schema:Joi.any().optional(),notes:'phase4',errorCodes:['VALIDATION_ERROR']};
if(!ACTION_SPECS.adminShippingMethodsUpdate) ACTION_SPECS.adminShippingMethodsUpdate={schema:Joi.any().optional(),notes:'phase4',errorCodes:['VALIDATION_ERROR']};
if(!ACTION_SPECS.adminShippingMethodsDisable) ACTION_SPECS.adminShippingMethodsDisable={schema:Joi.any().optional(),notes:'phase4',errorCodes:['VALIDATION_ERROR']};
if(!ACTION_SPECS.adminDeliveryZonesList) ACTION_SPECS.adminDeliveryZonesList={schema:Joi.any().optional(),notes:'phase4',errorCodes:['VALIDATION_ERROR']};
if(!ACTION_SPECS.adminDeliveryZonesGet) ACTION_SPECS.adminDeliveryZonesGet={schema:Joi.any().optional(),notes:'phase4',errorCodes:['VALIDATION_ERROR']};
if(!ACTION_SPECS.adminDeliveryZonesCreate) ACTION_SPECS.adminDeliveryZonesCreate={schema:Joi.any().optional(),notes:'phase4',errorCodes:['VALIDATION_ERROR']};
if(!ACTION_SPECS.adminDeliveryZonesUpdate) ACTION_SPECS.adminDeliveryZonesUpdate={schema:Joi.any().optional(),notes:'phase4',errorCodes:['VALIDATION_ERROR']};
if(!ACTION_SPECS.adminDeliveryZonesDisable) ACTION_SPECS.adminDeliveryZonesDisable={schema:Joi.any().optional(),notes:'phase4',errorCodes:['VALIDATION_ERROR']};
if(!ACTION_SPECS.adminCouponsList) ACTION_SPECS.adminCouponsList={schema:Joi.any().optional(),notes:'phase4',errorCodes:['VALIDATION_ERROR']};
if(!ACTION_SPECS.adminCouponsGet) ACTION_SPECS.adminCouponsGet={schema:Joi.any().optional(),notes:'phase4',errorCodes:['VALIDATION_ERROR']};
if(!ACTION_SPECS.adminCouponsCreate) ACTION_SPECS.adminCouponsCreate={schema:Joi.any().optional(),notes:'phase4',errorCodes:['VALIDATION_ERROR']};
if(!ACTION_SPECS.adminCouponsUpdate) ACTION_SPECS.adminCouponsUpdate={schema:Joi.any().optional(),notes:'phase4',errorCodes:['VALIDATION_ERROR']};
if(!ACTION_SPECS.adminCouponsDisable) ACTION_SPECS.adminCouponsDisable={schema:Joi.any().optional(),notes:'phase4',errorCodes:['VALIDATION_ERROR']};
if(!ACTION_SPECS.adminCashbackList) ACTION_SPECS.adminCashbackList={schema:Joi.any().optional(),notes:'phase4',errorCodes:['VALIDATION_ERROR']};
if(!ACTION_SPECS.adminCashbackGet) ACTION_SPECS.adminCashbackGet={schema:Joi.any().optional(),notes:'phase4',errorCodes:['VALIDATION_ERROR']};
if(!ACTION_SPECS.adminCashbackCreate) ACTION_SPECS.adminCashbackCreate={schema:Joi.any().optional(),notes:'phase4',errorCodes:['VALIDATION_ERROR']};
if(!ACTION_SPECS.adminCashbackUpdate) ACTION_SPECS.adminCashbackUpdate={schema:Joi.any().optional(),notes:'phase4',errorCodes:['VALIDATION_ERROR']};
if(!ACTION_SPECS.adminCashbackDisable) ACTION_SPECS.adminCashbackDisable={schema:Joi.any().optional(),notes:'phase4',errorCodes:['VALIDATION_ERROR']};
if(!ACTION_SPECS.adminDiscountsList) ACTION_SPECS.adminDiscountsList={schema:Joi.any().optional(),notes:'phase4',errorCodes:['VALIDATION_ERROR']};
if(!ACTION_SPECS.adminDiscountsGet) ACTION_SPECS.adminDiscountsGet={schema:Joi.any().optional(),notes:'phase4',errorCodes:['VALIDATION_ERROR']};
if(!ACTION_SPECS.adminDiscountsCreate) ACTION_SPECS.adminDiscountsCreate={schema:Joi.any().optional(),notes:'phase4',errorCodes:['VALIDATION_ERROR']};
if(!ACTION_SPECS.adminDiscountsUpdate) ACTION_SPECS.adminDiscountsUpdate={schema:Joi.any().optional(),notes:'phase4',errorCodes:['VALIDATION_ERROR']};
if(!ACTION_SPECS.adminDiscountsDisable) ACTION_SPECS.adminDiscountsDisable={schema:Joi.any().optional(),notes:'phase4',errorCodes:['VALIDATION_ERROR']};
if(!ACTION_SPECS.adminLoyaltyTiersList) ACTION_SPECS.adminLoyaltyTiersList={schema:Joi.any().optional(),notes:'phase4',errorCodes:['VALIDATION_ERROR']};
if(!ACTION_SPECS.adminLoyaltyTiersCreate) ACTION_SPECS.adminLoyaltyTiersCreate={schema:Joi.any().optional(),notes:'phase4',errorCodes:['VALIDATION_ERROR']};
if(!ACTION_SPECS.adminLoyaltyTiersUpdate) ACTION_SPECS.adminLoyaltyTiersUpdate={schema:Joi.any().optional(),notes:'phase4',errorCodes:['VALIDATION_ERROR']};
if(!ACTION_SPECS.adminLoyaltyTiersDisable) ACTION_SPECS.adminLoyaltyTiersDisable={schema:Joi.any().optional(),notes:'phase4',errorCodes:['VALIDATION_ERROR']};
if(!ACTION_SPECS.adminPostPurchaseFlowsList) ACTION_SPECS.adminPostPurchaseFlowsList={schema:Joi.any().optional(),notes:'phase4',errorCodes:['VALIDATION_ERROR']};
if(!ACTION_SPECS.adminPostPurchaseFlowsGet) ACTION_SPECS.adminPostPurchaseFlowsGet={schema:Joi.any().optional(),notes:'phase4',errorCodes:['VALIDATION_ERROR']};
if(!ACTION_SPECS.adminPostPurchaseFlowsCreate) ACTION_SPECS.adminPostPurchaseFlowsCreate={schema:Joi.any().optional(),notes:'phase4',errorCodes:['VALIDATION_ERROR']};
if(!ACTION_SPECS.adminPostPurchaseFlowsUpdate) ACTION_SPECS.adminPostPurchaseFlowsUpdate={schema:Joi.any().optional(),notes:'phase4',errorCodes:['VALIDATION_ERROR']};
if(!ACTION_SPECS.adminPostPurchaseFlowsDisable) ACTION_SPECS.adminPostPurchaseFlowsDisable={schema:Joi.any().optional(),notes:'phase4',errorCodes:['VALIDATION_ERROR']};

ACTION_SPECS.checkoutCreatePaymentSession={schema:Joi.any().optional(),notes:'phase5',errorCodes:['VALIDATION_ERROR']};
ACTION_SPECS.paymentsStatus={schema:Joi.any().optional(),notes:'phase5',errorCodes:['VALIDATION_ERROR']};
ACTION_SPECS.paymentsConfirm={schema:Joi.any().optional(),notes:'phase5',errorCodes:['VALIDATION_ERROR']};
ACTION_SPECS.ordersList={schema:Joi.any().optional(),notes:'phase5',errorCodes:['VALIDATION_ERROR']};
ACTION_SPECS.ordersGet={schema:Joi.any().optional(),notes:'phase5',errorCodes:['VALIDATION_ERROR']};
ACTION_SPECS.ordersTracking={schema:Joi.any().optional(),notes:'phase5',errorCodes:['VALIDATION_ERROR']};
ACTION_SPECS.ordersInvoiceUrl={schema:Joi.any().optional(),notes:'phase5',errorCodes:['VALIDATION_ERROR']};
ACTION_SPECS.ordersReorder={schema:Joi.any().optional(),notes:'phase5',errorCodes:['VALIDATION_ERROR']};
ACTION_SPECS.insuranceCreateDraft={schema:Joi.any().optional(),notes:'phase5',errorCodes:['VALIDATION_ERROR']};
ACTION_SPECS.insuranceAttachFiles={schema:Joi.any().optional(),notes:'phase5',errorCodes:['VALIDATION_ERROR']};
ACTION_SPECS.insuranceSubmit={schema:Joi.any().optional(),notes:'phase5',errorCodes:['VALIDATION_ERROR']};
ACTION_SPECS.insuranceGet={schema:Joi.any().optional(),notes:'phase5',errorCodes:['VALIDATION_ERROR']};
ACTION_SPECS.insuranceApproveQuote={schema:Joi.any().optional(),notes:'phase5',errorCodes:['VALIDATION_ERROR']};
ACTION_SPECS.insuranceRejectQuote={schema:Joi.any().optional(),notes:'phase5',errorCodes:['VALIDATION_ERROR']};
ACTION_SPECS.insuranceListMyOrders={schema:Joi.any().optional(),notes:'phase5',errorCodes:['VALIDATION_ERROR']};
ACTION_SPECS.adminOrdersList={schema:Joi.any().optional(),notes:'phase5',errorCodes:['VALIDATION_ERROR']};
ACTION_SPECS.adminOrdersGet={schema:Joi.any().optional(),notes:'phase5',errorCodes:['VALIDATION_ERROR']};
ACTION_SPECS.adminOrdersUpdateStatus={schema:Joi.any().optional(),notes:'phase5',errorCodes:['VALIDATION_ERROR']};
ACTION_SPECS.adminOrdersSetTracking={schema:Joi.any().optional(),notes:'phase5',errorCodes:['VALIDATION_ERROR']};
ACTION_SPECS.adminOrdersAddInternalNote={schema:Joi.any().optional(),notes:'phase5',errorCodes:['VALIDATION_ERROR']};
ACTION_SPECS.adminOrdersInvoiceUrl={schema:Joi.any().optional(),notes:'phase5',errorCodes:['VALIDATION_ERROR']};
ACTION_SPECS.adminOrdersTrackingGet={schema:Joi.any().optional(),notes:'phase5',errorCodes:['VALIDATION_ERROR']};
ACTION_SPECS.adminOrdersTrackingAddEvent={schema:Joi.any().optional(),notes:'phase5',errorCodes:['VALIDATION_ERROR']};
ACTION_SPECS.adminOrdersTrackingDeleteEvent={schema:Joi.any().optional(),notes:'phase5',errorCodes:['VALIDATION_ERROR']};
ACTION_SPECS.adminOrdersTrackingUpdateShipment={schema:Joi.any().optional(),notes:'phase5',errorCodes:['VALIDATION_ERROR']};
ACTION_SPECS.adminInsuranceList={schema:Joi.any().optional(),notes:'phase5',errorCodes:['VALIDATION_ERROR']};
ACTION_SPECS.adminInsuranceGet={schema:Joi.any().optional(),notes:'phase5',errorCodes:['VALIDATION_ERROR']};
ACTION_SPECS.adminInsuranceAddItem={schema:Joi.any().optional(),notes:'phase5',errorCodes:['VALIDATION_ERROR']};
ACTION_SPECS.adminInsuranceUpdateItem={schema:Joi.any().optional(),notes:'phase5',errorCodes:['VALIDATION_ERROR']};
ACTION_SPECS.adminInsuranceRemoveItem={schema:Joi.any().optional(),notes:'phase5',errorCodes:['VALIDATION_ERROR']};
ACTION_SPECS.adminInsuranceLockQuote={schema:Joi.any().optional(),notes:'phase5',errorCodes:['VALIDATION_ERROR']};
ACTION_SPECS.adminInsuranceSendQuote={schema:Joi.any().optional(),notes:'phase5',errorCodes:['VALIDATION_ERROR']};
ACTION_SPECS.adminInsuranceSetShipmentTracking={schema:Joi.any().optional(),notes:'phase5',errorCodes:['VALIDATION_ERROR']};
ACTION_SPECS.adminRiskRulesGet={schema:Joi.any().optional(),notes:'phase5',errorCodes:['VALIDATION_ERROR']};
ACTION_SPECS.adminRiskRulesUpdate={schema:Joi.any().optional(),notes:'phase5',errorCodes:['VALIDATION_ERROR']};
ACTION_SPECS.adminRiskFlaggedOrdersList={schema:Joi.any().optional(),notes:'phase5',errorCodes:['VALIDATION_ERROR']};
ACTION_SPECS.adminRiskFlaggedOrdersResolve={schema:Joi.any().optional(),notes:'phase5',errorCodes:['VALIDATION_ERROR']};
ACTION_SPECS.adminBranchesList={schema:Joi.any().optional(),notes:'phase5',errorCodes:['VALIDATION_ERROR']};
ACTION_SPECS.adminBranchesCreate={schema:Joi.any().optional(),notes:'phase5',errorCodes:['VALIDATION_ERROR']};
ACTION_SPECS.adminBranchesUpdate={schema:Joi.any().optional(),notes:'phase5',errorCodes:['VALIDATION_ERROR']};
ACTION_SPECS.adminBranchesDisable={schema:Joi.any().optional(),notes:'phase5',errorCodes:['VALIDATION_ERROR']};
ACTION_SPECS.adminDevicesList={schema:Joi.any().optional(),notes:'phase5',errorCodes:['VALIDATION_ERROR']};
ACTION_SPECS.adminDevicesCreate={schema:Joi.any().optional(),notes:'phase5',errorCodes:['VALIDATION_ERROR']};
ACTION_SPECS.adminDevicesUpdate={schema:Joi.any().optional(),notes:'phase5',errorCodes:['VALIDATION_ERROR']};
ACTION_SPECS.adminDevicesDisable={schema:Joi.any().optional(),notes:'phase5',errorCodes:['VALIDATION_ERROR']};
ACTION_SPECS.adminEmployeesList={schema:Joi.any().optional(),notes:'phase5',errorCodes:['VALIDATION_ERROR']};
ACTION_SPECS.adminEmployeesCreate={schema:Joi.any().optional(),notes:'phase5',errorCodes:['VALIDATION_ERROR']};
ACTION_SPECS.adminEmployeesUpdate={schema:Joi.any().optional(),notes:'phase5',errorCodes:['VALIDATION_ERROR']};
ACTION_SPECS.adminEmployeesDisable={schema:Joi.any().optional(),notes:'phase5',errorCodes:['VALIDATION_ERROR']};
ACTION_SPECS.adminDrawersList={schema:Joi.any().optional(),notes:'phase5',errorCodes:['VALIDATION_ERROR']};
ACTION_SPECS.adminDrawersCreate={schema:Joi.any().optional(),notes:'phase5',errorCodes:['VALIDATION_ERROR']};
ACTION_SPECS.adminDrawersUpdate={schema:Joi.any().optional(),notes:'phase5',errorCodes:['VALIDATION_ERROR']};
ACTION_SPECS.adminDrawersDisable={schema:Joi.any().optional(),notes:'phase5',errorCodes:['VALIDATION_ERROR']};
ACTION_SPECS.adminDrawerSessionsOpen={schema:Joi.any().optional(),notes:'phase5',errorCodes:['VALIDATION_ERROR']};
ACTION_SPECS.adminDrawerSessionsClose={schema:Joi.any().optional(),notes:'phase5',errorCodes:['VALIDATION_ERROR']};
ACTION_SPECS.adminAccountingKpis={schema:Joi.any().optional(),notes:'phase5',errorCodes:['VALIDATION_ERROR']};
ACTION_SPECS.adminAccountingLedger={schema:Joi.any().optional(),notes:'phase5',errorCodes:['VALIDATION_ERROR']};
ACTION_SPECS.adminAccountingCreateExpense={schema:Joi.any().optional(),notes:'phase5',errorCodes:['VALIDATION_ERROR']};
ACTION_SPECS.adminAccountingCreateAdjustment={schema:Joi.any().optional(),notes:'phase5',errorCodes:['VALIDATION_ERROR']};
ACTION_SPECS.adminAccountingCreatePOSSale={schema:Joi.any().optional(),notes:'phase5',errorCodes:['VALIDATION_ERROR']};
ACTION_SPECS.reportsOverview={schema:Joi.any().optional(),notes:'phase5',errorCodes:['VALIDATION_ERROR']};
ACTION_SPECS.reportsTopProducts={schema:Joi.any().optional(),notes:'phase5',errorCodes:['VALIDATION_ERROR']};
ACTION_SPECS.reportsOrdersByStatus={schema:Joi.any().optional(),notes:'phase5',errorCodes:['VALIDATION_ERROR']};
ACTION_SPECS.reportsInventorySummary={schema:Joi.any().optional(),notes:'phase5',errorCodes:['VALIDATION_ERROR']};
ACTION_SPECS.reportsCustomersSummary={schema:Joi.any().optional(),notes:'phase5',errorCodes:['VALIDATION_ERROR']};
ACTION_SPECS.reportsReturnsSummary={schema:Joi.any().optional(),notes:'phase5',errorCodes:['VALIDATION_ERROR']};
ACTION_SPECS.reportsLoyaltySummary={schema:Joi.any().optional(),notes:'phase5',errorCodes:['VALIDATION_ERROR']};
ACTION_SPECS.reportsCashbackSummary={schema:Joi.any().optional(),notes:'phase5',errorCodes:['VALIDATION_ERROR']};
ACTION_SPECS.adminReturnsList={schema:Joi.any().optional(),notes:'phase5',errorCodes:['VALIDATION_ERROR']};
ACTION_SPECS.adminReturnsGet={schema:Joi.any().optional(),notes:'phase5',errorCodes:['VALIDATION_ERROR']};
ACTION_SPECS.adminReturnsApprove={schema:Joi.any().optional(),notes:'phase5',errorCodes:['VALIDATION_ERROR']};
ACTION_SPECS.adminReturnsReject={schema:Joi.any().optional(),notes:'phase5',errorCodes:['VALIDATION_ERROR']};
ACTION_SPECS.adminReturnsRefundPartial={schema:Joi.any().optional(),notes:'phase5',errorCodes:['VALIDATION_ERROR']};
ACTION_SPECS.adminReturnsRefundFull={schema:Joi.any().optional(),notes:'phase5',errorCodes:['VALIDATION_ERROR']};
ACTION_SPECS.adminReturnsUpdateStatus={schema:Joi.any().optional(),notes:'phase5',errorCodes:['VALIDATION_ERROR']};
ACTION_SPECS.paymentsStatus={schema:Joi.object({orderId:Joi.string().required()}).required(),notes:'phase5',errorCodes:['VALIDATION_ERROR']};
ACTION_SPECS.paymentsConfirm={schema:Joi.object({providerSessionId:Joi.string().required()}).required(),notes:'phase5',errorCodes:['VALIDATION_ERROR']};
ACTION_SPECS.ordersGet={schema:Joi.object({orderId:Joi.string().required()}).required(),notes:'phase5',errorCodes:['VALIDATION_ERROR']};

ACTION_SPECS.publicDevSeedDummyData = {
  schema: Joi.object({
    seedKey: Joi.string().required(),
    mode: Joi.string().valid('reset', 'upsert').optional(),
    scenario: Joi.string().valid('baseline', 'full').optional(),
    storeCode: Joi.string().valid('ecom', 'resto', 'pharma').optional(),
    sizes: Joi.object({
      stores: Joi.number().integer().min(1).max(3).optional(),
      branchesPerStore: Joi.number().integer().min(1).max(5).optional(),
      categories: Joi.number().integer().min(1).max(50).optional(),
      productsPerStore: Joi.number().integer().min(1).max(300).optional(),
      customers: Joi.number().integer().min(5).max(120).optional(),
      ordersPerStore: Joi.number().integer().min(5).max(300).optional(),
      insuranceOrdersPerStore: Joi.number().integer().min(1).max(100).optional(),
      products: Joi.number().integer().min(1).max(1000).optional(),
      variantsPerProduct: Joi.number().integer().min(1).max(20).optional(),
      orders: Joi.number().integer().min(1).max(1000).optional(),
      insuranceOrders: Joi.number().integer().min(1).max(300).optional(),
    }).optional(),
  }).required(),
  notes: 'Dev-only scenario-based seed action for local/staging',
  errorCodes: ['VALIDATION_ERROR', 'DEV_ONLY', 'SEED_KEY_INVALID', 'SEED_RATE_LIMIT', 'SEED_FAILED'],
};

const insuranceStoreScoped = Joi.object({ storeId: Joi.string().required() }).required();
ACTION_SPECS.adminInsuranceList = { schema: insuranceStoreScoped, notes: 'insurance list', errorCodes: ['VALIDATION_FAILED', 'STORE_ACCESS_REQUIRED'] };
ACTION_SPECS.adminInsuranceGet = { schema: insuranceStoreScoped.keys({ insuranceOrderId: Joi.string().required() }), notes: 'insurance get', errorCodes: ['VALIDATION_FAILED', 'NOT_FOUND'] };
ACTION_SPECS.adminInsuranceAddItem = { schema: insuranceStoreScoped.keys({ insuranceOrderId: Joi.string().required(), name: Joi.string().max(180).required(), qty: Joi.number().integer().min(1).required(), clientContributionCents: Joi.number().integer().min(0).required(), companyContributionCents: Joi.number().integer().min(0).required() }), notes: 'insurance add item', errorCodes: ['VALIDATION_FAILED'] };
ACTION_SPECS.adminInsuranceUpdateItem = { schema: insuranceStoreScoped.keys({ insuranceOrderId: Joi.string().required(), itemId: Joi.string().required(), name: Joi.string().max(180).optional(), qty: Joi.number().integer().min(1).optional(), clientContributionCents: Joi.number().integer().min(0).optional(), companyContributionCents: Joi.number().integer().min(0).optional() }), notes: 'insurance update item', errorCodes: ['VALIDATION_FAILED'] };
ACTION_SPECS.adminInsuranceRemoveItem = { schema: insuranceStoreScoped.keys({ insuranceOrderId: Joi.string().required(), itemId: Joi.string().required() }), notes: 'insurance remove item', errorCodes: ['VALIDATION_FAILED'] };
ACTION_SPECS.adminInsuranceLockQuote = { schema: insuranceStoreScoped.keys({ insuranceOrderId: Joi.string().required(), note: Joi.string().max(500).allow(null, '') }), notes: 'insurance lock quote', errorCodes: ['VALIDATION_FAILED'] };
ACTION_SPECS.adminInsuranceSendQuote = { schema: insuranceStoreScoped.keys({ insuranceOrderId: Joi.string().required(), note: Joi.string().max(500).allow(null, '') }), notes: 'insurance send quote', errorCodes: ['VALIDATION_FAILED'] };
ACTION_SPECS.adminInsuranceSetShipmentTracking = { schema: insuranceStoreScoped.keys({ insuranceOrderId: Joi.string().required(), carrier: Joi.string().max(120).required(), trackingNumber: Joi.string().max(120).required(), status: Joi.string().max(24).optional(), note: Joi.string().max(500).allow(null, '') }), notes: 'insurance shipment tracking', errorCodes: ['VALIDATION_FAILED'] };

ACTION_SPECS.adminInventoryImportCreateBatch = { schema: Joi.object({ storeId: Joi.string().required(), fileMediaAssetId: Joi.string().required(), fileType: Joi.string().valid('excel', 'pdf').required() }).required(), notes: 'Create inventory import batch', errorCodes: ['VALIDATION_FAILED', 'NOT_FOUND', 'IMPORT_ALREADY_APPLIED'] };
ACTION_SPECS.adminInventoryImportPreview = { schema: Joi.object({ storeId: Joi.string().required(), batchId: Joi.number().integer().positive().required(), maxRows: Joi.number().integer().min(1).max(500).optional() }).required(), notes: 'Preview import batch', errorCodes: ['VALIDATION_FAILED', 'NOT_FOUND'] };
ACTION_SPECS.adminInventoryImportGetUnmappedPrefixes = { schema: Joi.object({ storeId: Joi.string().required(), batchId: Joi.number().integer().positive().required() }).required(), notes: 'Get unmapped prefixes', errorCodes: ['VALIDATION_FAILED', 'NOT_FOUND'] };
ACTION_SPECS.adminInventoryImportResolvePrefixes = { schema: Joi.object({ storeId: Joi.string().required(), batchId: Joi.number().integer().positive().required(), resolutions: Joi.any().required() }).required(), notes: 'Resolve prefixes', errorCodes: ['VALIDATION_FAILED', 'NOT_FOUND'] };
ACTION_SPECS.adminInventoryImportApply = { schema: Joi.object({ storeId: Joi.string().required(), batchId: Joi.number().integer().positive().required() }).required(), notes: 'Apply import batch', errorCodes: ['VALIDATION_FAILED', 'IMPORT_NEEDS_MAPPING', 'IMPORT_ALREADY_APPLIED'] };
ACTION_SPECS.adminInventoryImportGet = { schema: Joi.object({ storeId: Joi.string().required(), batchId: Joi.number().integer().positive().required() }).required(), notes: 'Get import batch', errorCodes: ['VALIDATION_FAILED', 'NOT_FOUND'] };

const baseReportPayload = Joi.object({
  storeId: Joi.string().required(),
  range: Joi.object({ from: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}T/).required(), to: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}T/).required() }).required(),
  filters: Joi.object().required(),
  sort: Joi.object({ by: Joi.string().required(), dir: Joi.string().valid('asc', 'desc').required() }).required(),
  page: Joi.number().integer().min(1),
  pageSize: Joi.number().integer().min(1).max(1000),
  fetchAll: Joi.boolean().required(),
  groupBy: Joi.any().allow(null),
  columns: Joi.any().allow(null),
  includeGroupItems: Joi.boolean().optional(),
}).required();

const reportFiltersNone = Joi.object().max(0).required();
ACTION_SPECS.reportsOverview = { schema: baseReportPayload.keys({ filters: reportFiltersNone, sort: requiredInStrictProd(Joi.object({ by: Joi.string().valid('date', 'netRevenueCents', 'ordersCount').required(), dir: Joi.string().valid('asc', 'desc').required() })), groupBy: Joi.any().allow(null), columns: Joi.any().allow(null) }), notes: 'reports overview', errorCodes: ['VALIDATION_FAILED', 'FETCH_ALL_LIMIT_EXCEEDED'] };
ACTION_SPECS.reportsOrdersByStatus = { schema: baseReportPayload.keys({ filters: reportFiltersNone, flags: Joi.object({ includeAging: Joi.boolean().optional() }).optional(), sort: requiredInStrictProd(Joi.object({ by: Joi.string().valid('ordersCount', 'netRevenueCents', 'status').required(), dir: Joi.string().valid('asc', 'desc').required() })), groupBy: Joi.any().allow(null), columns: Joi.any().allow(null) }), notes: 'reports by status', errorCodes: ['VALIDATION_FAILED', 'FETCH_ALL_LIMIT_EXCEEDED'] };
ACTION_SPECS.reportsTopProducts = { schema: baseReportPayload.keys({ filters: reportFiltersNone, sort: requiredInStrictProd(Joi.object({ by: Joi.string().valid('qtySold', 'netRevenueCents').required(), dir: Joi.string().valid('asc', 'desc').required() })), groupBy: Joi.any().allow(null), columns: Joi.any().allow(null) }), notes: 'reports top products', errorCodes: ['VALIDATION_FAILED', 'FETCH_ALL_LIMIT_EXCEEDED'] };
ACTION_SPECS.reportsInventorySummary = { schema: baseReportPayload.keys({ filters: Joi.object({ lowStockOnly: Joi.boolean().optional(), deadStockDays: Joi.number().integer().min(1).max(3650).optional(), categoryId: Joi.string().optional() }).optional(), sort: requiredInStrictProd(Joi.object({ by: Joi.string().valid('onHandQty', 'availableQty', 'name').required(), dir: Joi.string().valid('asc', 'desc').required() })), groupBy: Joi.any().allow(null), columns: Joi.any().allow(null) }), notes: 'reports inventory', errorCodes: ['VALIDATION_FAILED', 'FETCH_ALL_LIMIT_EXCEEDED'] };
ACTION_SPECS.reportsCustomersSummary = { schema: baseReportPayload.keys({ filters: reportFiltersNone, sort: requiredInStrictProd(Joi.object({ by: Joi.string().valid('netRevenueCents', 'ordersCount', 'lastOrderAt').required(), dir: Joi.string().valid('asc', 'desc').required() })), groupBy: Joi.any().allow(null), columns: Joi.any().allow(null) }), notes: 'reports customers', errorCodes: ['VALIDATION_FAILED', 'FETCH_ALL_LIMIT_EXCEEDED'] };
ACTION_SPECS.reportsReturnsSummary = { schema: baseReportPayload.keys({ filters: reportFiltersNone, sort: requiredInStrictProd(Joi.object({ by: Joi.string().valid('returnsCount', 'refundCents').required(), dir: Joi.string().valid('asc', 'desc').required() })), groupBy: Joi.any().allow(null), columns: Joi.any().allow(null) }), notes: 'reports returns', errorCodes: ['VALIDATION_FAILED', 'FETCH_ALL_LIMIT_EXCEEDED'] };
ACTION_SPECS.reportsLoyaltySummary = { schema: baseReportPayload.keys({ filters: reportFiltersNone, sort: requiredInStrictProd(Joi.object({ by: Joi.string().valid('day').required(), dir: Joi.string().valid('asc', 'desc').required() })), groupBy: Joi.any().allow(null), columns: Joi.any().allow(null) }), notes: 'reports loyalty', errorCodes: ['VALIDATION_FAILED', 'FETCH_ALL_LIMIT_EXCEEDED'] };
ACTION_SPECS.reportsCashbackSummary = { schema: baseReportPayload.keys({ filters: reportFiltersNone, sort: requiredInStrictProd(Joi.object({ by: Joi.string().valid('day').required(), dir: Joi.string().valid('asc', 'desc').required() })), groupBy: Joi.any().allow(null), columns: Joi.any().allow(null) }), notes: 'reports cashback', errorCodes: ['VALIDATION_FAILED', 'FETCH_ALL_LIMIT_EXCEEDED'] };

const marketingReportPayload = Joi.object({
  storeId: Joi.string().required(),
  range: Joi.object({ from: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}T/).required(), to: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}T/).required() }).required(),
  filters: Joi.object({
    channel: Joi.string().valid('app', 'web', 'branch', 'POS').optional(),
    source: Joi.string().max(120).optional(),
    medium: Joi.string().max(120).optional(),
    campaign: Joi.string().max(120).optional(),
    term: Joi.string().max(120).optional(),
    content: Joi.string().max(120).optional(),
    platform: Joi.string().valid('facebook', 'instagram', 'whatsapp', 'google', 'other').optional(),
    branchId: Joi.string().max(64).optional(),
    deviceId: Joi.string().max(64).optional(),
  }).required(),
  sort: Joi.object({ by: Joi.string().required(), dir: Joi.string().valid('asc', 'desc').required() }).required(),
  page: Joi.number().integer().min(1),
  pageSize: Joi.number().integer().min(1).max(1000),
  fetchAll: Joi.boolean().required(),
  groupBy: Joi.any().allow(null),
  columns: Joi.any().allow(null),
  flags: Joi.object({ includeRoas: Joi.boolean().optional(), includeMargin: Joi.boolean().optional() }).optional(),
}).required();

ACTION_SPECS.adminReportsAttributionOverview = {
  schema: marketingReportPayload.keys({
    sort: Joi.object({ by: Joi.string().valid('ordersCount', 'revenueCents', 'avgOrderValueCents', 'key').required(), dir: Joi.string().valid('asc', 'desc').required() }).required(),
    groupBy: Joi.any().allow(null),
    columns: Joi.any().allow(null),
  }),
  notes: 'marketing attribution overview',
  errorCodes: ['VALIDATION_FAILED', 'FETCH_ALL_LIMIT_EXCEEDED'],
};

ACTION_SPECS.adminReportsTopCampaigns = {
  schema: marketingReportPayload.keys({
    sort: Joi.object({ by: Joi.string().valid('ordersCount', 'revenueCents', 'campaign').required(), dir: Joi.string().valid('asc', 'desc').required() }).required(),
    groupBy: Joi.any().allow(null),
    columns: Joi.any().allow(null),
  }),
  notes: 'marketing top campaigns',
  errorCodes: ['VALIDATION_FAILED', 'FETCH_ALL_LIMIT_EXCEEDED'],
};

const accountingBasePayload = Joi.object({
  storeId: Joi.string().required(),
  range: Joi.object({ from: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}T/).required(), to: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}T/).required() }).required(),
  filters: Joi.object().required(),
  sort: Joi.object({ by: Joi.string().required(), dir: Joi.string().valid('asc', 'desc').required() }).required(),
  page: Joi.number().integer().min(1),
  pageSize: Joi.number().integer().min(1).max(1000),
  fetchAll: Joi.boolean().required(),
  groupBy: Joi.any().allow(null),
  columns: Joi.any().allow(null),
  flags: Joi.object().optional(),
}).required();

ACTION_SPECS.adminAccountingKpis = {
  schema: accountingBasePayload.keys({
    filters: Joi.object().max(0).required(),
    sort: Joi.object({ by: Joi.string().valid('day').required(), dir: Joi.string().valid('asc', 'desc').required() }).required(),
    groupBy: Joi.any().allow(null),
    columns: Joi.any().allow(null),
  }),
  notes: 'accounting kpis with unified table query',
  errorCodes: ['VALIDATION_FAILED', 'FETCH_ALL_LIMIT_EXCEEDED'],
};

ACTION_SPECS.adminAccountingLedger = {
  schema: accountingBasePayload.keys({
    filters: Joi.object({
      channel: Joi.string().max(24).optional(),
      branchId: Joi.string().max(36).optional(),
      deviceId: Joi.string().max(36).optional(),
      employeeId: Joi.string().max(36).optional(),
      type: Joi.string().max(40).optional(),
      referenceId: Joi.string().max(64).optional(),
    }).required(),
    sort: Joi.object({ by: Joi.string().valid('createdAt', 'debitCents', 'creditCents', 'netCents', 'type', 'channel').required(), dir: Joi.string().valid('asc', 'desc').required() }).required(),
    groupBy: Joi.any().allow(null),
    columns: Joi.any().allow(null),
  }),
  notes: 'accounting ledger with unified table query',
  errorCodes: ['VALIDATION_FAILED', 'FETCH_ALL_LIMIT_EXCEEDED'],
};

ACTION_SPECS.reportsOverview = ACTION_SPECS.reportsOverview;
ACTION_SPECS.reportsInventorySummary = ACTION_SPECS.reportsInventorySummary;
ACTION_SPECS.reportsCustomersSummary = ACTION_SPECS.reportsCustomersSummary;
ACTION_SPECS.reportsReturnsSummary = ACTION_SPECS.reportsReturnsSummary;

ACTION_SPECS.reportsOverview = ACTION_SPECS.reportsOverview && {
  ...ACTION_SPECS.reportsOverview,
  schema: baseReportPayload.keys({
    filters: Joi.object().max(0).required(),
    sort: Joi.object({ by: Joi.string().valid('date', 'netRevenueCents', 'ordersCount').required(), dir: Joi.string().valid('asc', 'desc').required() }).required(),
    flags: Joi.object({ includeProfessional: Joi.boolean().optional() }).optional(),
  }),
};

ACTION_SPECS.reportsInventorySummary = ACTION_SPECS.reportsInventorySummary && {
  ...ACTION_SPECS.reportsInventorySummary,
  schema: baseReportPayload.keys({
    filters: Joi.object({ lowStockOnly: Joi.boolean().optional(), deadStockDays: Joi.number().integer().min(1).max(3650).optional(), categoryId: Joi.string().optional() }).optional(),
    sort: Joi.object({ by: Joi.string().valid('onHandQty', 'availableQty', 'name').required(), dir: Joi.string().valid('asc', 'desc').required() }).required(),
    flags: Joi.object({ includeValuation: Joi.boolean().optional(), includeMovements: Joi.boolean().optional() }).optional(),
  }),
};

ACTION_SPECS.reportsCustomersSummary = ACTION_SPECS.reportsCustomersSummary && {
  ...ACTION_SPECS.reportsCustomersSummary,
  schema: baseReportPayload.keys({
    filters: Joi.object().max(0).required(),
    sort: Joi.object({ by: Joi.string().valid('netRevenueCents', 'ordersCount', 'lastOrderAt').required(), dir: Joi.string().valid('asc', 'desc').required() }).required(),
    flags: Joi.object({ includeCohorts: Joi.boolean().optional(), includeLtv: Joi.boolean().optional() }).optional(),
  }),
};

ACTION_SPECS.reportsReturnsSummary = ACTION_SPECS.reportsReturnsSummary && {
  ...ACTION_SPECS.reportsReturnsSummary,
  schema: baseReportPayload.keys({
    filters: Joi.object().max(0).required(),
    sort: Joi.object({ by: Joi.string().valid('returnsCount', 'refundCents').required(), dir: Joi.string().valid('asc', 'desc').required() }).required(),
    flags: Joi.object({ includeRefundCosts: Joi.boolean().optional() }).optional(),
  }),
};

const allowedStringArray = (_allowed: string[]) => Joi.array().items(Joi.string()).optional();
const reportPayloadBaseStrict = Joi.object({
  storeId: Joi.string().required(),
  range: requiredInStrictProd(Joi.object({ from: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}T/).optional(), to: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}T/).optional() })),
  from: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}T/).optional(),
  to: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}T/).optional(),
  filters: Joi.object().optional(),
  sort: requiredInStrictProd(Joi.object({ by: Joi.string().required(), dir: Joi.string().valid('asc', 'desc').optional() })),
  page: Joi.number().integer().min(1).optional(),
  pageSize: Joi.number().integer().min(1).max(1000).optional(),
  fetchAll: Joi.boolean().optional(),
  groupBy: Joi.array().items(Joi.string()).optional(),
  columns: Joi.array().items(Joi.string()).optional(),
  flags: Joi.object().optional(),
}).required();

ACTION_SPECS.reportsOverview = { schema: reportPayloadBaseStrict.keys({ filters: Joi.object().max(0).optional(), sort: requiredInStrictProd(Joi.object({ by: Joi.string().valid('date', 'netRevenueCents', 'ordersCount').required(), dir: Joi.string().valid('asc', 'desc').required() })), groupBy: allowedStringArray(['day', 'channel', 'status']), columns: allowedStringArray(['date', 'ordersCount', 'netRevenueCents']), flags: Joi.object({ includeProfessional: Joi.boolean().optional() }).optional() }), notes: 'reports overview strict', errorCodes: ['VALIDATION_FAILED', 'FETCH_ALL_LIMIT_EXCEEDED'] };
ACTION_SPECS.reportsOrdersByStatus = { schema: reportPayloadBaseStrict.keys({ filters: Joi.object().max(0).optional(), sort: requiredInStrictProd(Joi.object({ by: Joi.string().valid('ordersCount', 'netRevenueCents', 'status').required(), dir: Joi.string().valid('asc', 'desc').required() })), groupBy: allowedStringArray(['status', 'day', 'channel', 'branchId']), columns: allowedStringArray(['status', 'ordersCount', 'grossRevenueCents', 'netRevenueCents', 'avgOrderValueCents']), flags: Joi.object({ includeAging: Joi.boolean().optional() }).optional() }), notes: 'reports orders by status strict', errorCodes: ['VALIDATION_FAILED', 'FETCH_ALL_LIMIT_EXCEEDED'] };
ACTION_SPECS.reportsTopProducts = { schema: reportPayloadBaseStrict.keys({ filters: Joi.object().max(0).optional(), sort: requiredInStrictProd(Joi.object({ by: Joi.string().valid('qtySold', 'netRevenueCents').required(), dir: Joi.string().valid('asc', 'desc').required() })), groupBy: allowedStringArray(['categoryId', 'brand']), columns: allowedStringArray(['productId', 'name', 'sku', 'qtySold', 'grossRevenueCents', 'netRevenueCents']) }), notes: 'reports top products strict', errorCodes: ['VALIDATION_FAILED', 'FETCH_ALL_LIMIT_EXCEEDED'] };
ACTION_SPECS.reportsInventorySummary = { schema: reportPayloadBaseStrict.keys({ filters: Joi.object({ lowStockOnly: Joi.boolean().optional(), deadStockDays: Joi.number().integer().min(1).max(3650).optional(), categoryId: Joi.string().optional() }).optional(), sort: requiredInStrictProd(Joi.object({ by: Joi.string().valid('onHandQty', 'availableQty', 'name').required(), dir: Joi.string().valid('asc', 'desc').required() })), groupBy: allowedStringArray(['categoryId', 'lowStock']), columns: allowedStringArray(['productId', 'name', 'onHandQty', 'reservedQty', 'availableQty', 'lowStock', 'lastMovementAt']), flags: Joi.object({ includeValuation: Joi.boolean().optional(), includeMovements: Joi.boolean().optional() }).optional() }), notes: 'reports inventory strict', errorCodes: ['VALIDATION_FAILED', 'FETCH_ALL_LIMIT_EXCEEDED'] };
ACTION_SPECS.reportsCustomersSummary = { schema: reportPayloadBaseStrict.keys({ filters: Joi.object().max(0).optional(), sort: requiredInStrictProd(Joi.object({ by: Joi.string().valid('netRevenueCents', 'ordersCount', 'lastOrderAt').required(), dir: Joi.string().valid('asc', 'desc').required() })), groupBy: allowedStringArray(['newVsReturning', 'month']), columns: allowedStringArray(['customerId', 'name', 'ordersCount', 'netRevenueCents', 'lastOrderAt']), flags: Joi.object({ includeCohorts: Joi.boolean().optional(), includeLtv: Joi.boolean().optional() }).optional() }), notes: 'reports customers strict', errorCodes: ['VALIDATION_FAILED', 'FETCH_ALL_LIMIT_EXCEEDED'] };
ACTION_SPECS.reportsReturnsSummary = { schema: reportPayloadBaseStrict.keys({ filters: Joi.object().max(0).optional(), sort: requiredInStrictProd(Joi.object({ by: Joi.string().valid('returnsCount', 'refundCents').required(), dir: Joi.string().valid('asc', 'desc').required() })), groupBy: allowedStringArray(['reason', 'day']), columns: allowedStringArray(['reason', 'returnsCount', 'refundCents', 'topProducts']), flags: Joi.object({ includeRefundCosts: Joi.boolean().optional() }).optional() }), notes: 'reports returns strict', errorCodes: ['VALIDATION_FAILED', 'FETCH_ALL_LIMIT_EXCEEDED'] };
ACTION_SPECS.reportsLoyaltySummary = { schema: reportPayloadBaseStrict.keys({ filters: Joi.object().max(0).optional(), sort: requiredInStrictProd(Joi.object({ by: Joi.string().valid('day').required(), dir: Joi.string().valid('asc', 'desc').required() })), groupBy: allowedStringArray(['tier', 'day']), columns: allowedStringArray(['tier', 'day', 'pointsDelta']) }), notes: 'reports loyalty strict', errorCodes: ['VALIDATION_FAILED', 'FETCH_ALL_LIMIT_EXCEEDED'] };
ACTION_SPECS.reportsCashbackSummary = { schema: reportPayloadBaseStrict.keys({ filters: Joi.object().max(0).optional(), sort: requiredInStrictProd(Joi.object({ by: Joi.string().valid('day').required(), dir: Joi.string().valid('asc', 'desc').required() })), groupBy: allowedStringArray(['day', 'campaignId']), columns: allowedStringArray(['day', 'campaignId', 'cashbackIssuedCents', 'cashbackRedeemedCents']) }), notes: 'reports cashback strict', errorCodes: ['VALIDATION_FAILED', 'FETCH_ALL_LIMIT_EXCEEDED'] };

ACTION_SPECS.adminReportsAttributionOverview = { schema: reportPayloadBaseStrict.keys({ filters: Joi.object({ channel: Joi.string().valid('app', 'web', 'branch', 'POS').optional(), source: Joi.string().max(120).optional(), medium: Joi.string().max(120).optional(), campaign: Joi.string().max(120).optional(), term: Joi.string().max(120).optional(), content: Joi.string().max(120).optional(), platform: Joi.string().valid('facebook', 'instagram', 'whatsapp', 'google', 'other').optional(), branchId: Joi.string().max(64).optional(), deviceId: Joi.string().max(64).optional() }).optional(), sort: requiredInStrictProd(Joi.object({ by: Joi.string().valid('ordersCount', 'revenueCents', 'avgOrderValueCents', 'key').required(), dir: Joi.string().valid('asc', 'desc').required() })), groupBy: allowedStringArray(['day', 'week', 'month', 'channel', 'source', 'medium', 'campaign']), columns: allowedStringArray(['key', 'ordersCount', 'revenueCents', 'avgOrderValueCents']), flags: Joi.object({ includeRoas: Joi.boolean().optional(), includeMargin: Joi.boolean().optional() }).optional() }), notes: 'reports attribution strict', errorCodes: ['VALIDATION_FAILED', 'FETCH_ALL_LIMIT_EXCEEDED'] };
ACTION_SPECS.adminReportsTopCampaigns = { schema: reportPayloadBaseStrict.keys({ filters: Joi.object({ channel: Joi.string().valid('app', 'web', 'branch', 'POS').optional(), source: Joi.string().max(120).optional(), medium: Joi.string().max(120).optional(), campaign: Joi.string().max(120).optional(), term: Joi.string().max(120).optional(), content: Joi.string().max(120).optional(), platform: Joi.string().valid('facebook', 'instagram', 'whatsapp', 'google', 'other').optional(), branchId: Joi.string().max(64).optional(), deviceId: Joi.string().max(64).optional() }).optional(), sort: requiredInStrictProd(Joi.object({ by: Joi.string().valid('ordersCount', 'revenueCents', 'campaign').required(), dir: Joi.string().valid('asc', 'desc').required() })), groupBy: allowedStringArray(['day', 'week', 'month', 'channel', 'source', 'medium', 'campaign']), columns: allowedStringArray(['campaign', 'source', 'medium', 'ordersCount', 'revenueCents', 'roas', 'contributionCents']), flags: Joi.object({ includeRoas: Joi.boolean().optional(), includeMargin: Joi.boolean().optional() }).optional() }), notes: 'reports top campaigns strict', errorCodes: ['VALIDATION_FAILED', 'FETCH_ALL_LIMIT_EXCEEDED'] };

ACTION_SPECS.adminAccountingKpis = { schema: reportPayloadBaseStrict.keys({ filters: Joi.object().max(0).optional(), sort: requiredInStrictProd(Joi.object({ by: Joi.string().valid('day').required(), dir: Joi.string().valid('asc', 'desc').required() })), groupBy: allowedStringArray(['day', 'week', 'month', 'channel', 'branchId', 'employeeId', 'type']), columns: allowedStringArray(['groupKey', 'cashInCents', 'cashOutCents', 'netCashFlowCents']) }), notes: 'accounting kpis strict', errorCodes: ['VALIDATION_FAILED', 'FETCH_ALL_LIMIT_EXCEEDED'] };
ACTION_SPECS.adminAccountingLedger = { schema: reportPayloadBaseStrict.keys({ filters: Joi.object({ channel: Joi.string().max(24).optional(), branchId: Joi.string().max(36).optional(), deviceId: Joi.string().max(36).optional(), employeeId: Joi.string().max(36).optional(), type: Joi.string().max(40).optional(), referenceId: Joi.string().max(64).optional() }).optional(), sort: requiredInStrictProd(Joi.object({ by: Joi.string().valid('createdAt', 'debitCents', 'creditCents', 'netCents', 'type', 'channel').required(), dir: Joi.string().valid('asc', 'desc').required() })), groupBy: allowedStringArray(['day', 'week', 'month', 'channel', 'branchId', 'employeeId', 'type']), columns: allowedStringArray(['id', 'createdAt', 'type', 'referenceType', 'referenceId', 'debitCents', 'creditCents', 'netCents', 'channel', 'branchId', 'deviceId', 'employeeId', 'notes']) }), notes: 'accounting ledger strict', errorCodes: ['VALIDATION_FAILED', 'FETCH_ALL_LIMIT_EXCEEDED'] };




const listQueryPayload = Joi.object({
  storeId: Joi.string().optional(),
  filters: Joi.object().optional(),
  sort: Joi.object({ by: Joi.string().optional(), dir: Joi.string().valid('asc', 'desc').optional() }).optional(),
  page: Joi.number().integer().min(1).optional(),
  pageSize: Joi.number().integer().min(1).max(200).optional(),
  fetchAll: Joi.boolean().optional(),
  groupBy: Joi.array().items(Joi.string()).optional(),
  columns: Joi.array().items(Joi.string()).optional(),
  flags: Joi.object().optional(),
  query: Joi.string().allow('', null).optional(),
  limit: Joi.number().integer().min(1).max(200).optional(),
  offset: Joi.number().integer().min(0).optional(),
}).optional();

ACTION_SPECS.adminOrdersList = { schema: listQueryPayload, notes: 'admin orders list query', errorCodes: ['VALIDATION_ERROR'] };
ACTION_SPECS.adminInsuranceList = { schema: listQueryPayload, notes: 'admin insurance list query', errorCodes: ['VALIDATION_ERROR'] };
ACTION_SPECS.adminRiskFlaggedOrdersList = { schema: listQueryPayload, notes: 'admin risk list query', errorCodes: ['VALIDATION_ERROR'] };
ACTION_SPECS.adminReturnsList = { schema: listQueryPayload, notes: 'admin returns list query', errorCodes: ['VALIDATION_ERROR'] };
ACTION_SPECS.adminProductsList = { schema: listQueryPayload, notes: 'admin products list query', errorCodes: ['VALIDATION_ERROR'] };
ACTION_SPECS.adminCategoriesList = { schema: listQueryPayload, notes: 'admin categories list query', errorCodes: ['VALIDATION_ERROR'] };
ACTION_SPECS.adminBannersList = { schema: listQueryPayload, notes: 'admin banners list query', errorCodes: ['VALIDATION_ERROR'] };
ACTION_SPECS.adminLandingPagesList = { schema: listQueryPayload, notes: 'admin landing pages list query', errorCodes: ['VALIDATION_ERROR'] };
ACTION_SPECS.adminShippingMethodsList = { schema: listQueryPayload, notes: 'admin shipping methods list query', errorCodes: ['VALIDATION_ERROR'] };
ACTION_SPECS.adminDeliveryZonesList = { schema: listQueryPayload, notes: 'admin delivery zones list query', errorCodes: ['VALIDATION_ERROR'] };
ACTION_SPECS.adminCouponsList = { schema: listQueryPayload, notes: 'admin coupons list query', errorCodes: ['VALIDATION_ERROR'] };
ACTION_SPECS.adminDiscountsList = { schema: listQueryPayload, notes: 'admin discounts list query', errorCodes: ['VALIDATION_ERROR'] };
ACTION_SPECS.adminCashbackList = { schema: listQueryPayload, notes: 'admin cashback list query', errorCodes: ['VALIDATION_ERROR'] };
ACTION_SPECS.adminNotificationsList = { schema: listQueryPayload, notes: 'admin notifications list query', errorCodes: ['VALIDATION_ERROR'] };
ACTION_SPECS.adminLoyaltyTiersList = { schema: listQueryPayload, notes: 'admin loyalty tiers list query', errorCodes: ['VALIDATION_ERROR'] };
ACTION_SPECS.adminBranchesList = { schema: listQueryPayload, notes: 'admin branches list query', errorCodes: ['VALIDATION_ERROR'] };
ACTION_SPECS.adminDevicesList = { schema: listQueryPayload, notes: 'admin devices list query', errorCodes: ['VALIDATION_ERROR'] };
ACTION_SPECS.adminEmployeesList = { schema: listQueryPayload, notes: 'admin employees list query', errorCodes: ['VALIDATION_ERROR'] };
ACTION_SPECS.adminDrawersList = { schema: listQueryPayload, notes: 'admin drawers list query', errorCodes: ['VALIDATION_ERROR'] };
ACTION_SPECS.adminDineInTablesList = { schema: listQueryPayload.keys({ branchId: Joi.string().optional() }), notes: 'admin dine-in tables list query', errorCodes: ['VALIDATION_FAILED'] };
ACTION_SPECS.adminDineInSessionsList = { schema: listQueryPayload.keys({ branchId: Joi.string().optional(), status: Joi.string().optional() }), notes: 'admin dine-in sessions list query', errorCodes: ['VALIDATION_FAILED'] };
ACTION_SPECS.adminDineInWaiterCallsList = { schema: listQueryPayload.keys({ branchId: Joi.string().optional(), status: Joi.string().optional() }), notes: 'admin dine-in waiter calls list query', errorCodes: ['VALIDATION_FAILED'] };
ACTION_SPECS.ordersList = { schema: listQueryPayload, notes: 'orders list query', errorCodes: ['VALIDATION_ERROR'] };
ACTION_SPECS.notificationsList = { schema: listQueryPayload, notes: 'notifications list query', errorCodes: ['VALIDATION_ERROR'] };
ACTION_SPECS.supportListTickets = { schema: listQueryPayload, notes: 'support tickets list query', errorCodes: ['VALIDATION_ERROR'] };
ACTION_SPECS.insuranceListMyOrders = { schema: listQueryPayload, notes: 'insurance list query', errorCodes: ['VALIDATION_ERROR'] };
ACTION_SPECS.productFavoritesList = { schema: listQueryPayload, notes: 'product favorites list query', errorCodes: ['VALIDATION_ERROR'] };
ACTION_SPECS.storeFavoritesList = { schema: listQueryPayload, notes: 'store favorites list query', errorCodes: ['VALIDATION_ERROR'] };
ACTION_SPECS.publicCatalogListProducts = { schema: listQueryPayload.keys({ categoryId: Joi.string().optional() }), notes: 'public catalog list query', errorCodes: ['VALIDATION_ERROR'] };
ACTION_SPECS.publicCatalogSearchProducts = { schema: listQueryPayload, notes: 'public catalog search query', errorCodes: ['VALIDATION_ERROR'] };
ACTION_SPECS.publicCatalogGetFilters = { schema: listQueryPayload, notes: 'public catalog filters query', errorCodes: ['VALIDATION_ERROR'] };
ACTION_SPECS.dineInScanTableCode={schema:Joi.object({qrCode:Joi.string().required(),geo:Joi.object({lat:Joi.number().required(),lng:Joi.number().required()}).optional(),sourceMode:Joi.string().valid('localOnly','hybrid','cloudOnly').required()}).required(),notes:'dine in scan',errorCodes:['VALIDATION_FAILED']};
ACTION_SPECS.dineInGetSession={schema:Joi.object({sessionToken:Joi.string().required()}).required(),notes:'dine in session get',errorCodes:['VALIDATION_FAILED']};
ACTION_SPECS.dineInCloseSession={schema:Joi.object({sessionToken:Joi.string().required()}).required(),notes:'dine in session close',errorCodes:['VALIDATION_FAILED']};
ACTION_SPECS.dineInCallWaiter={schema:Joi.object({sessionToken:Joi.string().required(),callType:Joi.string().valid('callWaiter','requestBill','needHelp','cleanup').required(),note:Joi.string().max(1000).allow('',null),orderId:Joi.string().optional()}).required(),notes:'dine in waiter call',errorCodes:['VALIDATION_FAILED']};
ACTION_SPECS.dineInRequestBill={schema:Joi.object({sessionToken:Joi.string().required(),orderId:Joi.string().optional(),note:Joi.string().max(1000).allow('',null)}).required(),notes:'dine in request bill',errorCodes:['VALIDATION_FAILED']};

ACTION_SPECS.reviewsCanReview={schema:Joi.object({orderId:Joi.string().required()}).required(),notes:'review eligibility',errorCodes:['VALIDATION_FAILED','NOT_FOUND']};
ACTION_SPECS.reviewsCreate={schema:Joi.object({orderId:Joi.string().required(),rating:Joi.number().integer().min(1).max(5).required(),comment:Joi.string().max(2000).allow('',null)}).required(),notes:'create order review',errorCodes:['VALIDATION_FAILED','NOT_FOUND']};

ACTION_SPECS.checkoutCreatePaymentSession={schema:Joi.object({serviceType:Joi.string().valid('standard','delivery','pickup','dineIn').optional(),branchId:Joi.string().optional(),dineInSessionToken:Joi.string().optional()}).optional(),notes:'phase5',errorCodes:['VALIDATION_ERROR','DINE_IN_SESSION_REQUIRED']};

const clientFriendlyListQueryPayload = Joi.object({
  storeId: Joi.string().optional(),
  filters: Joi.object().optional(),
  sort: Joi.object({ by: Joi.string().optional(), dir: Joi.string().valid('asc', 'desc').optional() }).optional(),
  page: Joi.number().integer().min(1).optional(),
  pageSize: Joi.number().integer().min(1).max(200).optional(),
  fetchAll: Joi.boolean().optional(),
  groupBy: Joi.array().items(Joi.string()).optional(),
  columns: Joi.array().items(Joi.string()).allow(null).optional(),
  flags: Joi.object().optional(),
  query: Joi.string().allow('', null).optional(),
  q: Joi.string().allow('', null).optional(),
  search: Joi.string().allow('', null).optional(),
  limit: Joi.number().integer().min(1).max(200).optional(),
  offset: Joi.number().integer().min(0).optional(),
  from: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}T/).allow(null).optional(),
  to: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}T/).allow(null).optional(),
  range: Joi.object({ from: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}T/).allow(null), to: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}T/).allow(null) }).optional(),
}).optional();

ACTION_SPECS.homeGetLayout = {
  schema: Joi.object({ mode: Joi.string().valid('live', 'preview').optional() }).optional(),
  notes: 'home layout (client stabilized contract)',
  errorCodes: ['VALIDATION_FAILED'],
};

ACTION_SPECS.catalogListProducts = {
  schema: clientFriendlyListQueryPayload.keys({ categoryId: Joi.string().optional() }),
  notes: 'catalog list (client stabilized contract)',
  errorCodes: ['VALIDATION_FAILED'],
};

ACTION_SPECS.publicCatalogGetHome = {
  schema: clientFriendlyListQueryPayload,
  notes: 'public home catalog query (stabilized)',
  errorCodes: ['VALIDATION_FAILED'],
};

ACTION_SPECS.publicCatalogListProducts = {
  schema: clientFriendlyListQueryPayload.keys({ categoryId: Joi.string().optional() }),
  notes: 'public catalog list query (stabilized)',
  errorCodes: ['VALIDATION_FAILED'],
};

ACTION_SPECS.publicCatalogSearchProducts = {
  schema: clientFriendlyListQueryPayload,
  notes: 'public catalog search query (stabilized)',
  errorCodes: ['VALIDATION_FAILED'],
};

ACTION_SPECS.publicCatalogGetFilters = {
  schema: clientFriendlyListQueryPayload,
  notes: 'public catalog filters query (stabilized)',
  errorCodes: ['VALIDATION_FAILED'],
};

ACTION_SPECS.productFavoritesList = { schema: clientFriendlyListQueryPayload, notes: 'product favorites list query (stabilized)', errorCodes: ['VALIDATION_FAILED'] };
ACTION_SPECS.storeFavoritesList = { schema: clientFriendlyListQueryPayload, notes: 'store favorites list query (stabilized)', errorCodes: ['VALIDATION_FAILED'] };
ACTION_SPECS.supportListTickets = { schema: clientFriendlyListQueryPayload, notes: 'support tickets list query (stabilized)', errorCodes: ['VALIDATION_FAILED'] };
ACTION_SPECS.loyaltyListTransactions = { schema: clientFriendlyListQueryPayload, notes: 'loyalty transactions query (stabilized)', errorCodes: ['VALIDATION_FAILED'] };
ACTION_SPECS.walletHistory = { schema: clientFriendlyListQueryPayload, notes: 'wallet history query (stabilized)', errorCodes: ['VALIDATION_FAILED'] };

ACTION_SPECS.settingsUpdate = {
  schema: Joi.object({
    config: Joi.object().optional(),
    settings: Joi.object().optional(),
  }).required(),
  notes: 'settings update (backward-safe config/settings)',
  errorCodes: ['VALIDATION_FAILED'],
};

ACTION_SPECS.legalGetDocs = {
  schema: Joi.object({ docType: Joi.string().allow('', null).optional() }).optional(),
  notes: 'legal docs query (stabilized)',
  errorCodes: ['VALIDATION_FAILED'],
};
