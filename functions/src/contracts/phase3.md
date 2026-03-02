# Phase-3 Catalog/Home/SEO Contracts

Pagination strategy for list/search endpoints: offset pagination using payload `{ limit, offset }`, default `limit=20`, max `100`, `offset>=0`.

Unified protocol:
- Request `{ action, storeId?, payload?, meta? }`
- Success `{ ok:true, data:any, meta:{requestId,serverTime} }`
- Error `{ ok:false, error:{code,message,details?}, meta:{requestId,serverTime} }`

## PUBLIC ACTIONS

### publicCatalogGetHome
- Gateway public. `storeId` required (store-scoped catalog).
- Payload `{ limit?, offset? }`; Joi integer bounds.
- Steps: validate; read active store products for home blocks; return sections+pagination.
- DB: `products`.
- Success: `{ ok:true, data:{ sections:[...], pagination:{limit,offset} }, meta }`.
- Errors: `VALIDATION_ERROR`, `INTERNAL`.

### publicCatalogGetCategories
- Gateway public. `storeId` required.
- Payload `null`.
- Steps: read active categories by store sorted by sortOrder.
- DB: `categories`.
- Success: `{ ok:true, data:{ categories:[...] }, meta }`.
- Errors: `VALIDATION_ERROR`, `INTERNAL`.

### publicCatalogListProducts
- Gateway public. `storeId` required.
- Payload `{ categoryId?, limit?, offset? }`.
- Steps: build filters; list active products by store/category with pagination.
- DB: `products`.
- Success: `{ ok:true, data:{ products:[...], pagination:{...} }, meta }`.
- Errors: `VALIDATION_ERROR`, `INTERNAL`.

### publicCatalogSearchProducts
- Gateway public. `storeId` required.
- Payload `{ query?, limit?, offset? }`.
- Steps: SQL LIKE search by name/slug in active store products.
- DB: `products`.
- Success: `{ ok:true, data:{ products:[...], pagination:{...} }, meta }`.
- Errors: `VALIDATION_ERROR`, `INTERNAL`.

### publicCatalogGetFilters
- Gateway public. `storeId` required.
- Payload `null`.
- Steps: read active categories as filter set.
- DB: `categories`.
- Success: `{ ok:true, data:{ filters:{ categories:[...] } }, meta }`.
- Errors: `VALIDATION_ERROR`, `INTERNAL`.

### publicProductGetById
- Gateway public. `storeId` required.
- Payload `{ productId }`.
- Steps: read product + variants; return nullable product.
- DB: `products`, `product_variants`.
- Success: `{ ok:true, data:{ product, variants:[...] }, meta }`.
- Errors: `VALIDATION_ERROR`, `INTERNAL`.

### publicProductGetBySlug
- Gateway public. `storeId` required.
- Payload `{ slug }`.
- Steps: read product by slug + variants.
- DB: `products`, `product_variants`.
- Success same shape as byId.
- Errors: `VALIDATION_ERROR`, `INTERNAL`.

### publicCategoryGetById
- Gateway public. `storeId` required.
- Payload `{ categoryId }`.
- Steps: read active category.
- DB: `categories`.
- Success: `{ ok:true, data:{ category }, meta }`.
- Errors: `VALIDATION_ERROR`, `INTERNAL`.

### publicCategoryGetBySlug
- Gateway public. `storeId` required.
- Payload `{ slug }`.
- Steps: read active category.
- DB: `categories`.
- Success: `{ ok:true, data:{ category }, meta }`.
- Errors: `VALIDATION_ERROR`, `INTERNAL`.

### publicSeoGetPageMeta
- Gateway public. `storeId` required.
- Payload `{ pageType, pageKey }`.
- Steps: read seo row by unique key.
- DB: `seo_settings`.
- Success: `{ ok:true, data:{ meta }, meta }`.
- Errors: `VALIDATION_ERROR`, `INTERNAL`.

### publicSeoGetLanding
- Gateway public. `storeId` required.
- Payload `{ slug }`.
- Steps: read published landing page by slug.
- DB: `landing_pages`.
- Success: `{ ok:true, data:{ landing }, meta }`.
- Errors: `VALIDATION_ERROR`, `INTERNAL`.

## CLIENT ACTIONS
### homeGetLayout
- client; `storeId` required.
- Payload null; Joi none.
- Steps: auth; read enabled home sections ordered.
- DB `home_sections`.
- Success `{ok:true,data:{sections:[...]},meta}`.
- Errors `UNAUTHENTICATED`,`VALIDATION_ERROR`,`INTERNAL`.

### productFavoritesList
- client; storeId optional.
- Payload null.
- Steps: auth; list favorites by uid.
- DB `user_product_favorites`.
- Success `{ok:true,data:{favorites:[...]},meta}`.
- Errors `UNAUTHENTICATED`,`VALIDATION_ERROR`,`INTERNAL`.

### productFavoritesToggle
- client.
- Payload `{ productId }`.
- Steps: auth; if exists delete else insert inside transaction.
- DB `user_product_favorites`.
- Success `{ok:true,data:{favorited:boolean},meta}`.
- Errors `UNAUTHENTICATED`,`VALIDATION_ERROR`,`INTERNAL`.

