# Delivery Server Test Universe

## Verification completed in this environment

- `npm run typecheck`
- `npm run build`
- `node .\\lib\\core\\delivery\\selfTest.js`

## Required backend scenario matrix

| Area | Scenario | Expected result |
| --- | --- | --- |
| auth | valid rider auth | rider context resolves and action succeeds |
| auth | wrong role | `RIDER_NOT_FOUND` or `RIDER_AUTH_REQUIRED` |
| auth | inactive rider | `RIDER_INACTIVE` |
| auth | stale session with missing rider record | access denied and no delivery mutation |
| scope | wrong store in rider request | `DELIVERY_STORE_MISMATCH` |
| scope | foreign order access | `DELIVERY_ORDER_NOT_ASSIGNED` or `ORDER_NOT_FOUND` |
| scope | unassigned rider attempts transition | rejected |
| scope | admin assigns order across stores | rejected |
| scope | location update under wrong store | rejected |
| presence | app open with valid session | rider becomes `online` unless active trip exists |
| presence | active trip restore | rider becomes `driving` |
| presence | no active trip restore | rider becomes `online` |
| presence | logout/app close best effort | rider becomes `offline` |
| presence | stale heartbeat | sweep marks rider `offline` |
| tracking | valid location update | RTDB + rider/order snapshot updated |
| tracking | invalid GPS data | `DELIVERY_LOCATION_INVALID` |
| tracking | location without valid rider session | rejected |
| assignment | admin assign order to rider | assignment row created/updated and order becomes `assigned` |
| assignment | admin reassign before pickup | succeeds with event trail |
| assignment | admin reassign after pickup leg | blocked |
| assignment | admin unassign before pickup | succeeds |
| lifecycle | rider accepts assigned order | `accepted`, trip ensured, timeline appended |
| lifecycle | duplicate accept with same idempotency key | idempotent success |
| lifecycle | duplicate accept with reused key and different payload | `IDEMPOTENCY_KEY_REUSED` |
| lifecycle | reject without reason | `DELIVERY_REASON_REQUIRED` |
| lifecycle | fail delivery without reason | `DELIVERY_REASON_REQUIRED` |
| lifecycle | pickup before accept | `DELIVERY_ILLEGAL_TRANSITION` |
| lifecycle | deliver before pickup/dropoff | `DELIVERY_ILLEGAL_TRANSITION` |
| lifecycle | duplicate deliver | idempotent-safe terminal response |
| lifecycle | stale client attempts illegal transition | rejected |
| timeline | every legal transition | `delivery_order_events`, legacy tracking, and status timeline remain coherent |
| reporting | dashboard after delivery success/failure/rejection | counts reflect final outcomes |
| reporting | history query | final delivery outcomes only, rider/store-scoped |
| compatibility | payment/order/shipment continuity | order and shipment compatibility statuses remain coherent |

## Recommended next tests outside this environment

1. emulator test for Firebase callable auth -> delivery gateway
2. MySQL integration tests for transaction + idempotency behavior
3. RTDB rule verification for rider tracking paths
4. concurrency test for duplicate accept/deliver under weak network retry
5. admin/rider mixed-action test to confirm no cross-store bleed
