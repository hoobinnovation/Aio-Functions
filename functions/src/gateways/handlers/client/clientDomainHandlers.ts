import { ActionHandler } from '../../types';
import { genericActionHandler } from '../shared';
import { mediaActionHandlers } from '../../../modules/media/actions';

export const authEnsureUserProfile: ActionHandler = genericActionHandler('client', 'authEnsureUserProfile');
export const profileGet: ActionHandler = genericActionHandler('client', 'profileGet');
export const profileUpdate: ActionHandler = genericActionHandler('client', 'profileUpdate');
export const accountDeleteRequest: ActionHandler = genericActionHandler('client', 'accountDeleteRequest');
export const addressesList: ActionHandler = genericActionHandler('client', 'addressesList');
export const addressesCreate: ActionHandler = genericActionHandler('client', 'addressesCreate');
export const addressesUpdate: ActionHandler = genericActionHandler('client', 'addressesUpdate');
export const addressesDelete: ActionHandler = genericActionHandler('client', 'addressesDelete');
export const addressesSetDefault: ActionHandler = genericActionHandler('client', 'addressesSetDefault');
export const storesList: ActionHandler = genericActionHandler('client', 'storesList');
export const storesGet: ActionHandler = genericActionHandler('client', 'storesGet');
export const storeContextGetMyStore: ActionHandler = genericActionHandler('client', 'storeContextGetMyStore');
export const storeContextSetMyStore: ActionHandler = genericActionHandler('client', 'storeContextSetMyStore');
export const storeFavoritesList: ActionHandler = genericActionHandler('client', 'storeFavoritesList');
export const storeFavoritesToggle: ActionHandler = genericActionHandler('client', 'storeFavoritesToggle');
export const productFavoritesList: ActionHandler = genericActionHandler('client', 'productFavoritesList');
export const productFavoritesToggle: ActionHandler = genericActionHandler('client', 'productFavoritesToggle');
export const reviewsList: ActionHandler = genericActionHandler('client', 'reviewsList');
export const reviewsCanReview: ActionHandler = genericActionHandler('client', 'reviewsCanReview');
export const reviewsCreate: ActionHandler = genericActionHandler('client', 'reviewsCreate');
export const cartGet: ActionHandler = genericActionHandler('client', 'cartGet');
export const cartAddItem: ActionHandler = genericActionHandler('client', 'cartAddItem');
export const cartUpdateQty: ActionHandler = genericActionHandler('client', 'cartUpdateQty');
export const cartRemoveItem: ActionHandler = genericActionHandler('client', 'cartRemoveItem');
export const cartClear: ActionHandler = genericActionHandler('client', 'cartClear');
export const cartApplyCoupon: ActionHandler = genericActionHandler('client', 'cartApplyCoupon');
export const cartRemoveCoupon: ActionHandler = genericActionHandler('client', 'cartRemoveCoupon');
export const shippingListMethods: ActionHandler = genericActionHandler('client', 'shippingListMethods');
export const shippingQuoteDelivery: ActionHandler = genericActionHandler('client', 'shippingQuoteDelivery');
export const checkoutPreview: ActionHandler = genericActionHandler('client', 'checkoutPreview');
export const checkoutCreatePaymentSession: ActionHandler = genericActionHandler('client', 'checkoutCreatePaymentSession');
export const paymentsStatus: ActionHandler = genericActionHandler('client', 'paymentsStatus');
export const paymentsConfirm: ActionHandler = genericActionHandler('client', 'paymentsConfirm');
export const ordersList: ActionHandler = genericActionHandler('client', 'ordersList');
export const ordersGet: ActionHandler = genericActionHandler('client', 'ordersGet');
export const ordersTracking: ActionHandler = genericActionHandler('client', 'ordersTracking');
export const ordersInvoiceUrl: ActionHandler = genericActionHandler('client', 'ordersInvoiceUrl');
export const ordersReorder: ActionHandler = genericActionHandler('client', 'ordersReorder');
export const notificationsRegisterToken: ActionHandler = genericActionHandler('client', 'notificationsRegisterToken');
export const notificationsList: ActionHandler = genericActionHandler('client', 'notificationsList');
export const notificationsMarkRead: ActionHandler = genericActionHandler('client', 'notificationsMarkRead');
export const notificationsMarkAllRead: ActionHandler = genericActionHandler('client', 'notificationsMarkAllRead');
export const notificationsDelete: ActionHandler = genericActionHandler('client', 'notificationsDelete');
export const loyaltyGetDashboard: ActionHandler = genericActionHandler('client', 'loyaltyGetDashboard');
export const loyaltyListTransactions: ActionHandler = genericActionHandler('client', 'loyaltyListTransactions');
export const loyaltyRedeem: ActionHandler = genericActionHandler('client', 'loyaltyRedeem');
export const walletGet: ActionHandler = genericActionHandler('client', 'walletGet');
export const walletHistory: ActionHandler = genericActionHandler('client', 'walletHistory');
export const homeGetLayout: ActionHandler = genericActionHandler('client', 'homeGetLayout');
export const insuranceCreateDraft: ActionHandler = genericActionHandler('client', 'insuranceCreateDraft');
export const insuranceAttachFiles: ActionHandler = genericActionHandler('client', 'insuranceAttachFiles');
export const insuranceSubmit: ActionHandler = genericActionHandler('client', 'insuranceSubmit');
export const insuranceGet: ActionHandler = genericActionHandler('client', 'insuranceGet');
export const insuranceApproveQuote: ActionHandler = genericActionHandler('client', 'insuranceApproveQuote');
export const insuranceRejectQuote: ActionHandler = genericActionHandler('client', 'insuranceRejectQuote');
export const insuranceListMyOrders: ActionHandler = genericActionHandler('client', 'insuranceListMyOrders');
export const marketingCapture: ActionHandler = genericActionHandler('client', 'marketingCapture');
export const alertsGetPrefs: ActionHandler = genericActionHandler('client', 'alertsGetPrefs');
export const alertsUpdatePrefs: ActionHandler = genericActionHandler('client', 'alertsUpdatePrefs');
export const alertsSubscribeBackInStock: ActionHandler = genericActionHandler('client', 'alertsSubscribeBackInStock');
export const recoGetSimilar: ActionHandler = genericActionHandler('client', 'recoGetSimilar');
export const recoGetCartUpsell: ActionHandler = genericActionHandler('client', 'recoGetCartUpsell');
export const postPurchaseGetNudges: ActionHandler = genericActionHandler('client', 'postPurchaseGetNudges');
export const supportCreateTicket: ActionHandler = genericActionHandler('client', 'supportCreateTicket');
export const supportListTickets: ActionHandler = genericActionHandler('client', 'supportListTickets');
export const supportGetTicket: ActionHandler = genericActionHandler('client', 'supportGetTicket');
export const supportAddMessage: ActionHandler = genericActionHandler('client', 'supportAddMessage');
export const supportCloseTicket: ActionHandler = genericActionHandler('client', 'supportCloseTicket');
export const settingsGet: ActionHandler = genericActionHandler('client', 'settingsGet');
export const settingsUpdate: ActionHandler = genericActionHandler('client', 'settingsUpdate');
export const legalGetDocs: ActionHandler = genericActionHandler('client', 'legalGetDocs');
export const mediaCreateUploadSpec: ActionHandler = mediaActionHandlers.mediaCreateUploadSpec;
export const mediaFinalizeUpload: ActionHandler = mediaActionHandlers.mediaFinalizeUpload;

export const handlers: Record<string, ActionHandler> = {
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
  storeFavoritesList,
  storeFavoritesToggle,
  productFavoritesList,
  productFavoritesToggle,
  reviewsList,
  reviewsCanReview,
  reviewsCreate,
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
  checkoutCreatePaymentSession,
  paymentsStatus,
  paymentsConfirm,
  ordersList,
  ordersGet,
  ordersTracking,
  ordersInvoiceUrl,
  ordersReorder,
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
  homeGetLayout,
  insuranceCreateDraft,
  insuranceAttachFiles,
  insuranceSubmit,
  insuranceGet,
  insuranceApproveQuote,
  insuranceRejectQuote,
  insuranceListMyOrders,
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
  mediaCreateUploadSpec,
  mediaFinalizeUpload,
};
