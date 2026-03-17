# Delivery Server Patch Summary

## What changed

### New delivery gateway and contract

Added:

- `src/gateways/deliveryGateway.ts`
- `src/sot/deliveryActions.ts`
- `src/registries/delivery.ts`
- `src/specs/delivery.ts`

Why:

- isolate rider app traffic behind a dedicated delivery surface
- stop mixing rider requests into generic gateways/actions

### New delivery domain

Added:

- `src/entities/DeliveryRider.ts`
- `src/entities/DeliveryAssignment.ts`
- `src/entities/DeliveryTrip.ts`
- `src/entities/DeliveryOrderEvent.ts`
- `src/entities/DeliveryActionRequest.ts`
- `src/migrations/1729700000000-DeliveryBackendFoundation.ts`

Why:

- make riders, assignments, trips, timeline, and idempotency first-class backend concepts

### Delivery core logic

Added:

- `src/core/delivery/status.ts`
- `src/core/delivery/idempotency.ts`
- `src/core/delivery/riders.ts`
- `src/core/delivery/tracking.ts`
- `src/core/delivery/domain.ts`
- `src/core/delivery/selfTest.ts`

Why:

- enforce lifecycle legality
- centralize rider auth/store resolution
- publish/store realtime presence and location
- implement rider/admin delivery actions coherently

### Existing backend wiring updated

Updated:

- `src/index.ts`
- `src/core/db.ts`
- `src/db/entities.ts`
- `src/core/protocol.ts`
- `src/context/requestContext.ts`
- `src/context/cloudContext.ts`
- `src/protocol/envelopes.ts`
- `src/protocol/clientApiContract.ts`
- `src/protocol/errorCodes.ts`
- `src/dispatch/dispatchAction.ts`
- `src/actions/catalogs.ts`
- `src/registries/actionRegistries.ts`
- `src/specs/actionSpecs.ts`
- `src/health/actionsHealth.ts`
- `src/sot/adminActions.ts`
- `src/registries/admin.ts`
- `src/specs/admin.ts`
- `src/actions/admin/adminActions.ts`
- `src/actions/admin/deliveryAdminActions.ts`
- `src/actions/delivery/deliveryActions.ts`
- `src/core/rbac.ts`
- `src/core/orderStatus.ts`
- `src/entities/Order.ts`

Why:

- register the delivery domain in the function surface
- extend order schema for delivery metadata
- add admin delivery actions
- expose new error codes/spec coverage
- preserve compatibility with existing order/shipment/reporting flows

## What was re-verified

- `npm run typecheck` passed
- `npm run build` passed
- `node .\\lib\\core\\delivery\\selfTest.js` passed

## What was not re-verified

1. No seeded MySQL integration scenario run was available here.
2. No Firebase emulator E2E run for delivery callable auth/RTDB was available here.
3. Git CLI was not available in this environment, so changed-file verification was done from direct workspace inspection rather than `git diff`.
