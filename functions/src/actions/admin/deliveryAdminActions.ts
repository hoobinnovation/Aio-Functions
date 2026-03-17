import { ActionContext } from '../../core/protocol';
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
} from '../../core/delivery/domain';

export {
  adminListRiders,
  adminGetRider,
  adminCreateRider,
  adminUpdateRider,
  adminDisableRider,
  adminAssignOrderToRider,
  adminReassignOrderToRider,
  adminUnassignOrderFromRider,
  adminGetRiderPresence,
  adminGetRiderTracking,
  adminGetDeliveryLiveBoard,
  adminGetDeliveryOrderTimeline,
  adminListRidersForStore,
  adminListDeliveryAssignments,
  adminGetDeliveryDashboardStats,
};

export async function adminDeliveryHealth(_ctx: ActionContext) {
  return {
    ok: true,
    module: 'delivery',
  };
}
