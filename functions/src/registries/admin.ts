import { ActionHandler } from '../core/protocol';
import { adminEdgeSyncIngest } from '../actions/admin/edgeSyncAdminActions';

export const ADMIN_ACTION_REGISTRY: Record<string, ActionHandler> = {
  adminEdgeSyncIngest: adminEdgeSyncIngest as ActionHandler,
};
