import { EntityManager } from 'typeorm';
import { ActionContext } from '../../core/protocol';
import { AdminUser } from '../../entities/AdminUser';
import { AdminRole } from '../../entities/AdminRole';
import { AdminStoreAccess } from '../../entities/AdminStoreAccess';
import { MediaAsset } from '../../entities/MediaAsset';
import { AppError } from '../../core/errors';
import { getBucketName, getStorage } from '../../utils/storage';
import { v4 as uuidv4 } from 'uuid';
import { Store } from '../../entities/Store';
import { StoreSettings } from '../../entities/StoreSettings';
import { UserProfile } from '../../entities/UserProfile';
import { adminHealthActionsCoverage as adminHealthActionsCoverageCore, actionsListForGateway } from '../../health/actionsHealth';
import { ACTION_ROLE_MAP } from '../../rbac/adminRbac';
import { normalizeListQueryInput } from '../../utils/queryNormalization';


type AdminModuleDescriptor = {
  key: string;
  label: string;
  icon: string;
  actionNames: readonly string[];
};

const ADMIN_MODULES: readonly AdminModuleDescriptor[] = [
  { key: 'stores', label: 'Stores', icon: 'store', actionNames: ['adminStoresList','adminStoresGet','adminStoresCreate','adminStoresUpdate','adminStoresDisable'] },
  { key: 'storeSettings', label: 'Store Settings', icon: 'settings', actionNames: ['adminStoreSettingsGet','adminStoreSettingsUpdate'] },
  { key: 'customers', label: 'Customers', icon: 'people', actionNames: ['adminCustomersList','adminCustomersGet','adminCustomersUpdate','adminCustomersDisable','adminCustomersSearch'] },
  { key: 'categories', label: 'Categories', icon: 'category', actionNames: ['adminCategoriesList','adminCategoriesGet','adminCategoriesCreate','adminCategoriesUpdate','adminCategoriesDisable'] },
  { key: 'banners', label: 'Banners', icon: 'image', actionNames: ['adminBannersList','adminBannersGet','adminBannersCreate','adminBannersUpdate','adminBannersDisable'] },
  { key: 'featuredProducts', label: 'Featured Products', icon: 'star', actionNames: ['adminFeaturedList','adminFeaturedSearchProducts','adminFeaturedSet'] },
  { key: 'products', label: 'Products', icon: 'inventory_2', actionNames: ['adminProductsList','adminProductsGet','adminProductsCreate','adminProductsUpdate','adminProductsDisable'] },
  { key: 'productImages', label: 'Product Images', icon: 'collections', actionNames: ['adminProductImagesList','adminProductImagesAdd','adminProductImagesRemove','adminProductImagesReorder'] },
  { key: 'productSpecs', label: 'Product Specs', icon: 'fact_check', actionNames: ['adminProductSpecsList','adminProductSpecsCreate','adminProductSpecsUpdate','adminProductSpecsDelete'] },
  { key: 'productVariants', label: 'Product Variants', icon: 'view_module', actionNames: ['adminProductVariantsList','adminProductVariantsCreate','adminProductVariantsUpdate','adminProductVariantsDelete','adminProductVariantsBulkStockUpdate'] },
  { key: 'inventory', label: 'Inventory', icon: 'inventory', actionNames: ['adminInventoryAdjust','adminInventoryHistory','adminInventoryLowStockReport','adminInventoryImportCreateBatch','adminInventoryImportPreview','adminInventoryImportGetUnmappedPrefixes','adminInventoryImportResolvePrefixes','adminInventoryImportApply','adminInventoryImportGet'] },
  { key: 'orders', label: 'Orders', icon: 'shopping_bag', actionNames: ['adminOrdersList','adminOrdersGet','adminOrdersUpdateStatus','adminOrdersSetTracking','adminOrdersAddInternalNote','adminOrdersInvoiceUrl','adminOrdersTrackingGet','adminOrdersTrackingAddEvent','adminOrdersTrackingDeleteEvent','adminOrdersTrackingUpdateShipment'] },
  { key: 'shippingMethods', label: 'Shipping Methods', icon: 'local_shipping', actionNames: ['adminShippingMethodsList','adminShippingMethodsGet','adminShippingMethodsCreate','adminShippingMethodsUpdate','adminShippingMethodsDisable'] },
  { key: 'deliveryZones', label: 'Delivery Zones', icon: 'map', actionNames: ['adminDeliveryZonesList','adminDeliveryZonesGet','adminDeliveryZonesCreate','adminDeliveryZonesUpdate','adminDeliveryZonesDisable'] },
  { key: 'coupons', label: 'Coupons', icon: 'confirmation_number', actionNames: ['adminCouponsList','adminCouponsGet','adminCouponsCreate','adminCouponsUpdate','adminCouponsDisable'] },
  { key: 'cashback', label: 'Cashback', icon: 'payments', actionNames: ['adminCashbackList','adminCashbackGet','adminCashbackCreate','adminCashbackUpdate','adminCashbackDisable'] },
  { key: 'discounts', label: 'Discounts', icon: 'sell', actionNames: ['adminDiscountsList','adminDiscountsGet','adminDiscountsCreate','adminDiscountsUpdate','adminDiscountsDisable','adminDiscountsPreviewAudienceCount'] },
  { key: 'notifications', label: 'Notifications', icon: 'notifications', actionNames: ['adminNotificationsSend','adminNotificationsList'] },
  { key: 'loyaltySettings', label: 'Loyalty Settings', icon: 'tune', actionNames: ['adminLoyaltyGetSettings','adminLoyaltyUpdateSettings','adminLoyaltyAdjustUserPoints'] },
  { key: 'loyaltyTiers', label: 'Loyalty Tiers', icon: 'military_tech', actionNames: ['adminLoyaltyTiersList','adminLoyaltyTiersCreate','adminLoyaltyTiersUpdate','adminLoyaltyTiersDisable'] },
  { key: 'reports', label: 'Reports', icon: 'analytics', actionNames: ['reportsOverview','reportsTopProducts','reportsOrdersByStatus','reportsInventorySummary','reportsCustomersSummary','reportsReturnsSummary','reportsLoyaltySummary','reportsCashbackSummary','adminReportsAttributionOverview','adminReportsTopCampaigns'] },
  { key: 'seo', label: 'SEO', icon: 'travel_explore', actionNames: ['adminSeoGet','adminSeoUpdate','adminSitemapRegenerate'] },
  { key: 'landingPages', label: 'Landing Pages', icon: 'web', actionNames: ['adminLandingPagesList','adminLandingPagesGet','adminLandingPagesCreate','adminLandingPagesUpdate','adminLandingPagesPublish','adminLandingPagesUnpublish','adminLandingPagesDisable'] },
  { key: 'riskRules', label: 'Risk Rules', icon: 'gavel', actionNames: ['adminRiskRulesGet','adminRiskRulesUpdate'] },
  { key: 'flaggedOrders', label: 'Flagged Orders', icon: 'warning', actionNames: ['adminRiskFlaggedOrdersList','adminRiskFlaggedOrdersResolve'] },
  { key: 'returns', label: 'Returns', icon: 'assignment_return', actionNames: ['adminReturnsList','adminReturnsGet','adminReturnsApprove','adminReturnsReject','adminReturnsRefundPartial','adminReturnsRefundFull','adminReturnsUpdateStatus'] },
  { key: 'insurance', label: 'Insurance', icon: 'health_and_safety', actionNames: ['adminInsuranceList','adminInsuranceGet','adminInsuranceAddItem','adminInsuranceUpdateItem','adminInsuranceRemoveItem','adminInsuranceLockQuote','adminInsuranceSendQuote','adminInsuranceSetShipmentTracking'] },
  { key: 'branches', label: 'Branches', icon: 'account_tree', actionNames: ['adminBranchesList','adminBranchesCreate','adminBranchesUpdate','adminBranchesDisable'] },
  { key: 'devices', label: 'Devices', icon: 'devices', actionNames: ['adminDevicesList','adminDevicesCreate','adminDevicesUpdate','adminDevicesDisable'] },
  { key: 'employees', label: 'Employees', icon: 'badge', actionNames: ['adminEmployeesList','adminEmployeesCreate','adminEmployeesUpdate','adminEmployeesDisable'] },
  { key: 'drawers', label: 'Drawers', icon: 'point_of_sale', actionNames: ['adminDrawersList','adminDrawersCreate','adminDrawersUpdate','adminDrawersDisable'] },
  { key: 'drawerSessions', label: 'Drawer Sessions', icon: 'receipt_long', actionNames: ['adminDrawerSessionsOpen','adminDrawerSessionsClose'] },
  { key: 'accountingKpis', label: 'Accounting KPIs', icon: 'query_stats', actionNames: ['adminAccountingKpis'] },
  { key: 'accountingLedger', label: 'Accounting Ledger', icon: 'menu_book', actionNames: ['adminAccountingLedger'] },
  { key: 'homeBuilder', label: 'Home Builder', icon: 'home', actionNames: ['adminHomeSectionsList','adminHomeSectionsGet','adminHomeSectionsCreate','adminHomeSectionsUpdate','adminHomeSectionsDisable','adminHomeSectionsReorder'] },
  { key: 'dineInSettings', label: 'Dine-In Settings', icon: 'settings_suggest', actionNames: ['adminDineInSettingsGet','adminDineInSettingsUpdate'] },
  { key: 'dineInTables', label: 'Dine-In Tables', icon: 'table_restaurant', actionNames: ['adminDineInTablesList','adminDineInTablesGet','adminDineInTablesCreate','adminDineInTablesUpdate','adminDineInTablesDisable','adminDineInTablesGenerateQr','adminDineInTablesRegenerateQr','adminDineInTablesBulkGeneratePdfData'] },
  { key: 'dineInSessions', label: 'Dine-In Sessions', icon: 'timer', actionNames: ['adminDineInSessionsList','adminDineInSessionsGet','adminDineInSessionsClose'] },
  { key: 'dineInWaiterCalls', label: 'Dine-In Waiter Calls', icon: 'support_agent', actionNames: ['adminDineInWaiterCallsList','adminDineInWaiterCallsGet','adminDineInWaiterCallsAcknowledge','adminDineInWaiterCallsResolve'] },
  { key: 'dineInDashboard', label: 'Dine-In Dashboard', icon: 'dashboard', actionNames: ['adminDineInDashboardStats'] },
  { key: 'liveOrdersBoard', label: 'Live Orders Board', icon: 'view_kanban', actionNames: ['adminOrdersList','adminOrdersGet','adminOrdersUpdateStatus'] },
];

