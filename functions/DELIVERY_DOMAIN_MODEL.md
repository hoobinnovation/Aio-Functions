# Delivery Domain Model

## Canonical backend delivery concepts

### RiderProfile / RiderIdentity

Stored in `delivery_riders`.

Core fields:

- `id`
- `uid`
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
- `createdAt`
- `updatedAt`

### RiderPresenceStatus

Canonical values:

- `offline`
- `online`
- `driving`

Semantics:

- `online`: authenticated, available, no active trip
- `driving`: active trip/order in progress
- `offline`: logged out, app closed best effort, inactive, or heartbeat stale

### DeliveryAssignment

Stored in `delivery_assignments`.

Core fields:

- `id`
- `orderId`
- `storeId`
- `branchId`
- `riderId`
- `tripId`
- `status`
- `reason`
- `assignedByUid`
- `assignedAt`
- `respondedAt`
- `completedAt`

Purpose:

- first-class record of who was assigned
- supports reassignment/unassignment auditability
- decouples rider assignment history from the mutable `orders` row

### DeliveryTrip

Stored in `delivery_trips`.

Core fields:

- `id`
- `riderId`
- `storeId`
- `branchId`
- `status`
- `orderIdsJson`
- `startedAt`
- `endedAt`
- `createdAt`
- `updatedAt`

Current trip semantics:

- one active trip per rider
- trip order membership stored as JSON array for compatibility with current schema style
- trip closes automatically when final order leaves the trip

### DeliveryOrderLifecycle

Canonical rider delivery statuses:

- `assigned`
- `accepted`
- `arrived_pickup`
- `picked_up`
- `on_the_way`
- `arrived_dropoff`
- `delivered`
- `rejected`
- `failed_delivery`
- `cancelled`

These are stored on the order in `orders.deliveryStatus` and reconciled with `orders.status`.

### DeliveryOrderEvent

Stored in `delivery_order_events`.

Core fields:

- `id`
- `orderId`
- `storeId`
- `riderId`
- `tripId`
- `type`
- `actorType`
- `actorId`
- `statusBefore`
- `statusAfter`
- `reason`
- `metadataJson`
- `note`
- `createdAt`

Purpose:

- canonical delivery timeline
- tracks rider/admin actions with before/after state
- supports order details timeline and post-incident review

### RiderLocation

Published to RTDB under:

- `riderLocations/{storeId}/{riderId}`

Payload:

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

### DeliveryGatewayContext

Attached to action execution through `ActionContext.auth.rider`.

Contains rider identity + store scope + active delivery state needed for all delivery actions.

## Order compatibility fields

The order entity now carries delivery-specific fields:

- `riderId`
- `tripId`
- `deliveryStatus`
- `statusReason`
- `assignedAt`
- `acceptedAt`
- `pickedUpAt`
- `deliveredAt`
- `failedAt`
- `latestRiderLocationSnapshotJson`
- `updatedAt`

## Status compatibility mapping

Delivery state is canonical for rider flow. Existing order/shipment status fields are updated for compatibility, not treated as the primary truth for rider legality checks.
