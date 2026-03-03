import Joi from 'joi';
import { ACTION_SPECS } from './validate';

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

['publicCatalogGetHome','publicCatalogGetCategories','publicCatalogGetFilters','homeGetLayout','productFavoritesList','storeFavoritesList'].forEach((n)=>{ACTION_SPECS[n]={schema:Joi.any().optional(),notes:'No payload',errorCodes:['VALIDATION_ERROR']};});
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
ACTION_SPECS.adminHomeSectionsCreate={schema:Joi.object({storeId:Joi.string().required(),type:Joi.string().required(),config:Joi.any().optional(),sortOrder:Joi.number().integer().optional(),enabled:Joi.boolean().optional()}).required(),notes:'create section',errorCodes:['VALIDATION_ERROR']};
ACTION_SPECS.adminHomeSectionsUpdate={schema:Joi.object({id:Joi.string().required(),type:Joi.string().optional(),config:Joi.any().optional(),sortOrder:Joi.number().integer().optional(),enabled:Joi.boolean().optional()}).required(),notes:'update section',errorCodes:['VALIDATION_ERROR']};
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
    storeId: Joi.string().optional(),
    sizes: Joi.object({
      categories: Joi.number().integer().min(1).max(200).optional(),
      products: Joi.number().integer().min(1).max(1000).optional(),
      variantsPerProduct: Joi.number().integer().min(1).max(20).optional(),
      customers: Joi.number().integer().min(1).max(200).optional(),
      orders: Joi.number().integer().min(1).max(1000).optional(),
      insuranceOrders: Joi.number().integer().min(1).max(300).optional(),
    }).optional(),
  }).required(),
  notes: 'Dev-only seed action for local/staging',
  errorCodes: ['VALIDATION_ERROR', 'DEV_ONLY', 'SEED_KEY_INVALID', 'SEED_RATE_LIMIT', 'SEED_FAILED'],
};
