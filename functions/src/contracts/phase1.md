# Phase-1 Action Contracts

Unified protocol for all callable actions:
- Request envelope: `{ action, storeId?, payload?, meta? }`
- Success response: `{ ok:true, data:any, meta:{ requestId, serverTime } }`
- Error response: `{ ok:false, error:{ code, message, details? }, meta:{ requestId, serverTime } }`

## publicHealthPing
1) Gateway: `public`
2) Envelope:
- action: `publicHealthPing`
- storeId: optional, ignored.
3) Request payload JSON:
```json
null
```
4) Validation rules:
- Payload optional (`Joi.any().optional()`).
5) Execution steps:
1. Gateway validates envelope and action.
2. Auth optional; `ctx.uid` may be undefined.
3. No RBAC.
4. No DB read/write.
5. Return health payload.
6) Success response JSON:
```json
{ "ok": true, "data": { "pong": true, "gateway": "public" }, "meta": { "requestId": "uuid", "serverTime": "iso" } }
```
7) Error cases:
- `VALIDATION_ERROR`: bad envelope/payload. details: `{ issues: string[] }`
- `ACTION_NOT_FOUND`: action not in registry.
- `SPEC_MISSING`: missing action spec.
- `INTERNAL`: unexpected error.
8) DB tables touched:
- none.

## publicActionsList
1) Gateway: `public`
2) Envelope:
- action: `publicActionsList`
- storeId: optional, ignored.
3) Request payload JSON:
```json
null
```
4) Validation rules:
- Payload optional (`Joi.any().optional()`).
5) Execution steps:
1. Validate envelope/action/spec.
2. No required auth.
3. Read static registry keys and SOT count.
4. Return list payload.
6) Success response JSON:
```json
{ "ok": true, "data": { "gateway": "public", "implementedActions": ["..."], "sotActionsCount": 0 }, "meta": { "requestId": "uuid", "serverTime": "iso" } }
```
7) Error cases: same framework errors as above.
8) DB tables touched: none.

## clientHealthWhoAmI
1) Gateway: `client`
2) Envelope:
- action: `clientHealthWhoAmI`
- storeId: optional, passthrough only.
3) Request payload JSON:
```json
null
```
4) Validation rules:
- Payload optional.
5) Execution steps:
1. Require `context.auth.uid`.
2. Validate envelope/action/spec.
3. No RBAC.
4. No DB writes.
5. Return caller uid.
6) Success response JSON:
```json
{ "ok": true, "data": { "uid": "firebaseUid", "gateway": "client" }, "meta": { "requestId": "uuid", "serverTime": "iso" } }
```
7) Error cases:
- `UNAUTHENTICATED`, `VALIDATION_ERROR`, `ACTION_NOT_FOUND`, `SPEC_MISSING`, `INTERNAL`.
8) DB tables touched: none.

## clientActionsList
1) Gateway: `client`
2) Envelope:
- action: `clientActionsList`
- storeId: optional, ignored.
3) Request payload JSON:
```json
null
```
4) Validation rules:
- Payload optional.
5) Execution steps:
1. Require auth uid.
2. Validate envelope/action/spec.
3. Return static registry keys + SOT count.
6) Success response JSON:
```json
{ "ok": true, "data": { "gateway": "client", "implementedActions": ["..."], "sotActionsCount": 0 }, "meta": { "requestId": "uuid", "serverTime": "iso" } }
```
7) Error cases: `UNAUTHENTICATED`, `VALIDATION_ERROR`, `ACTION_NOT_FOUND`, `SPEC_MISSING`, `INTERNAL`.
8) DB tables touched: none.

## mediaCreateUploadSpec
1) Gateway: `client`
2) Envelope:
- action: `mediaCreateUploadSpec`
- storeId: optional. If present, used in deterministic path under `stores/{storeId}/...`; otherwise `global/...`.
3) Request payload JSON:
```json
{ "ownerType": "string", "ownerId": "string", "kind": "image|document", "contentType": "string", "sizeBytes": 123, "fileExt": "jpg" }
```
4) Validation rules:
- `ownerType` required string.
- `ownerId` required string.
- `kind` required enum `image|document`.
- `contentType` required string.
- `sizeBytes` required positive integer.
- `fileExt` required alnum only.
5) Execution steps:
1. Require auth uid.
2. Validate envelope/action/spec.
3. Generate `assetId` (uuid) + deterministic `originalPath`.
4. DB transaction: insert `media_assets` row with status `created`, requested size/content type, createdByUid.
5. Generate Storage v4 signed PUT URL with required content type.
6. Return upload spec and finalize hint.
6) Success response JSON:
```json
{ "ok": true, "data": { "assetId": "uuid", "bucket": "bucket", "originalPath": "path", "upload": { "method": "PUT", "url": "https://...", "headers": { "Content-Type": "..." } }, "finalizeHint": { "action": "mediaFinalizeUpload", "assetId": "uuid" } }, "meta": { "requestId": "uuid", "serverTime": "iso" } }
```
7) Error cases:
- `UNAUTHENTICATED`
- `VALIDATION_ERROR` details `{ issues: string[] }`
- `CONFIG_ERROR` when bucket missing.
- `INTERNAL`
8) DB tables touched:
- `media_assets` (insert).

