# Phase-2 Accounts & Stores Contracts

Unified protocol:
- Request `{ action, storeId?, payload?, meta? }`
- Success `{ ok:true, data:any, meta:{requestId,serverTime} }`
- Error `{ ok:false, error:{code,message,details?}, meta:{requestId,serverTime} }`

## CLIENT

### authEnsureUserProfile
- Gateway: client
- Envelope: action=`authEnsureUserProfile`, storeId optional/ignored
- Payload: `null`
- Validation: no payload
- Steps: require auth uid; read `user_profiles`; if missing create profile(status active) in transaction; return profile
- Tables: `user_profiles`
- Success: `{"ok":true,"data":{"profile":{...}},"meta":{...}}`
- Errors: `UNAUTHENTICATED`, `VALIDATION_ERROR`, `INTERNAL`

### profileGet
- Gateway: client
- Envelope: action=`profileGet`, storeId optional/ignored
- Payload: `null`
- Validation: none
- Steps: require auth; read own profile by uid; return
- Tables: `user_profiles`
- Success: `{"ok":true,"data":{"profile":{...}},"meta":{...}}`
- Errors: `UNAUTHENTICATED`,`NOT_FOUND`,`VALIDATION_ERROR`,`INTERNAL`

### profileUpdate
- Gateway: client
- Envelope: action=`profileUpdate`, storeId optional
- Payload example: `{"phone":"...","email":"...","displayName":"...","locale":"en","marketingOptIn":true}`
- Validation: string lengths + boolean
- Steps: require auth; load own profile; if status!=active => ACCOUNT_DISABLED; transaction update allowed fields; return fresh profile
- Tables: `user_profiles`
- Success: `{"ok":true,"data":{"profile":{...}},"meta":{...}}`
- Errors: `UNAUTHENTICATED`,`ACCOUNT_DISABLED`,`NOT_FOUND`,`VALIDATION_ERROR`,`INTERNAL`

### accountDeleteRequest
- Gateway: client
- Envelope: action=`accountDeleteRequest`, storeId optional
- Payload: `{"reason":"optional"}`
- Validation: reason<=500
- Steps: require auth; ensure profile exists; read pending/approved request; if exists return idempotent; else transaction insert pending request and set profile.status=deleted_pending
- Tables: `user_profiles`,`user_account_delete_requests`
- Success: `{"ok":true,"data":{"request":{...},"idempotent":false},"meta":{...}}`
- Errors: `UNAUTHENTICATED`,`NOT_FOUND`,`VALIDATION_ERROR`,`INTERNAL`

### addressesList
- Gateway: client
- Envelope: action=`addressesList`
- Payload: `null`
- Validation: none
- Steps: require auth; read by uid ordered by updatedAt desc
- Tables: `user_addresses`
- Success: `{"ok":true,"data":{"addresses":[...]},"meta":{...}}`
- Errors: `UNAUTHENTICATED`,`VALIDATION_ERROR`,`INTERNAL`

### addressesCreate
- Gateway: client
- Envelope: action=`addressesCreate`
- Payload: full address fields (`label`,`recipientName`,`governorate`,`city`,`street`,`lat`,`lng`, optional contact/location fields, `isDefault`)
- Validation: required fields + max lengths + numeric lat/lng
- Steps: require auth; ensure profile active; transaction unset existing defaults if needed; insert row with uid and uuid id
- Tables: `user_profiles`,`user_addresses`
- Success: `{"ok":true,"data":{"address":{...}},"meta":{...}}`
- Errors: `UNAUTHENTICATED`,`ACCOUNT_DISABLED`,`VALIDATION_ERROR`,`INTERNAL`

### addressesUpdate
- Gateway: client
- Envelope: action=`addressesUpdate`
- Payload: `{"id":"uuid", ...addressFields }`
- Validation: id uuid + address fields
- Steps: require auth; profile active; ensure address belongs to uid; transaction optionally reset default + update row
- Tables: `user_profiles`,`user_addresses`
- Success: `{"ok":true,"data":{"address":{...}},"meta":{...}}`
- Errors: `UNAUTHENTICATED`,`ACCOUNT_DISABLED`,`NOT_FOUND`,`VALIDATION_ERROR`,`INTERNAL`

### addressesDelete
- Gateway: client
- Envelope: action=`addressesDelete`
- Payload: `{"id":"uuid"}`
- Validation: id uuid
- Steps: require auth; profile active; transaction delete own address
- Tables: `user_profiles`,`user_addresses`
- Success: `{"ok":true,"data":{"deleted":true},"meta":{...}}`
- Errors: `UNAUTHENTICATED`,`ACCOUNT_DISABLED`,`NOT_FOUND`,`VALIDATION_ERROR`,`INTERNAL`

