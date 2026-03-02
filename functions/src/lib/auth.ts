import { CallableRequest } from 'firebase-functions/v2/https';
import { getApps, initializeApp } from 'firebase-admin/app';
import { getDataSource } from '../db/data-source';
import { AdminUserEntity } from '../db/entities/AdminUserEntity';
import { AdminRoleEntity } from '../db/entities/AdminRoleEntity';
import { AdminStoreAccessEntity } from '../db/entities/AdminStoreAccessEntity';
import { permissionDenied } from './errors';

if (!getApps().length) {
  initializeApp();
}

export const verifyFirebaseUser = (request: CallableRequest<unknown>): string => {
  const uid = request.auth?.uid;
  if (!uid) {
    permissionDenied('Authentication required.');
  }
  return uid;
};

export const verifyAdminRole = async (uid: string, acceptedRoles?: string[]): Promise<AdminRoleEntity[]> => {
  const ds = await getDataSource();
  const adminUserRepo = ds.getRepository(AdminUserEntity);
  const roleRepo = ds.getRepository(AdminRoleEntity);

  const adminUser = await adminUserRepo.findOne({ where: { uid, status: 'active' } });
  if (!adminUser) {
    permissionDenied('Active admin user is required.');
  }

  const roles = await roleRepo.find({ where: { adminUid: uid } });
  if (!roles.length) {
    permissionDenied('Admin role is required.');
  }

  if (acceptedRoles?.length) {
    const hasRole = roles.some((r) => acceptedRoles.includes(r.role));
    if (!hasRole) {
      permissionDenied('Required admin role is missing.');
    }
  }

  return roles;
};

export const verifyStoreAccess = async (adminUid: string, storeId: string): Promise<void> => {
  const ds = await getDataSource();
  const repo = ds.getRepository(AdminStoreAccessEntity);
  const row = await repo.findOne({ where: { adminUid, storeId } });
  if (!row) {
    permissionDenied('Admin has no access to this store.');
  }
};
