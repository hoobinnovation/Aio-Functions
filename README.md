# Notifications + Loyalty + Reports Backend (Firebase Functions + MySQL + TypeORM)

Backend package شامل:
- Notifications (user/admin campaigns + scheduler)
- Loyalty (dashboard/redeem/settings/tiers/adjustments)
- Reports (overview/top products/orders by status)
- مع دعم commerce flows السابقة (cart/checkout/payments/orders)

## Environment Variables
- `DB_HOST`
- `DB_PORT`
- `DB_USER`
- `DB_PASS`
- `DB_NAME`
- `DB_SSL` (`true` / `false`)

## Run Locally
```bash
cd functions
npm install
npm run build
npm run typeorm:migrate
npm run serve
```

## Deploy
```bash
cd functions
npm run build
firebase deploy --only functions
```

## Main Additions
### User
- `notificationsRegisterToken`
- `notificationsList`
- `notificationsMarkRead`
- `notificationsMarkAllRead`
- `notificationsDelete`
- `loyaltyGetDashboard`
- `loyaltyListTransactions`
- `loyaltyRedeem`

### Admin
- `adminNotificationsSend`
- `adminNotificationsList`
- `adminLoyaltyGetSettings`
- `adminLoyaltyUpdateSettings`
- `adminLoyaltyTiersList/Create/Update/Delete`
- `adminLoyaltyAdjustUserPoints`
- `reportsOverview`
- `reportsTopProducts`
- `reportsOrdersByStatus`

### Scheduler
- `notificationsDispatcher` (runs every minute and dispatches queued campaigns with `scheduledAt <= now`)

## Notes
- All admin actions require RBAC + store access and are written to audit logs.
- Loyalty points are issued automatically after successful payment confirmation.
- Reports are generated from real orders/order_items/loyalty_transactions data via QueryBuilder.
