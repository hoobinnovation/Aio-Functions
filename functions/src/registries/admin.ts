import { ActionHandler } from '../core/protocol';
import { adminEdgeSyncIngest } from '../actions/admin/edgeSyncAdminActions';
import {
  adminCreateRider,
  adminDisableRider,
  adminAssignOrderToRider,
  adminGetDeliveryDashboardStats,
  adminGetDeliveryLiveBoard,
  adminGetDeliveryOrderTimeline,
  adminGetRider,
  adminGetRiderPresence,
  adminGetRiderTracking,
  adminListRiders,
  adminListDeliveryAssignments,
  adminListRidersForStore,
  adminReassignOrderToRider,
  adminUnassignOrderFromRider,
  adminUpdateRider,
} from '../actions/admin/deliveryAdminActions';

export const ADMIN_ACTION_REGISTRY: Record<string, ActionHandler> = {
  adminEdgeSyncIngest: adminEdgeSyncIngest as ActionHandler,
  adminListRiders: adminListRiders as ActionHandler,
  adminGetRider: adminGetRider as ActionHandler,
  adminCreateRider: adminCreateRider as ActionHandler,
  adminUpdateRider: adminUpdateRider as ActionHandler,
  adminDisableRider: adminDisableRider as ActionHandler,
  adminAssignOrderToRider: adminAssignOrderToRider as ActionHandler,
  adminReassignOrderToRider: adminReassignOrderToRider as ActionHandler,
  adminUnassignOrderFromRider: adminUnassignOrderFromRider as ActionHandler,
  adminGetRiderPresence: adminGetRiderPresence as ActionHandler,
  adminGetRiderTracking: adminGetRiderTracking as ActionHandler,
  adminGetDeliveryLiveBoard: adminGetDeliveryLiveBoard as ActionHandler,
  adminGetDeliveryOrderTimeline: adminGetDeliveryOrderTimeline as ActionHandler,
  adminListRidersForStore: adminListRidersForStore as ActionHandler,
  adminListDeliveryAssignments: adminListDeliveryAssignments as ActionHandler,
  adminGetDeliveryDashboardStats: adminGetDeliveryDashboardStats as ActionHandler,
};
