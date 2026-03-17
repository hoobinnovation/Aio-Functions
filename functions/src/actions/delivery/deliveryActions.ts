import { ActionContext } from '../../core/protocol';
import {
  deliveryAcceptOrder,
  deliveryArrivedDropoff,
  deliveryArrivedPickup,
  deliveryDelivered,
  deliveryFailedDelivery,
  deliveryGetActiveTrip,
  deliveryGetDashboard,
  deliveryGetOrderDetails,
  deliveryGetProfile,
  deliveryHeartbeat,
  deliveryListAssignedOrders,
  deliveryListHistory,
  deliveryPickedUp,
  deliveryRejectOrder,
  deliverySetOnTheWay,
  deliverySetPresence,
  deliveryUpdateLocation,
  deliveryWhoAmI,
} from '../../core/delivery/domain';

export {
  deliveryWhoAmI,
  deliverySetPresence,
  deliveryHeartbeat,
  deliveryUpdateLocation,
  deliveryListAssignedOrders,
  deliveryGetActiveTrip,
  deliveryGetOrderDetails,
  deliveryAcceptOrder,
  deliveryRejectOrder,
  deliveryArrivedPickup,
  deliveryPickedUp,
  deliverySetOnTheWay,
  deliveryArrivedDropoff,
  deliveryDelivered,
  deliveryFailedDelivery,
  deliveryListHistory,
  deliveryGetDashboard,
  deliveryGetProfile,
};

export async function deliveryGatewayHealth(_ctx: ActionContext) {
  return {
    ok: true,
    gateway: 'delivery',
  };
}
