import { ACTION_ROLE_MAP } from '../rbac/adminRbac';

export const ADMIN_STORE_SCOPED_ACTIONS = Object.entries(ACTION_ROLE_MAP)
  .filter(([, policy]) => policy.storeAccessRequired)
  .map(([action]) => action);
