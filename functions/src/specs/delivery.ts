import Joi from 'joi';
import { ActionSpec } from '../core/validate';

const stringSchema = () => Joi.string() as any;
const trimmedString = () => stringSchema().trim();
const deliveryPresenceStatusSchema = stringSchema().valid('offline', 'online', 'driving');
const deliveryReasonSchema = trimmedString().min(3).max(300);
const nullableId = trimmedString().max(64).allow(null, '');

export const DELIVERY_ACTION_SPECS: Record<string, ActionSpec> = {
  deliveryGatewayHealth: {
    schema: Joi.any().optional(),
    notes: 'Health probe for delivery gateway',
    errorCodes: ['VALIDATION_FAILED'],
  },
  deliveryWhoAmI: {
    schema: Joi.any().optional(),
    notes: 'Resolve authenticated rider identity and delivery scope',
    errorCodes: ['AUTH_REQUIRED', 'RIDER_AUTH_REQUIRED', 'RIDER_NOT_FOUND'],
  },
  deliverySetPresence: {
    schema: Joi.object({
      presenceStatus: deliveryPresenceStatusSchema.required(),
      activeOrderId: nullableId.optional(),
      activeTripId: nullableId.optional(),
      appState: trimmedString().max(32).allow(null, '').optional(),
    }).required(),
    notes: 'Update rider presence state',
    errorCodes: ['VALIDATION_FAILED', 'DELIVERY_STORE_MISMATCH', 'RIDER_AUTH_REQUIRED'],
  },
  deliveryHeartbeat: {
    schema: Joi.object({
      presenceStatus: deliveryPresenceStatusSchema.optional(),
      activeOrderId: nullableId.optional(),
      activeTripId: nullableId.optional(),
      appState: trimmedString().max(32).allow(null, '').optional(),
    }).optional(),
    notes: 'Update rider liveness without a full location payload',
    errorCodes: ['VALIDATION_FAILED', 'RIDER_AUTH_REQUIRED'],
  },
  deliveryUpdateLocation: {
    schema: Joi.object({
      storeId: trimmedString().max(64).optional(),
      branchId: nullableId.optional(),
      orderId: nullableId.optional(),
      tripId: nullableId.optional(),
      lat: Joi.number().required(),
      lng: Joi.number().required(),
      accuracy: Joi.number().min(0).required(),
      heading: Joi.number().allow(null).optional(),
      speed: Joi.number().allow(null).optional(),
      presenceStatus: deliveryPresenceStatusSchema.optional(),
      appState: trimmedString().max(32).allow(null, '').optional(),
    }).required(),
    notes: 'Publish rider realtime location',
    errorCodes: ['VALIDATION_FAILED', 'DELIVERY_LOCATION_INVALID', 'DELIVERY_STORE_MISMATCH', 'RIDER_AUTH_REQUIRED'],
  },
  deliveryListAssignedOrders: {
    schema: Joi.object({
      limit: Joi.number().integer().min(1).max(100).optional(),
      pageSize: Joi.number().integer().min(1).max(100).optional(),
    }).optional(),
    notes: 'List active assigned delivery orders for the authenticated rider',
    errorCodes: ['VALIDATION_FAILED', 'RIDER_AUTH_REQUIRED'],
  },
  deliveryGetActiveTrip: {
    schema: Joi.any().optional(),
    notes: 'Get the rider active trip and attached orders',
    errorCodes: ['RIDER_AUTH_REQUIRED'],
  },
  deliveryGetOrderDetails: {
    schema: Joi.object({
      orderId: Joi.string().required(),
    }).required(),
    notes: 'Get delivery order details',
    errorCodes: ['VALIDATION_FAILED', 'ORDER_NOT_FOUND', 'DELIVERY_ORDER_NOT_ASSIGNED'],
  },
  deliveryAcceptOrder: {
    schema: Joi.object({
      orderId: Joi.string().required(),
      idempotencyKey: trimmedString().max(120).optional(),
    }).required(),
    notes: 'Accept an assigned delivery order',
    errorCodes: ['VALIDATION_FAILED', 'DELIVERY_ILLEGAL_TRANSITION', 'DELIVERY_ORDER_NOT_ASSIGNED', 'IDEMPOTENCY_KEY_REUSED'],
  },
  deliveryRejectOrder: {
    schema: Joi.object({
      orderId: Joi.string().required(),
      reason: deliveryReasonSchema.required(),
      idempotencyKey: trimmedString().max(120).optional(),
    }).required(),
    notes: 'Reject an assigned delivery order',
    errorCodes: ['VALIDATION_FAILED', 'DELIVERY_REASON_REQUIRED', 'DELIVERY_ILLEGAL_TRANSITION', 'DELIVERY_ORDER_NOT_ASSIGNED', 'IDEMPOTENCY_KEY_REUSED'],
  },
  deliveryArrivedPickup: {
    schema: Joi.object({
      orderId: Joi.string().required(),
      idempotencyKey: trimmedString().max(120).optional(),
    }).required(),
    notes: 'Mark rider arrived at pickup',
    errorCodes: ['VALIDATION_FAILED', 'DELIVERY_ILLEGAL_TRANSITION', 'DELIVERY_ORDER_NOT_ASSIGNED'],
  },
  deliveryPickedUp: {
    schema: Joi.object({
      orderId: Joi.string().required(),
      idempotencyKey: trimmedString().max(120).optional(),
    }).required(),
    notes: 'Mark order picked up',
    errorCodes: ['VALIDATION_FAILED', 'DELIVERY_ILLEGAL_TRANSITION', 'DELIVERY_ORDER_NOT_ASSIGNED', 'IDEMPOTENCY_KEY_REUSED'],
  },
  deliverySetOnTheWay: {
    schema: Joi.object({
      orderId: Joi.string().required(),
      idempotencyKey: trimmedString().max(120).optional(),
    }).required(),
    notes: 'Start dropoff leg',
    errorCodes: ['VALIDATION_FAILED', 'DELIVERY_ILLEGAL_TRANSITION', 'DELIVERY_ORDER_NOT_ASSIGNED'],
  },
  deliveryArrivedDropoff: {
    schema: Joi.object({
      orderId: Joi.string().required(),
      idempotencyKey: trimmedString().max(120).optional(),
    }).required(),
    notes: 'Mark rider arrived at dropoff',
    errorCodes: ['VALIDATION_FAILED', 'DELIVERY_ILLEGAL_TRANSITION', 'DELIVERY_ORDER_NOT_ASSIGNED'],
  },
  deliveryDelivered: {
    schema: Joi.object({
      orderId: Joi.string().required(),
      idempotencyKey: trimmedString().max(120).optional(),
    }).required(),
    notes: 'Complete delivery successfully',
    errorCodes: ['VALIDATION_FAILED', 'DELIVERY_ILLEGAL_TRANSITION', 'DELIVERY_ORDER_NOT_ASSIGNED', 'IDEMPOTENCY_KEY_REUSED'],
  },
  deliveryFailedDelivery: {
    schema: Joi.object({
      orderId: Joi.string().required(),
      reason: deliveryReasonSchema.required(),
      idempotencyKey: trimmedString().max(120).optional(),
    }).required(),
    notes: 'Complete delivery as failed with reason',
    errorCodes: ['VALIDATION_FAILED', 'DELIVERY_REASON_REQUIRED', 'DELIVERY_ILLEGAL_TRANSITION', 'DELIVERY_ORDER_NOT_ASSIGNED', 'IDEMPOTENCY_KEY_REUSED'],
  },
  deliveryListHistory: {
    schema: Joi.object({
      limit: Joi.number().integer().min(1).max(100).optional(),
      pageSize: Joi.number().integer().min(1).max(100).optional(),
    }).optional(),
    notes: 'List rider delivery history',
    errorCodes: ['VALIDATION_FAILED', 'RIDER_AUTH_REQUIRED'],
  },
  deliveryGetDashboard: {
    schema: Joi.any().optional(),
    notes: 'Get rider delivery dashboard',
    errorCodes: ['RIDER_AUTH_REQUIRED'],
  },
  deliveryGetProfile: {
    schema: Joi.any().optional(),
    notes: 'Get rider profile and store scope',
    errorCodes: ['RIDER_AUTH_REQUIRED'],
  },
};