## mediaFinalizeUpload
1) Gateway: `client`
2) Envelope:
- action: `mediaFinalizeUpload`
- storeId: optional passthrough; authorization is owner-based.
3) Request payload JSON:
```json
{ "assetId": "uuid" }
```
4) Validation rules:
- `assetId` required UUID v4/v5 string.
5) Execution steps:
1. Require auth uid.
2. Validate envelope/action/spec.
3. DB read: fetch `media_assets` by id.
4. Verify `createdByUid === ctx.uid`.
5. Storage metadata read for `originalPath`.
6. Validate `metadata.contentType` equals requested and `metadata.size <= requested`.
7. DB transaction: update `contentType`, `sizeBytes`, status (`processing` for image; `ready` for document).
8. Return normalized asset payload.
6) Success response JSON:
```json
{ "ok": true, "data": { "asset": { "id": "uuid", "originalPath": "...", "thumbnailPath": "...", "status": "processing|ready", "contentType": "...", "sizeBytes": 123, "kind": "image|document", "ownerType": "...", "ownerId": "...", "storeId": "..." } }, "meta": { "requestId": "uuid", "serverTime": "iso" } }
```
7) Error cases:
- `UNAUTHENTICATED`
- `VALIDATION_ERROR` details `{ issues:string[] }` or `{ requested:number|string, actual:number|string }`
- `NOT_FOUND` asset missing.
- `FORBIDDEN` owner mismatch.
- `INTERNAL`
8) DB tables touched:
- `media_assets` (read/update).

## adminHealthWhoAmI
1) Gateway: `admin`
2) Envelope:
- action: `adminHealthWhoAmI`
- storeId: optional, not required by RBAC policy for this action.
3) Request payload JSON: `null`
4) Validation rules: payload optional.
5) Execution steps:
1. Require auth uid.
2. Validate envelope/action/spec.
3. Run `rbacCheckOrThrow` (active admin + role allowed).
4. Return uid.
6) Success response JSON:
```json
{ "ok": true, "data": { "uid": "firebaseUid", "gateway": "admin" }, "meta": { "requestId": "uuid", "serverTime": "iso" } }
```
7) Error cases: `UNAUTHENTICATED`, `FORBIDDEN`, `RBAC_POLICY_MISSING`, framework validation errors, `INTERNAL`.
8) DB tables touched: `admin_users`, `admin_roles`.

## adminHealthDbCheck
1) Gateway: `admin`
2) Envelope:
- action: `adminHealthDbCheck`
- storeId: optional, not required.
3) Request payload JSON: `null`
4) Validation rules: payload optional.
5) Execution steps:
1. Require auth + RBAC pass.
2. Execute `SELECT 1`.
3. Query INFORMATION_SCHEMA for required tables.
4. Return ping/tables map.
6) Success response JSON:
```json
{ "ok": true, "data": { "ping": true, "tables": { "stores": true, "admin_users": true, "admin_roles": true, "admin_store_access": true, "user_profiles": true, "media_assets": true } }, "meta": { "requestId": "uuid", "serverTime": "iso" } }
```
7) Error cases: `UNAUTHENTICATED`, `FORBIDDEN`, `RBAC_POLICY_MISSING`, `INTERNAL`.
8) DB tables touched: INFORMATION_SCHEMA + required table existence checks.

## adminHealthActionsCoverage
1) Gateway: `admin`
2) Envelope:
- action: `adminHealthActionsCoverage`
- storeId: optional.
3) Request payload JSON: `null`
4) Validation rules: payload optional.
5) Execution steps:
1. Require auth + RBAC pass.
2. Compare SOT arrays against registries and ACTION_SPECS.
3. Build per-gateway report: `missingHandlers`, `missingSpecs`, `extraHandlers`, counts.
4. Return report.
6) Success response JSON:
```json
{ "ok": true, "data": { "public": { "missingHandlers": [], "missingSpecs": [], "extraHandlers": [], "implementedCount": 0, "sotCount": 0 }, "client": { "missingHandlers": [], "missingSpecs": [], "extraHandlers": [], "implementedCount": 0, "sotCount": 0 }, "admin": { "missingHandlers": [], "missingSpecs": [], "extraHandlers": [], "implementedCount": 0, "sotCount": 0 }, "hasErrors": false }, "meta": { "requestId": "uuid", "serverTime": "iso" } }
```
7) Error cases: `UNAUTHENTICATED`, `FORBIDDEN`, `RBAC_POLICY_MISSING`, `INTERNAL`.
8) DB tables touched: `admin_users`, `admin_roles` (RBAC only).

