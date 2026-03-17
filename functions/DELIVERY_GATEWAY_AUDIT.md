# Delivery Gateway Audit

## Why a dedicated delivery gateway was required

Before this refactor, rider traffic had no dedicated backend entry point. Delivery behavior would have had to ride through generic `client` or `admin` gateways, which created four production risks:

1. rider auth and customer auth were not cleanly separated
2. delivery actions were mixed with broader order/admin actions
3. store ownership and rider ownership checks were easy to miss or implement inconsistently
4. the delivery app/server contract had no stable rider-first surface

## What now exists

A dedicated `deliveryGateway` now exists in `src/gateways/deliveryGateway.ts` and is exported from `src/index.ts` as `delivery`.

The gateway is isolated from `public`, `client`, `admin`, and `webhook` traffic and routes only the delivery registry defined in:

- `src/sot/deliveryActions.ts`
- `src/registries/delivery.ts`
- `src/specs/delivery.ts`

## Request flow

1. request hits `deliveryGateway`
2. request envelope is normalized through the shared protocol layer
3. authenticated identity is resolved from the Firebase callable/auth context
4. rider scope is resolved through `resolveDeliveryRiderScope(...)`
5. non-rider or inactive identities are rejected
6. store mismatch is rejected before delivery action execution
7. delivery action is dispatched from the dedicated delivery registry
8. delivery-specific errors are normalized through the shared unified error response path

## Rider auth/context behavior

The gateway resolves a rider-aware auth scope and attaches it to `ctx.auth.rider`.

Current rider context includes:

- `riderId`
- `uid`
- `role`
- `storeId`
- `branchId`
- `displayName`
- `phone`
- `vehicleType`
- `status`
- `presenceStatus`
- `activeOrderId`
- `activeTripId`
- `lastSeenAt`

Rider resolution is implemented in `src/core/delivery/riders.ts`.

## Store-scope enforcement

The delivery gateway enforces store scope through rider resolution and per-action ownership checks.

Key protections:

- rider store must match requested store scope
- rider cannot act on a foreign order
- rider cannot publish tracking for a foreign store
- admin delivery actions are store-scoped through `resolveStoreScopedId(...)`
- RTDB paths are store-scoped under `riderLocations/{storeId}/{riderId}` and `riderPresence/{storeId}/{riderId}`

## Dedicated delivery action surface

The delivery gateway now exposes explicit rider actions:

- `deliveryWhoAmI`
- `deliverySetPresence`
- `deliveryHeartbeat`
- `deliveryUpdateLocation`
- `deliveryListAssignedOrders`
- `deliveryGetActiveTrip`
- `deliveryGetOrderDetails`
- `deliveryAcceptOrder`
- `deliveryRejectOrder`
- `deliveryArrivedPickup`
- `deliveryPickedUp`
- `deliverySetOnTheWay`
- `deliveryArrivedDropoff`
- `deliveryDelivered`
- `deliveryFailedDelivery`
- `deliveryListHistory`
- `deliveryGetDashboard`
- `deliveryGetProfile`

## Error handling improvements

New delivery-aware error codes were added to make the contract explicit:

- `RIDER_AUTH_REQUIRED`
- `RIDER_NOT_FOUND`
- `RIDER_INACTIVE`
- `DELIVERY_STORE_MISMATCH`
- `DELIVERY_ORDER_NOT_ASSIGNED`
- `DELIVERY_ILLEGAL_TRANSITION`
- `DELIVERY_REASON_REQUIRED`
- `DELIVERY_LOCATION_INVALID`
- `IDEMPOTENCY_KEY_REUSED`

## Remaining gateway gaps

1. Rider bootstrapping currently auto-hydrates from `employees` when a `delivery_riders` row is missing. That is useful for rollout, but long-term production should migrate riders explicitly rather than infer them forever.
2. There is no separate transport-level rate limit or anti-abuse guard dedicated to the delivery gateway yet.
3. End-to-end callable tests against Firebase auth + RTDB + MySQL were not available in this environment, so the gateway contract is compile/build/self-test verified rather than emulator-E2E verified.
