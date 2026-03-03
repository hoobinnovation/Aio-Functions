import { AdminUser } from '../../../../../entities/AdminUser';
import { AdminRole } from '../../../../../entities/AdminRole';
import { AdminStoreAccess } from '../../../../../entities/AdminStoreAccess';
import { upsertById } from '../seederUtils';
import { SeedContext, SeedSummary } from '../types';

export async function seedRBAC(ctx: SeedContext, summary: SeedSummary) {
  const { manager, demoUids, storeId } = ctx;

  for (const uid of [demoUids.adminOwnerUid, demoUids.adminCatalogUid, demoUids.adminSupportUid]) {
    await upsertById(manager, AdminUser, 'AdminUser', { uid, status: 'active' }, summary);
  }

  await upsertById(manager, AdminRole, 'AdminRole', { id: 1, adminUid: demoUids.adminOwnerUid, role: 'owner' }, summary);
  await upsertById(manager, AdminRole, 'AdminRole', { id: 2, adminUid: demoUids.adminCatalogUid, role: 'catalog_manager' }, summary);
  await upsertById(manager, AdminRole, 'AdminRole', { id: 3, adminUid: demoUids.adminSupportUid, role: 'support_agent' }, summary);

  await upsertById(manager, AdminStoreAccess, 'AdminStoreAccess', { id: 1, adminUid: demoUids.adminOwnerUid, storeId }, summary);
  await upsertById(manager, AdminStoreAccess, 'AdminStoreAccess', { id: 2, adminUid: demoUids.adminCatalogUid, storeId }, summary);
  await upsertById(manager, AdminStoreAccess, 'AdminStoreAccess', { id: 3, adminUid: demoUids.adminSupportUid, storeId }, summary);
}
