# Store Scope Audit

## Scope objective

Every delivery action must stay inside a single store boundary.

This audit reviews how store safety is enforced after the delivery backend refactor.

## Rider auth/store resolution

Source: `src/core/delivery/riders.ts`

Checks implemented:

- authenticated UID must resolve to an active delivery rider
- rider record carries a single `storeId`
- requested store scope must match rider store scope
- inactive riders are rejected

Result:

- non-rider identities cannot enter delivery actions successfully
- a rider cannot switch stores by passing a different `storeId`

## Rider order ownership

Source: `src/core/delivery/domain.ts`

Checks implemented:

- `getOrderForStore(...)` loads the order by `id + storeId`
- `getDeliveryAccessibleOrder(...)` requires assignment ownership
- transition actions require `order.riderId === rider.riderId`
- assignment row lookup is store-scoped

Result:

- rider cannot act on foreign orders
- rider cannot view or mutate another rider's assigned order

## Admin assignment safety

Source: `src/core/delivery/domain.ts`

Checks implemented:

- admin store scope is resolved through `resolveStoreScopedId(...)`
- rider lookup is store-scoped
- assignment uses store-scoped order load
- dangerous reassign/unassign after delivery leg start is blocked

Result:

- cross-store assign/reassign is blocked
- store mismatch between rider and order is blocked

## Realtime tracking scope

Source: `src/core/delivery/tracking.ts`

Checks implemented:

- RTDB path is `riderLocations/{storeId}/{riderId}`
- presence path is `riderPresence/{storeId}/{riderId}`
- `deliveryUpdateLocation` rejects mismatched `storeId`
- order snapshot update is restricted by `{ id, storeId }`

Result:

- rider cannot publish location under another store path through the delivery action surface

## Reporting/history scope

Checks implemented:

- dashboard queries use `rider.storeId`
- history uses `storeId + riderId`
- active trip lookup is rider-scoped
- rider list/admin assignment list are store-scoped

## Residual risks

1. Legacy non-delivery actions outside this new delivery surface may still mutate order rows without understanding delivery semantics.
2. Historical rows created before this refactor do not automatically gain assignment/trip records; that is a migration/backfill concern, not a gateway bypass.
3. RTDB security rules were not audited from this folder. Server-side writes are scoped correctly, but rule-layer validation still needs platform-level confirmation if clients ever write directly.