export async function adminHealthWhoAmI(ctx: ActionContext) {
  return { uid: ctx.uid, gateway: ctx.gateway };
}

export async function adminHealthDbCheck(ctx: ActionContext) {
  await ctx.db.query('SELECT 1');
  const names = ['stores', 'admin_users', 'admin_roles', 'admin_store_access', 'user_profiles', 'media_assets'];
  const rows: Array<{ TABLE_NAME: string }> = await ctx.db.query(
    `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME IN (${names.map(() => '?').join(',')})`,
    [process.env.DB_NAME, ...names],
  );
  const found = new Set(rows.map((r) => r.TABLE_NAME));
  const tables = Object.fromEntries(names.map((n) => [n, found.has(n)]));
  return { ping: true, tables };
}

export async function adminHealthActionsCoverage() {
  const coverage = adminHealthActionsCoverageCore();
  return {
    ...coverage,
    hasErrors: [coverage.public, coverage.client, coverage.admin].some((g) => g.extraHandlers.length > 0),
  };
}

export async function adminActionsList(ctx: ActionContext) {
  const actions = actionsListForGateway('admin');
  const allowed = ctx.auth?.admin?.roles?.length
    ? actions.filter((action) => {
        const policy = ACTION_ROLE_MAP[action];
        if (!policy) {
          return false;
        }
        return policy.rolesAllowed.some((role) => ctx.auth!.admin!.roles.includes(role));
      })
    : actions;

  const allowedSet = new Set(allowed);
  const navigation = ADMIN_MODULES.map((module) => {
    const availableActions = module.actionNames.filter((name) => allowedSet.has(name));
    return {
      key: module.key,
      label: module.label,
      icon: module.icon,
      availableActions,
      discoverable: availableActions.length > 0,
    };
  }).filter((module) => module.discoverable);

  const mapped = new Set(ADMIN_MODULES.flatMap((module) => module.actionNames));
  const orphanActions = allowed.filter((action) => !mapped.has(action));

  return {
    gateway: 'admin',
    allowedActions: allowed,
    navigation,
    orphanActions,
  };
}

