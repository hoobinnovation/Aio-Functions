# Delivery Server Refactor Plan

## What was wrong

The server had order, shipment, tracking, and admin pieces, but delivery rider flow was not a first-class backend domain.

Main structural problems:

1. no dedicated delivery gateway
2. no dedicated delivery action registry/spec surface
3. no canonical rider profile/presence/trip/assignment model
4. weak separation between customer/admin order state and rider delivery state
5. no dedicated idempotency model for rider lifecycle actions
6. no store-scoped rider tracking contract
7. no stale-heartbeat fallback to mark riders offline

## Refactor direction implemented

### 1. Create a dedicated delivery backend surface

- added `src/gateways/deliveryGateway.ts`
- added `src/sot/deliveryActions.ts`
- added `src/registries/delivery.ts`
- added `src/specs/delivery.ts`

### 2. Introduce a first-class delivery domain

- added rider entity/state: `DeliveryRider`
- added assignment entity/state: `DeliveryAssignment`
- added trip entity/state: `DeliveryTrip`
- added timeline entity/state: `DeliveryOrderEvent`
- added idempotency entity/state: `DeliveryActionRequest`

### 3. Normalize lifecycle semantics

- created `src/core/delivery/status.ts`
- defined canonical rider lifecycle states
- mapped delivery lifecycle to existing order/shipment compatibility fields
- enforced legal transitions server-side

### 4. Harden store/rider ownership

- rider scope is resolved from auth identity
- foreign store actions are rejected
- foreign order actions are rejected
- admin assignment/reassignment/unassignment is store-scoped
- RTDB tracking is store-scoped

### 5. Implement realtime delivery infrastructure

- added presence and location publishers in `src/core/delivery/tracking.ts`
- added stale-heartbeat sweep in `src/core/delivery/domain.ts`
- exported scheduled sweep in `src/index.ts`

### 6. Preserve backward compatibility where needed

- order status and shipment status are still updated for downstream compatibility
- tracking/timeline events are appended in both legacy and delivery-specific forms where appropriate

## Migration strategy

1. run the new schema migration `1729700000000-DeliveryBackendFoundation`
2. backfill `delivery_riders` for known rider accounts if explicit seeding is preferred
3. move rider app traffic from generic gateways to the new `delivery` gateway
4. update admin tooling to use the new delivery assignment actions
5. backfill historical delivery fields only if analytics/reporting require legacy orders to be queryable as delivery records

## Risks to watch during rollout

1. environments with inconsistent employee rider roles may need rider seed/backfill work
2. older clients calling mixed generic actions should be cut over deliberately
3. existing reporting that only reads legacy order statuses may need updated status mapping awareness