## adminActionsList
1) Gateway: `admin`
2) Envelope:
- action: `adminActionsList`
- storeId: optional.
3) Request payload JSON: `null`
4) Validation rules: payload optional.
5) Execution steps:
1. Require auth + RBAC pass.
2. Return static admin implemented action list + SOT count.
6) Success response JSON:
```json
{ "ok": true, "data": { "gateway": "admin", "implementedActions": ["..."], "sotActionsCount": 0 }, "meta": { "requestId": "uuid", "serverTime": "iso" } }
```
7) Error cases: `UNAUTHENTICATED`, `FORBIDDEN`, `RBAC_POLICY_MISSING`, `INTERNAL`.
8) DB tables touched: `admin_users`, `admin_roles`.

## adminMe
1) Gateway: `admin`
2) Envelope:
- action: `adminMe`
- storeId: optional.
3) Request payload JSON: `null`
4) Validation rules: payload optional.
5) Execution steps:
1. Require auth + RBAC pass.
2. DB read admin user row + admin roles rows.
3. Return status and roles.
6) Success response JSON:
```json
{ "ok": true, "data": { "uid": "firebaseUid", "status": "active", "roles": ["ops"] }, "meta": { "requestId": "uuid", "serverTime": "iso" } }
```
7) Error cases: `UNAUTHENTICATED`, `FORBIDDEN`, `RBAC_POLICY_MISSING`, `INTERNAL`.
8) DB tables touched: `admin_users`, `admin_roles`.

## adminMediaCreateUploadSpec
1) Gateway: `admin`
2) Envelope:
- action: `adminMediaCreateUploadSpec`
- storeId: optional; if present path uses `stores/{storeId}/...`.
3) Request payload JSON: same as `mediaCreateUploadSpec`.
4) Validation rules: same as client create.
5) Execution steps:
1. Require auth + RBAC pass.
2. Validate payload fields.
3. DB transaction insert into `media_assets` with status `created`.
4. Generate v4 signed PUT URL.
5. Return upload spec.
6) Success response JSON: same shape as client create, finalize hint action `adminMediaFinalizeUpload`.
7) Error cases: `UNAUTHENTICATED`, `FORBIDDEN`, `VALIDATION_ERROR`, `CONFIG_ERROR`, `INTERNAL`.
8) DB tables touched: `admin_users`, `admin_roles`, `media_assets`.

## adminMediaFinalizeUpload
1) Gateway: `admin`
2) Envelope:
- action: `adminMediaFinalizeUpload`
- storeId: optional; if provided or asset has storeId then store access check is enforced.
3) Request payload JSON:
```json
{ "assetId": "uuid" }
```
4) Validation rules: `assetId` required UUID v4/v5.
5) Execution steps:
1. Require auth + RBAC pass.
2. Load asset by id.
3. If effective store exists, verify admin has row in `admin_store_access`.
4. Read Storage object metadata.
5. Validate content type and max size constraints.
6. DB transaction update status and metadata fields.
7. Return asset payload.
6) Success response JSON: same asset response shape as client finalize.
7) Error cases:
- `UNAUTHENTICATED`, `FORBIDDEN`, `VALIDATION_ERROR`, `NOT_FOUND`, `RBAC_POLICY_MISSING`, `INTERNAL`.
8) DB tables touched: `admin_users`, `admin_roles`, `admin_store_access`, `media_assets`.

## storageThumbnails_onFinalize
1) Gateway: `trigger`
2) Envelope:
- Not callable; Storage finalize event only.
3) Request payload JSON:
- Event object from Firebase Storage containing `name`, `bucket`, `contentType`.
4) Validation rules:
- Ignore missing `name`/`bucket`, thumb paths, and non-image content types.
5) Execution steps:
1. Locate media row by `originalPath = object.name`.
2. If absent, log and exit.
3. Download original file.
4. Generate jpeg thumbnail (max 512px, quality 80) using sharp.
5. Upload to `thumb/{originalPath}`.
6. DB transaction update `thumbnailPath` and status `ready`.
7. On any error, DB transaction set status `failed`.
6) Success response JSON:
- None (background trigger).
7) Error cases:
- Non-fatal internal failures are logged; asset status set to `failed` when matched asset exists.
8) DB tables touched:
- `media_assets`.
