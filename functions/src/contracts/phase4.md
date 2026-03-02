# Phase-4 Commerce & Marketing Contracts

Pagination: offset pagination `{limit, offset}` default 20 max 100.

All actions use unified protocol envelopes and responses.

## Client
For each action below: gateway=`client`, auth required, owner checks by `ctx.uid`, writes in transactions.

- `cartGet`: payload `null`; returns `{ cart, items }`; DB: carts, cart_items.
- `cartAddItem`: payload `{ productId, variantId, qty }`; validates qty>0, checks variant stock before add; upserts cart item; errors `OUT_OF_STOCK`,`NOT_FOUND`,`VALIDATION_ERROR`.
- `cartUpdateQty`: payload `{ itemId, qty }`; owner cart item required; stock check; update qty.
- `cartRemoveItem`: payload `{ itemId }`; owner delete.
- `cartClear`: payload `null`; clears items + coupon.
- `cartApplyCoupon`: payload `{ code }`; validates active status + startsAt/endsAt window + per-user limit.
- `cartRemoveCoupon`: payload `null`; clears coupon code.
- `shippingListMethods`: payload `null`; returns active methods by store.
- `shippingQuoteDelivery`: payload `{ lat, lng }`; selects nearest active zone using haversine and returns `{ zone, distanceKm, priceCents }`.
- `checkoutPreview`: payload `null`; server computes subtotal, discount, total, cashback preview.
- `notificationsRegisterToken`: payload `{ token, platform? }`; idempotent token registration.
- `notificationsList`: payload `null`; lists user notifications.
- `notificationsMarkRead`: payload `{ id }`; marks single owned notification read.
- `notificationsMarkAllRead`: payload `null`; marks all read.
- `notificationsDelete`: payload `{ id }`; deletes owned notification.
- `loyaltyGetDashboard`: payload `null`; returns points aggregate and count.
- `loyaltyListTransactions`: payload `null`; returns loyalty entries.
- `loyaltyRedeem`: payload `{ points }`; validates points balance; creates redeem transaction and wallet credit booking.
- `walletGet`: payload `null`; returns wallet account.
- `walletHistory`: payload `null`; returns wallet transactions.
- `marketingCapture`: payload `{ source?, campaign?, medium?, term?, content?, dedupeKey? }`; idempotent by `(uid,dedupeKey)`.
- `alertsGetPrefs`: payload `null`; returns prefs with defaults.
- `alertsUpdatePrefs`: payload `{ backInStock, priceDrop }`; upserts prefs.
- `alertsSubscribeBackInStock`: payload `{ productId }`; idempotent subscription.
- `recoGetSimilar`: payload `{ productId }`; rules-based same category recommendations.
- `recoGetCartUpsell`: payload `null`; rules-based upsell excluding cart products.
- `postPurchaseGetNudges`: payload `null`; returns active post purchase flows.
- `supportCreateTicket`: payload `{ subject, message, mediaAssetId? }`; creates ticket + first message.
- `supportListTickets`: payload `null`; owned tickets only.
- `supportGetTicket`: payload `{ ticketId }`; owner check + messages.
- `supportAddMessage`: payload `{ ticketId, message, mediaAssetId? }`; owner check + status open.
- `supportCloseTicket`: payload `{ ticketId }`; owner check + close.
- `settingsGet`: payload `null`; user settings.
- `settingsUpdate`: payload `{ config }`; upsert settings.
- `legalGetDocs`: payload `{ docType? }`; active legal docs by store.

## Admin
For each action: gateway=`admin`, auth+RBAC. Store-scoped actions require storeId (envelope or payload).

- `adminShippingMethodsList/Get/Create/Update/Disable`: CRUD shipping methods.
- `adminDeliveryZonesList/Get/Create/Update/Disable`: CRUD zones (with governorates list on list).
- `adminCouponsList/Get/Create/Update/Disable`: CRUD coupons (windows, limits persisted).
- `adminCashbackList/Get/Create/Update/Disable`: CRUD cashback offers.
- `adminDiscountsList/Get/Create/Update/Disable`: CRUD targeted discounts.
- `adminDiscountsPreviewAudienceCount`: payload `{ storeId }`; returns audience estimate.
- `adminNotificationsSend`: payload `{ title, body, limit? }`; creates per-user notifications in bulk.
- `adminNotificationsList`: payload `{ limit? }`; global notification list.
- `adminLoyaltyGetSettings`/`adminLoyaltyUpdateSettings`: get/update store loyalty config.
- `adminLoyaltyAdjustUserPoints`: payload `{ uid, storeId, pointsDelta }`; inserts adjustment transaction.
- `adminLoyaltyTiersList/Create/Update/Disable`: CRUD tiers.
- `adminReportsAttributionOverview`: grouped source counts.
- `adminReportsTopCampaigns`: grouped campaign counts.
- `adminPostPurchaseFlowsList/Get/Create/Update/Disable`: CRUD flows.
- `adminPostPurchaseRunsList`: list run history.

Error codes across phase-4 actions:
- `VALIDATION_ERROR`: Joi/envelope invalid.
- `UNAUTHENTICATED`: client/admin auth missing.
- `FORBIDDEN`: RBAC/store access denied.
- `NOT_FOUND`: missing entity.
- `OUT_OF_STOCK`: cart quantity exceeds stock.
- `COUPON_INVALID`: coupon outside active window.
- `COUPON_LIMIT`: per-user coupon limit exceeded.
- `INSUFFICIENT_POINTS`: redeem exceeds loyalty balance.
- `INTERNAL`: unknown failures.