export async function adminMe(ctx: ActionContext) {
  const user = await ctx.db.getRepository(AdminUser).findOneBy({ uid: ctx.uid! });
  const roles = await ctx.db.getRepository(AdminRole).findBy({ adminUid: ctx.uid! });
  return {
    uid: ctx.uid,
    status: user?.status ?? null,
    roles: roles.map((r: AdminRole) => r.role),
  };
}

export async function adminStoresList(ctx: ActionContext) {
  const stores = await ctx.db.getRepository(Store).find({ order: { updatedAt: 'DESC' as any } });
  return { stores };
}

export async function adminStoresGet(ctx: ActionContext, payload: any) {
  const store = await ctx.db.getRepository(Store).findOneBy({ id: payload.storeId });
  if (!store) throw new AppError('NOT_FOUND', 'Store not found');
  return { store };
}

export async function adminStoresCreate(ctx: ActionContext, payload: any) {
  const existing = await ctx.db.getRepository(Store).findOneBy({ id: payload.storeId });
  if (existing) throw new AppError('CONFLICT', 'Store already exists');
  await ctx.db.transaction(async (tx: EntityManager) => {
    await tx.getRepository(Store).save(tx.getRepository(Store).create({
      id: payload.storeId,
      name: payload.name,
      status: 'active',
      disabledReason: null,
      disabledAt: null,
      disabledByUid: null,
    }));
    await tx.getRepository(StoreSettings).save(tx.getRepository(StoreSettings).create({
      storeId: payload.storeId,
      currency: payload.currency ?? 'USD',
      taxMode: payload.taxMode ?? 'exclusive',
      supportWhatsApp: payload.supportWhatsApp ?? null,
      supportEmail: payload.supportEmail ?? null,
      pickupEnabled: payload.pickupEnabled ?? true,
      deliveryEnabled: payload.deliveryEnabled ?? true,
    }));
  });
  return adminStoresGet(ctx, { storeId: payload.storeId });
}

