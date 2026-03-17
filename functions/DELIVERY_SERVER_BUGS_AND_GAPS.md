# Delivery Server Bugs And Gaps

## High

### 1. No full integration test suite against MySQL + Firebase callable auth + RTDB

Root cause:

The existing server project did not already have delivery-specific end-to-end infrastructure, and this environment did not provide seeded emulator/integration harness coverage for the new delivery domain.

Impact:

The backend is compile/build/self-test verified, but not fully E2E-proven under concurrent live infrastructure behavior.

### 2. Historical delivery data is not automatically backfilled

Root cause:

The new delivery schema adds rider/trip/assignment/timeline fields and tables going forward, but does not infer rich historical assignment/trip records for old orders.

Impact:

Legacy reporting or analytics that expects historical delivery history in the new shape may need a separate backfill/migration job.

## Medium

### 3. Rider auto-hydration depends on employee role naming

Root cause:

`resolveDeliveryRiderRecord(...)` can bootstrap a rider from `employees`, but only when role values match the known rider role set.

Impact:

Stores using non-standard role strings may fail rider resolution until `delivery_riders` is seeded explicitly.

### 4. Stale-offline handling is best effort, not instant truth

Root cause:

Mobile close/terminate events are not guaranteed and the server fallback uses a scheduled sweep.

Impact:

A rider may appear online briefly after abrupt termination until the stale timeout window expires.

### 5. Internal TypeORM typing surface required compatibility bridges

Root cause:

The installed TypeORM declarations in this project do not expose the same members cleanly across all import paths used by transaction helpers.

Impact:

The delivery transaction helpers include narrow `any` compatibility aliases to keep the runtime-safe implementation compiling. Runtime verification passed, but future dependency cleanup should remove those bridges.

## Low

### 6. No delivery-specific rate limiting / abuse throttling yet

Root cause:

The new delivery gateway focuses on auth, scope, lifecycle, idempotency, and realtime correctness first.

Impact:

Burst abuse protection remains an infrastructure-level follow-up rather than a delivery-gateway-native guard.