### addressesSetDefault
- Gateway: client
- Envelope: action=`addressesSetDefault`
- Payload: `{"id":"uuid"}`
- Validation: id uuid
- Steps: require auth; profile active; ensure ownership; transaction clear all defaults then set target default
- Tables: `user_profiles`,`user_addresses`
- Success: `{"ok":true,"data":{"defaultAddressId":"uuid"},"meta":{...}}`
- Errors: `UNAUTHENTICATED`,`ACCOUNT_DISABLED`,`NOT_FOUND`,`VALIDATION_ERROR`,`INTERNAL`

### storesList
- Gateway: client
- Envelope: action=`storesList`
- Payload: `null`
- Validation: none
- Steps: require auth; list stores where status=active
- Tables: `stores`
- Success: `{"ok":true,"data":{"stores":[...]},"meta":{...}}`
- Errors: `UNAUTHENTICATED`,`VALIDATION_ERROR`,`INTERNAL`

### storesGet
- Gateway: client
- Envelope: action=`storesGet`
- Payload: `{"storeId":"..."}`
- Validation: storeId required string
- Steps: require auth; fetch active store by id
- Tables: `stores`
- Success: `{"ok":true,"data":{"store":{...}},"meta":{...}}`
- Errors: `UNAUTHENTICATED`,`NOT_FOUND`,`VALIDATION_ERROR`,`INTERNAL`

### storeContextGetMyStore
- Gateway: client
- Envelope: action=`storeContextGetMyStore`
- Payload: null
- Validation: none
- Steps: require auth; read user_store_context by uid
- Tables: `user_store_context`
- Success: `{"ok":true,"data":{"context":{...}|null},"meta":{...}}`
- Errors: `UNAUTHENTICATED`,`VALIDATION_ERROR`,`INTERNAL`

### storeContextSetMyStore
- Gateway: client
- Envelope: action=`storeContextSetMyStore`
- Payload: `{"storeId":"..."}`
- Validation: storeId required
- Steps: require auth; validate store active; transaction upsert user_store_context(uid,storeId)
- Tables: `stores`,`user_store_context`
- Success: `{"ok":true,"data":{"context":{...}},"meta":{...}}`
- Errors: `UNAUTHENTICATED`,`VALIDATION_ERROR`,`INTERNAL`

## ADMIN

### adminStoresList
- Gateway: admin
- Envelope: action=`adminStoresList`, storeId optional
- Payload: null
- Validation: none
- Steps: require auth; RBAC module stores; list stores
- Tables: `admin_users`,`admin_roles`,`stores`
- Success: `{"ok":true,"data":{"stores":[...]},"meta":{...}}`
- Errors: `UNAUTHENTICATED`,`FORBIDDEN`,`RBAC_POLICY_MISSING`,`VALIDATION_ERROR`,`INTERNAL`

### adminStoresGet
- Gateway: admin
- Envelope: action=`adminStoresGet`, storeId required for RBAC store access
- Payload: `{"storeId":"..."}`
- Validation: storeId required
- Steps: auth+RBAC; fetch store by id
- Tables: `admin_users`,`admin_roles`,`admin_store_access`,`stores`
- Success: `{"ok":true,"data":{"store":{...}},"meta":{...}}`
- Errors: `UNAUTHENTICATED`,`FORBIDDEN`,`NOT_FOUND`,`VALIDATION_ERROR`,`INTERNAL`

### adminStoresCreate
- Gateway: admin
- Envelope: action=`adminStoresCreate`
- Payload: `{"storeId":"...","name":"...", "currency":"USD", "taxMode":"exclusive" ...}`
- Validation: required id/name + optional settings
- Steps: auth+RBAC; ensure store not exists; transaction insert stores + store_settings
- Tables: `admin_users`,`admin_roles`,`stores`,`store_settings`
- Success: `{"ok":true,"data":{"store":{...}},"meta":{...}}`
- Errors: `UNAUTHENTICATED`,`FORBIDDEN`,`CONFLICT`,`VALIDATION_ERROR`,`INTERNAL`

### adminStoresUpdate
- Gateway: admin
- Envelope: action=`adminStoresUpdate`, storeId required for RBAC
- Payload: `{"storeId":"...","name":"...","status":"active"}`
- Validation: storeId/name required
- Steps: auth+RBAC; transaction update store
- Tables: `admin_users`,`admin_roles`,`admin_store_access`,`stores`
- Success: `{"ok":true,"data":{"store":{...}},"meta":{...}}`
- Errors: `UNAUTHENTICATED`,`FORBIDDEN`,`NOT_FOUND`,`VALIDATION_ERROR`,`INTERNAL`