### storeFavoritesList
- client.
- Payload null.
- Steps: auth; list store favorites by uid.
- DB `user_store_favorites`.
- Success `{ok:true,data:{favorites:[...]},meta}`.
- Errors `UNAUTHENTICATED`,`VALIDATION_ERROR`,`INTERNAL`.

### storeFavoritesToggle
- client.
- Payload `{ storeId }`.
- Steps: auth; toggle favorite transactionally.
- DB `user_store_favorites`.
- Success `{ok:true,data:{favorited:boolean},meta}`.
- Errors `UNAUTHENTICATED`,`VALIDATION_ERROR`,`INTERNAL`.

## ADMIN ACTIONS
(For all admin actions: auth required + RBAC check before handler. Store-scoped actions require `storeId` via envelope or payload.)

### adminCategoriesList/Get/Create/Update/Disable
- Payloads: list `{storeId}`; get/disable `{id}`; create `{storeId,name,slug,parentId?,sortOrder?,status?}`; update `{id,...fields}`.
- Steps: validate; read/write categories using transaction on writes.
- DB `categories`.
- Success: list/get/category object wrappers.
- Errors: `UNAUTHENTICATED`,`FORBIDDEN`,`VALIDATION_ERROR`,`NOT_FOUND`,`INTERNAL`.

### adminBannersList/Get/Create/Update/Disable
- Payloads similar by store/id with create/update banner fields incl `mediaAssetId`.
- Steps: validate; CRUD banners; writes in transactions.
- DB `banners`.
- Errors as above.

### adminFeaturedList / adminFeaturedSearchProducts / adminFeaturedSet
- Payloads: list `{storeId}`; search `{storeId,query?,limit?}`; set `{storeId,productIds[]}`.
- Steps: list featured, product search, and transactional replace of featured items.
- DB `featured_items`,`products`.
- Errors: standard admin validation/auth/RBAC/internal.

### adminProductsList/Get/Create/Update/Disable
- Payloads: list `{storeId}`; get/disable `{id}`; create `{storeId,categoryId,name,slug,description?,status?}`; update `{id,...}`.
- Steps: product CRUD with transaction writes.
- DB `products`.
- Errors include `NOT_FOUND` for get/update/disable.

### adminProductImagesList/Add/Remove/Reorder
- Payloads: list `{productId}`; add `{productId,mediaAssetId,sortOrder?}`; remove `{id}`; reorder `{productId,items[]}`.
- Steps: read images; transactional insert/delete/reorder updates.
- DB `product_images`.
- Errors: standard.

### adminProductSpecsList/Create/Update/Delete
- Payloads: list `{productId}`; create `{productId,specKey,specValue,sortOrder?}`; update `{id,productId,...}`; delete `{id}`.
- Steps: CRUD with transaction writes.
- DB `product_specs`.
- Errors: standard.

### adminProductVariantsList/Create/Update/Delete
- Payloads: list `{productId}`; create/update variant fields (`sku,priceCents,stockQty,attributes,status`); delete `{id}`.
- Steps: CRUD with transactions.
- DB `product_variants`.
- Errors: standard.

### adminProductVariantsBulkStockUpdate
- Payload `{ items:[{id,stockQty}] }`.
- Steps: transaction loop updates variant stock.
- DB `product_variants`.
- Success `{ok:true,data:{updated:number},meta}`.
- Errors: standard.

### adminInventoryAdjust / adminInventoryHistory / adminInventoryLowStockReport
- Payloads: adjust `{variantId,deltaQty,reason?}`; history `{variantId}`; low stock `{storeId,threshold?}`.
- Steps: adjust transaction updates variant and inserts adjustment log; history reads by variant; low-stock query joins variants/products.
- DB `product_variants`,`inventory_adjustments`,`products`.
- Errors: standard.

### adminHomeSectionsList/Get/Create/Update/Disable/Reorder
- Payloads by store/id; create/update include `{type,config,sortOrder,enabled}`; reorder `{storeId,items[]}`.
- Steps: CRUD and transactional reorder.
- DB `home_sections`.
- Errors: standard.

### adminSeoGet / adminSeoUpdate
- Payloads: get `{storeId,pageType,pageKey}`; update `{id?,storeId,pageType,pageKey,title?,description?,extra?}`.
- Steps: read or transactional upsert.
- DB `seo_settings`.
- Errors: standard.

### adminLandingPagesList/Get/Create/Update/Publish/Unpublish/Disable
- Payloads by store/id; create `{storeId,slug,title,body}`; update `{id,...}`; publish/unpublish/disable `{id}`.
- Steps: CRUD + status transitions inside transactions.
- DB `landing_pages`.
- Errors: standard.

### adminSitemapRegenerate
- Payload `{storeId}`.
- Steps: count active products and insert sitemap run row transactionally.
- DB `products`,`sitemap_runs`.
- Success `{ok:true,data:{run:{...}},meta}`.
- Errors: standard.