export async function adminStoresUpdate(ctx: ActionContext, payload: any) {
  await ctx.db.transaction(async (tx: EntityManager) => {
    const res = await tx.getRepository(Store).update({ id: payload.storeId }, { name: payload.name, status: payload.status ?? undefined });
    if (!res.affected) throw new AppError('NOT_FOUND', 'Store not found');
  });
  return adminStoresGet(ctx, { storeId: payload.storeId });
}

export async function adminStoresDisable(ctx: ActionContext, payload: any) {
  await ctx.db.transaction(async (tx: EntityManager) => {
    const res = await tx.getRepository(Store).update({ id: payload.storeId }, {
      status: 'disabled',
      disabledReason: payload.reason ?? null,
      disabledAt: new Date(),
      disabledByUid: ctx.uid!,
    });
    if (!res.affected) throw new AppError('NOT_FOUND', 'Store not found');
  });
  return adminStoresGet(ctx, { storeId: payload.storeId });
}

export async function adminStoreSettingsGet(ctx: ActionContext, payload: any) {
  const settings = await ctx.db.getRepository(StoreSettings).findOneBy({ storeId: payload.storeId });
  if (!settings) throw new AppError('NOT_FOUND', 'Store settings not found');
  return { settings };
}

export async function adminStoreSettingsUpdate(ctx: ActionContext, payload: any) {
  await ctx.db.transaction(async (tx: EntityManager) => {
    await tx.getRepository(StoreSettings).upsert({
      storeId: payload.storeId,
      currency: payload.currency,
      taxMode: payload.taxMode,
      supportWhatsApp: payload.supportWhatsApp ?? null,
      supportEmail: payload.supportEmail ?? null,
      pickupEnabled: payload.pickupEnabled,
      deliveryEnabled: payload.deliveryEnabled,
    }, ['storeId']);
  });
  return adminStoreSettingsGet(ctx, { storeId: payload.storeId });
}

export async function adminCustomersList(ctx: ActionContext, payload: any = {}) {
  const q = normalizeListQueryInput(payload, { defaultPageSize: 20, maxPageSize: 100 });
  const limit = q.limit;
  const offset = q.offset;
  const rows = await ctx.db.getRepository(UserProfile).find({ order: { updatedAt: 'DESC' as any }, take: limit, skip: offset });
  return { customers: rows, limit, offset };
}

export async function adminCustomersGet(ctx: ActionContext, payload: any) {
  const customer = await ctx.db.getRepository(UserProfile).findOneBy({ uid: payload.uid });
  if (!customer) throw new AppError('NOT_FOUND', 'Customer not found');
  return { customer };
}

export async function adminCustomersUpdate(ctx: ActionContext, payload: any) {
  await ctx.db.transaction(async (tx: EntityManager) => {
    const res = await tx.getRepository(UserProfile).update({ uid: payload.uid }, {
      phone: payload.phone ?? null,
      email: payload.email ?? null,
      displayName: payload.displayName ?? null,
      locale: payload.locale ?? null,
      marketingOptIn: payload.marketingOptIn ?? false,
      status: payload.status ?? undefined,
    });
    if (!res.affected) throw new AppError('NOT_FOUND', 'Customer not found');
  });
  return adminCustomersGet(ctx, { uid: payload.uid });
}