### adminStoresDisable
- Gateway: admin
- Envelope: action=`adminStoresDisable`, storeId required for RBAC
- Payload: `{"storeId":"...","reason":"..."}`
- Validation: storeId required
- Steps: auth+RBAC; transaction set store disabled + reason + actor
- Tables: `admin_users`,`admin_roles`,`admin_store_access`,`stores`
- Success: `{"ok":true,"data":{"store":{...}},"meta":{...}}`
- Errors: `UNAUTHENTICATED`,`FORBIDDEN`,`NOT_FOUND`,`VALIDATION_ERROR`,`INTERNAL`

### adminStoreSettingsGet
- Gateway: admin
- Envelope: action=`adminStoreSettingsGet`, storeId required for RBAC
- Payload: `{"storeId":"..."}`
- Validation: storeId required
- Steps: auth+RBAC; read settings
- Tables: `admin_users`,`admin_roles`,`admin_store_access`,`store_settings`
- Success: `{"ok":true,"data":{"settings":{...}},"meta":{...}}`
- Errors: `UNAUTHENTICATED`,`FORBIDDEN`,`NOT_FOUND`,`VALIDATION_ERROR`,`INTERNAL`

### adminStoreSettingsUpdate
- Gateway: admin
- Envelope: action=`adminStoreSettingsUpdate`, storeId required for RBAC
- Payload: `{"storeId":"...","currency":"USD","taxMode":"exclusive","supportWhatsApp":"...","supportEmail":"...","pickupEnabled":true,"deliveryEnabled":true}`
- Validation: all fields typed and required except contact optional
- Steps: auth+RBAC; transaction upsert settings by storeId
- Tables: `admin_users`,`admin_roles`,`admin_store_access`,`store_settings`
- Success: `{"ok":true,"data":{"settings":{...}},"meta":{...}}`
- Errors: `UNAUTHENTICATED`,`FORBIDDEN`,`VALIDATION_ERROR`,`INTERNAL`

### adminCustomersList
- Gateway: admin
- Envelope: action=`adminCustomersList`
- Payload: `{"limit":20,"offset":0}`
- Validation: limit 1..100, offset>=0
- Steps: auth+RBAC module customers; list user_profiles paginated
- Tables: `admin_users`,`admin_roles`,`user_profiles`
- Success: `{"ok":true,"data":{"customers":[...],"limit":20,"offset":0},"meta":{...}}`
- Errors: `UNAUTHENTICATED`,`FORBIDDEN`,`VALIDATION_ERROR`,`INTERNAL`

### adminCustomersGet
- Gateway: admin
- Envelope: action=`adminCustomersGet`
- Payload: `{"uid":"..."}`
- Validation: uid required
- Steps: auth+RBAC; get profile by uid
- Tables: `admin_users`,`admin_roles`,`user_profiles`
- Success: `{"ok":true,"data":{"customer":{...}},"meta":{...}}`
- Errors: `UNAUTHENTICATED`,`FORBIDDEN`,`NOT_FOUND`,`VALIDATION_ERROR`,`INTERNAL`

### adminCustomersUpdate
- Gateway: admin
- Envelope: action=`adminCustomersUpdate`
- Payload: `{"uid":"...","email":"...","displayName":"..."...}`
- Validation: uid required + optional profile fields
- Steps: auth+RBAC; transaction update profile
- Tables: `admin_users`,`admin_roles`,`user_profiles`
- Success: `{"ok":true,"data":{"customer":{...}},"meta":{...}}`
- Errors: `UNAUTHENTICATED`,`FORBIDDEN`,`NOT_FOUND`,`VALIDATION_ERROR`,`INTERNAL`

### adminCustomersDisable
- Gateway: admin
- Envelope: action=`adminCustomersDisable`
- Payload: `{"uid":"...","reason":"..."}`
- Validation: uid required
- Steps: auth+RBAC; transaction set customer status disabled with metadata
- Tables: `admin_users`,`admin_roles`,`user_profiles`
- Success: `{"ok":true,"data":{"customer":{...}},"meta":{...}}`
- Errors: `UNAUTHENTICATED`,`FORBIDDEN`,`NOT_FOUND`,`VALIDATION_ERROR`,`INTERNAL`

### adminCustomersSearch
- Gateway: admin
- Envelope: action=`adminCustomersSearch`
- Payload: `{"query":"text","limit":20}`
- Validation: optional query and bounded limit
- Steps: auth+RBAC; run LIKE search on uid/email/phone/displayName
- Tables: `admin_users`,`admin_roles`,`user_profiles`
- Success: `{"ok":true,"data":{"customers":[...]},"meta":{...}}`
- Errors: `UNAUTHENTICATED`,`FORBIDDEN`,`VALIDATION_ERROR`,`INTERNAL`
