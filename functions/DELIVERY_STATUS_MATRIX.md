# Delivery Status Matrix

## Canonical rider lifecycle

Source of truth:

- `src/core/delivery/status.ts`
- `src/core/delivery/domain.ts`
- `src/core/orderStatus.ts`

## Transition matrix

| Current status | Allowed next statuses | Blocked examples | Actor(s) | Source files | Notes |
| --- | --- | --- | --- | --- | --- |
| `assigned` | `accepted`, `rejected`, `cancelled` | `picked_up`, `delivered`, `failed_delivery` | rider, admin/system | `src/core/delivery/status.ts`, `src/core/delivery/domain.ts` | reject requires reason |
| `accepted` | `arrived_pickup`, `cancelled` | `delivered`, `failed_delivery`, `rejected` | rider, admin/system | same | accepting also ensures active trip |
| `arrived_pickup` | `picked_up`, `cancelled` | `delivered`, `failed_delivery` | rider, admin/system | same | pickup leg has started |
| `picked_up` | `on_the_way`, `cancelled` | `rejected`, `accepted` | rider, admin/system | same | shipment/order compatibility updated here |
| `on_the_way` | `arrived_dropoff`, `cancelled` | `accepted`, `picked_up` | rider, admin/system | same | driving/dropoff leg |
| `arrived_dropoff` | `delivered`, `failed_delivery`, `cancelled` | `accepted`, `picked_up` | rider, admin/system | same | failed delivery requires reason |
| `delivered` | none | any mutation except idempotent replay | terminal | same | final success state |
| `rejected` | none | any mutation except idempotent replay | terminal | same | final rejection state |
| `failed_delivery` | none | any mutation except idempotent replay | terminal | same | final failure state |
| `cancelled` | none | any mutation except idempotent replay | terminal | same | final cancellation state |

## Rider action mapping

| Rider action | Required current status | Next status |
| --- | --- | --- |
| `deliveryAcceptOrder` | `assigned` | `accepted` |
| `deliveryRejectOrder` | `assigned` | `rejected` |
| `deliveryArrivedPickup` | `accepted` | `arrived_pickup` |
| `deliveryPickedUp` | `arrived_pickup` | `picked_up` |
| `deliverySetOnTheWay` | `picked_up` | `on_the_way` |
| `deliveryArrivedDropoff` | `on_the_way` | `arrived_dropoff` |
| `deliveryDelivered` | `arrived_dropoff` | `delivered` |
| `deliveryFailedDelivery` | `arrived_dropoff` | `failed_delivery` |

## Compatibility mapping into broader order vocabulary

| Delivery status | Order status compatibility |
| --- | --- |
| `assigned` | `accepted` |
| `accepted` | `accepted` |
| `arrived_pickup` | `out_for_delivery` |
| `picked_up` | `out_for_delivery` |
| `on_the_way` | `out_for_delivery` |
| `arrived_dropoff` | `out_for_delivery` |
| `delivered` | `delivered` |
| `rejected` | `rejected` |
| `failed_delivery` | `cancelled` |
| `cancelled` | `cancelled` |

## Notes

1. Delivery legality checks use delivery state, not UI assumptions.
2. Terminal states are idempotent-safe but not mutable to a new legal state.
3. Admin reassignment/unassignment is deliberately blocked once the active delivery leg has materially started.