export async function adminCustomersDisable(ctx: ActionContext, payload: any) {
  await ctx.db.transaction(async (tx: EntityManager) => {
    const res = await tx.getRepository(UserProfile).update({ uid: payload.uid }, {
      status: 'disabled',
      disabledReason: payload.reason ?? null,
      disabledAt: new Date(),
      disabledByUid: ctx.uid!,
    });
    if (!res.affected) throw new AppError('NOT_FOUND', 'Customer not found');
  });
  return adminCustomersGet(ctx, { uid: payload.uid });
}

export async function adminCustomersSearch(ctx: ActionContext, payload: any = {}) {
  const nq = normalizeListQueryInput(payload, { defaultPageSize: 20, maxPageSize: 100 });
  const q = `%${nq.query || ''}%`;
  const rows = await ctx.db.query(
    'SELECT * FROM user_profiles WHERE uid LIKE ? OR email LIKE ? OR phone LIKE ? OR displayName LIKE ? ORDER BY updatedAt DESC LIMIT ?',
    [q, q, q, q, nq.limit],
  );
  return { customers: rows };
}

export async function adminMediaCreateUploadSpec(ctx: ActionContext, payload: any) {
  const assetId = uuidv4();
  const ext = String(payload.fileExt).replace(/^\./, '').toLowerCase();
  const originalPath = ctx.storeId
    ? `stores/${ctx.storeId}/${payload.ownerType}/${payload.ownerId}/${assetId}.${ext}`
    : `global/${payload.ownerType}/${payload.ownerId}/${assetId}.${ext}`;
  const bucketName = getBucketName();

  await ctx.db.transaction(async (tx: EntityManager) => {
    const asset = tx.getRepository(MediaAsset).create({
      id: assetId,
      storeId: ctx.storeId ?? null,
      ownerType: payload.ownerType,
      ownerId: payload.ownerId,
      kind: payload.kind,
      originalPath,
      thumbnailPath: null,
      contentType: payload.contentType,
      sizeBytes: String(payload.sizeBytes),
      status: 'created',
      createdByUid: ctx.uid!,
    });
    await tx.getRepository(MediaAsset).save(asset);
  });

  const [url] = await getStorage().bucket(bucketName).file(originalPath).getSignedUrl({
    version: 'v4',
    action: 'write',
    expires: Date.now() + 15 * 60 * 1000,
    contentType: payload.contentType,
  });

  return {
    assetId,
    bucket: bucketName,
    originalPath,
    upload: { method: 'PUT', url, headers: { 'Content-Type': payload.contentType } },
    finalizeHint: { action: 'adminMediaFinalizeUpload', assetId },
  };
}

export async function adminMediaFinalizeUpload(ctx: ActionContext, payload: any) {
  const asset = await ctx.db.getRepository(MediaAsset).findOneBy({ id: payload.assetId });
  if (!asset) throw new AppError('NOT_FOUND', 'Asset not found');

  const effectiveStore = ctx.storeId ?? asset.storeId ?? undefined;
  if (effectiveStore) {
    const access = await ctx.db.getRepository(AdminStoreAccess).findOneBy({ adminUid: ctx.uid!, storeId: effectiveStore });
    if (!access) throw new AppError('FORBIDDEN', 'Missing store access for asset store');
  }

  const [metadata] = await getStorage().bucket(getBucketName()).file(asset.originalPath).getMetadata();
  const size = Number(metadata.size || 0);
  if (size > Number(asset.sizeBytes)) {
    throw new AppError('VALIDATION_ERROR', 'Uploaded size exceeds requested size', { requested: asset.sizeBytes, actual: size });
  }
  if (metadata.contentType !== asset.contentType) {
    throw new AppError('VALIDATION_ERROR', 'Uploaded content type mismatch', { requested: asset.contentType, actual: metadata.contentType });
  }

  await ctx.db.transaction(async (tx: EntityManager) => {
    await tx.getRepository(MediaAsset).update(asset.id, {
      contentType: metadata.contentType || asset.contentType,
      sizeBytes: String(size),
      status: asset.kind === 'image' ? 'processing' : 'ready',
    });
  });

  const updated = await ctx.db.getRepository(MediaAsset).findOneByOrFail({ id: asset.id });
  return {
    asset: {
      id: updated.id,
      originalPath: updated.originalPath,
      thumbnailPath: updated.thumbnailPath ?? undefined,
      status: updated.status,
      contentType: updated.contentType,
      sizeBytes: Number(updated.sizeBytes),
      kind: updated.kind,
      ownerType: updated.ownerType,
      ownerId: updated.ownerId,
      storeId: updated.storeId ?? undefined,
    },
  };
}
