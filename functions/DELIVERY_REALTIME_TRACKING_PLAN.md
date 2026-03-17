# Delivery Realtime Tracking Plan

## Implemented contract

### Presence states

Canonical presence values:

- `offline`
- `online`
- `driving`

### RTDB paths

- `riderLocations/{storeId}/{riderId}`
- `riderPresence/{storeId}/{riderId}`

Implemented in `src/core/delivery/tracking.ts`.

## Presence lifecycle

### Rider app open / valid session

- app calls `deliverySetPresence` or `deliveryHeartbeat`
- backend stores rider presence in MySQL (`delivery_riders`)
- backend publishes presence snapshot to RTDB
- if active trip/order exists, normalized presence becomes `driving`
- otherwise normalized presence becomes `online`

### Active trip start

- rider accepts order
- backend ensures/creates trip
- backend updates rider `activeTripId` / `activeOrderId`
- backend publishes `driving`

### Trip end / final order leaves trip

- final success/failure transitions remove order from trip
- trip closes when empty
- rider active trip/order pointers are cleared
- backend publishes `online`

### Logout / app close best effort

- rider app should call `deliverySetPresence` with `offline`
- backend writes `offline` to rider state and RTDB

### Server stale fallback

- scheduled sweep runs every 5 minutes
- threshold uses `DELIVERY_HEARTBEAT_TIMEOUT_MS`
- stale riders are flipped to `offline`
- RTDB presence/location snapshots are updated accordingly

## Location payload

Accepted payload fields:

- `storeId`
- `branchId`
- `orderId`
- `tripId`
- `lat`
- `lng`
- `accuracy`
- `heading`
- `speed`
- `presenceStatus`
- `appState`

Persisted/enriched payload:

- `riderId`
- `storeId`
- `branchId`
- `orderId`
- `tripId`
- `lat`
- `lng`
- `accuracy`
- `heading`
- `speed`
- `updatedAt`
- `presenceStatus`
- `appState`

## Validation rules

- valid rider auth required
- store mismatch rejected
- invalid latitude/longitude rejected
- invalid accuracy rejected
- order snapshot write only happens within rider store scope

## Firestore/MySQL compatibility

The latest rider location is also copied onto the order row in `orders.latestRiderLocationSnapshotJson` when an active order is present. That gives order-details/dashboard flows a fast snapshot without making RTDB the only read path.

## Honest limitations

1. Mobile OS termination is never guaranteed; server stale sweep is the fallback source of truth.
2. There is not yet a background streaming worker here; this backend assumes the rider app controls update frequency.
3. No emulator-driven load test for RTDB churn was run in this environment.
