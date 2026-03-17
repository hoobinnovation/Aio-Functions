import Joi from 'joi';
import { ActionSpec } from '../core/validate';
import { isDevRelaxedValidationEnabled } from '../utils/queryNormalization';

function validateEdgeEvents(value: unknown, helpers: any) {
  if (!Array.isArray(value)) {
    return helpers.error('any.invalid', { message: 'events must be an array' });
  }
  if (value.length < 1 || value.length > 200) {
    return helpers.error('any.invalid', { message: 'events must contain 1..200 entries' });
  }

  const allowedTypes = new Set([
    'orderCreated',
    'orderStatusChanged',
    'waiterRequested',
    'billRequested',
    'requestHandled',
    'trackingEventAdded',
    'ledgerEntryCreated',
    'inventoryMovementCreated',
  ]);

  for (const item of value) {
    if (!item || typeof item !== 'object') {
      return helpers.error('any.invalid', { message: 'event row must be an object' });
    }
    const event = item as Record<string, unknown>;
    if (typeof event.eventId !== 'string' || !event.eventId.trim()) {
      return helpers.error('any.invalid', { message: 'eventId is required' });
    }
    if (typeof event.seq !== 'number' || !Number.isInteger(event.seq) || event.seq < 0) {
      return helpers.error('any.invalid', { message: 'seq must be a non-negative integer' });
    }
    if (typeof event.eventType !== 'string' || !allowedTypes.has(event.eventType)) {
      return helpers.error('any.invalid', { message: 'eventType is invalid' });
    }
    if (typeof event.createdAt !== 'string' || Number.isNaN(Date.parse(event.createdAt))) {
      return helpers.error('any.invalid', { message: 'createdAt must be an ISO date string' });
    }
    if (!event.payload || typeof event.payload !== 'object' || Array.isArray(event.payload)) {
      return helpers.error('any.invalid', { message: 'payload must be an object' });
    }
  }

  return value;
}

export const ADMIN_ACTION_SPECS: Record<string, ActionSpec> = {
  adminEdgeSyncIngest: {
    schema: Joi.object({
      hubId: Joi.string().max(96).required(),
      events: Joi.any().custom(validateEdgeEvents).required(),
    }).required(),
    notes: 'Ingest edge local-hub events into cloud',
    errorCodes: ['EDGE_NODE_FORBIDDEN', 'EDGE_SIGNATURE_INVALID', 'VALIDATION_FAILED'],
  },
};


const sessionStatusSchema = Joi.string().valid('active','closed','expired');
const relaxedQueryValidation = isDevRelaxedValidationEnabled();
const requiredInStrictProd = (schema: any) => (relaxedQueryValidation ? schema.optional() : schema.required());
const stringSchema = () => Joi.string() as any;
const trimmedString = () => stringSchema().trim();

ADMIN_ACTION_SPECS.adminDineInSettingsGet = { schema: Joi.any().optional(), notes: 'dine-in settings get', errorCodes: ['VALIDATION_FAILED'] };
ADMIN_ACTION_SPECS.adminDineInSettingsUpdate = { schema: Joi.object({ enabled: Joi.boolean().required(), secureTableModeEnabled: Joi.boolean().required(), verificationMethod: Joi.string().valid('qrOnly','qrPlusGeo').required(), sessionTtlMinutes: Joi.number().integer().min(1).required(), requireSessionForOrder: Joi.boolean().required(), requireSessionForWaiterCall: Joi.boolean().required(), requireSessionForRating: Joi.boolean().required(), requireSessionForBillRequest: Joi.boolean().required(), allowCustomerSessionClose: Joi.boolean().required() }).required(), notes: 'dine-in settings update', errorCodes: ['VALIDATION_FAILED'] };
ADMIN_ACTION_SPECS.adminDineInTablesList = { schema: Joi.object({ page: Joi.number().integer().min(1).optional(), pageSize: Joi.number().integer().min(1).max(200).optional(), fetchAll: Joi.boolean().optional() }).keys({ branchId: Joi.string().optional() }).optional(), notes: 'dine-in tables list', errorCodes: ['VALIDATION_FAILED'] };
ADMIN_ACTION_SPECS.adminDineInTablesGet = { schema: Joi.object({ tableId: Joi.string().required() }).required(), notes: 'dine-in tables get', errorCodes: ['VALIDATION_FAILED'] };
ADMIN_ACTION_SPECS.adminDineInTablesCreate = { schema: Joi.object({ branchId: Joi.string().required(), code: Joi.string().required(), tableNumber: Joi.string().required(), name: Joi.string().allow('', null), seatsCount: Joi.number().integer().min(1).required() }).required(), notes: 'dine-in table create', errorCodes: ['VALIDATION_FAILED'] };
ADMIN_ACTION_SPECS.adminDineInTablesUpdate = { schema: Joi.object({ tableId: Joi.string().required(), tableNumber: Joi.string().required(), name: Joi.string().allow('', null), seatsCount: Joi.number().integer().min(1).required(), status: Joi.string().valid('active','disabled','maintenance').required() }).required(), notes: 'dine-in table update', errorCodes: ['VALIDATION_FAILED'] };
ADMIN_ACTION_SPECS.adminDineInTablesDisable = { schema: Joi.object({ tableId: Joi.string().required() }).required(), notes: 'dine-in table disable', errorCodes: ['VALIDATION_FAILED'] };
ADMIN_ACTION_SPECS.adminDineInTablesGenerateQr = { schema: Joi.object({ tableId: Joi.string().required() }).required(), notes: 'dine-in table qr generate', errorCodes: ['VALIDATION_FAILED'] };
ADMIN_ACTION_SPECS.adminDineInTablesRegenerateQr = { schema: Joi.object({ tableId: Joi.string().required() }).required(), notes: 'dine-in table qr regenerate', errorCodes: ['VALIDATION_FAILED'] };
ADMIN_ACTION_SPECS.adminDineInTablesBulkGeneratePdfData = { schema: Joi.object({ branchId: Joi.string().required(), tableIds: Joi.array().items(Joi.string()).optional() }).required(), notes: 'dine-in pdf data', errorCodes: ['VALIDATION_FAILED'] };
ADMIN_ACTION_SPECS.adminDineInSessionsList = { schema: Joi.object({ page: Joi.number().integer().min(1).optional(), pageSize: Joi.number().integer().min(1).max(200).optional(), fetchAll: Joi.boolean().optional() }).keys({ branchId: Joi.string().optional(), status: sessionStatusSchema.optional() }).optional(), notes: 'dine-in sessions list', errorCodes: ['VALIDATION_FAILED'] };
ADMIN_ACTION_SPECS.adminDineInSessionsGet = { schema: Joi.object({ sessionId: Joi.string().required() }).required(), notes: 'dine-in sessions get', errorCodes: ['VALIDATION_FAILED'] };
ADMIN_ACTION_SPECS.adminDineInSessionsClose = { schema: Joi.object({ sessionId: Joi.string().required() }).required(), notes: 'dine-in sessions close', errorCodes: ['VALIDATION_FAILED'] };
ADMIN_ACTION_SPECS.adminDineInWaiterCallsList = { schema: Joi.object({ page: Joi.number().integer().min(1).optional(), pageSize: Joi.number().integer().min(1).max(200).optional(), fetchAll: Joi.boolean().optional() }).keys({ branchId: Joi.string().optional(), status: Joi.string().optional() }).optional(), notes: 'dine-in waiter calls list', errorCodes: ['VALIDATION_FAILED'] };
ADMIN_ACTION_SPECS.adminDineInWaiterCallsGet = { schema: Joi.object({ waiterCallId: Joi.string().required() }).required(), notes: 'dine-in waiter calls get', errorCodes: ['VALIDATION_FAILED'] };
ADMIN_ACTION_SPECS.adminDineInWaiterCallsAcknowledge = { schema: Joi.object({ waiterCallId: Joi.string().required() }).required(), notes: 'dine-in waiter calls ack', errorCodes: ['VALIDATION_FAILED'] };
ADMIN_ACTION_SPECS.adminDineInWaiterCallsResolve = { schema: Joi.object({ waiterCallId: Joi.string().required() }).required(), notes: 'dine-in waiter calls resolve', errorCodes: ['VALIDATION_FAILED'] };
ADMIN_ACTION_SPECS.adminDineInDashboardStats = {
  schema: Joi.object({
    branchId: Joi.string().optional(),
    dateFrom: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}T/).optional(),
    dateTo: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}T/).optional(),
    from: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}T/).optional(),
    to: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}T/).optional(),
    range: requiredInStrictProd(Joi.object({ from: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}T/).optional(), to: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}T/).optional() })),
  }).required(),
  notes: 'dine-in stats',
  errorCodes: ['VALIDATION_FAILED'],
};

ADMIN_ACTION_SPECS.adminAssignOrderToRider = {
  schema: Joi.object({
    orderId: Joi.string().required(),
    riderId: Joi.string().required(),
    reason: trimmedString().max(300).allow('', null).optional(),
    note: trimmedString().max(300).allow('', null).optional(),
    idempotencyKey: trimmedString().max(120).optional(),
  }).required(),
  notes: 'assign order to rider',
  errorCodes: ['VALIDATION_FAILED', 'DELIVERY_ORDER_ALREADY_ASSIGNED', 'DELIVERY_ILLEGAL_TRANSITION', 'RIDER_NOT_FOUND'],
};
ADMIN_ACTION_SPECS.adminListRiders = {
  schema: Joi.object({
    status: trimmedString().max(24).optional(),
  }).optional(),
  notes: 'list delivery riders for store',
  errorCodes: ['VALIDATION_FAILED'],
};
ADMIN_ACTION_SPECS.adminGetRider = {
  schema: Joi.object({
    riderId: Joi.string().required(),
  }).required(),
  notes: 'get delivery rider details',
  errorCodes: ['VALIDATION_FAILED', 'RIDER_NOT_FOUND'],
};
ADMIN_ACTION_SPECS.adminCreateRider = {
  schema: Joi.object({
    uid: Joi.string().required(),
    riderId: Joi.string().optional(),
    displayName: trimmedString().max(80).required(),
    phone: trimmedString().max(32).allow('', null).optional(),
    branchId: Joi.string().allow('', null).optional(),
    vehicleType: trimmedString().max(48).allow('', null).optional(),
    status: trimmedString().max(24).allow('', null).optional(),
  }).required(),
  notes: 'create delivery rider',
  errorCodes: ['VALIDATION_FAILED', 'DELIVERY_STORE_MISMATCH'],
};
ADMIN_ACTION_SPECS.adminUpdateRider = {
  schema: Joi.object({
    riderId: Joi.string().required(),
    displayName: trimmedString().max(80).allow('', null).optional(),
    phone: trimmedString().max(32).allow('', null).optional(),
    branchId: Joi.string().allow('', null).optional(),
    vehicleType: trimmedString().max(48).allow('', null).optional(),
    status: trimmedString().max(24).allow('', null).optional(),
  }).required(),
  notes: 'update delivery rider',
  errorCodes: ['VALIDATION_FAILED', 'RIDER_NOT_FOUND'],
};
ADMIN_ACTION_SPECS.adminDisableRider = {
  schema: Joi.object({
    riderId: Joi.string().required(),
  }).required(),
  notes: 'disable delivery rider',
  errorCodes: ['VALIDATION_FAILED', 'RIDER_NOT_FOUND', 'DELIVERY_ILLEGAL_TRANSITION'],
};
ADMIN_ACTION_SPECS.adminReassignOrderToRider = {
  schema: Joi.object({
    orderId: Joi.string().required(),
    riderId: Joi.string().required(),
    reason: trimmedString().max(300).allow('', null).optional(),
    note: trimmedString().max(300).allow('', null).optional(),
    idempotencyKey: trimmedString().max(120).optional(),
  }).required(),
  notes: 'reassign order to rider',
  errorCodes: ['VALIDATION_FAILED', 'DELIVERY_ILLEGAL_TRANSITION', 'RIDER_NOT_FOUND'],
};
ADMIN_ACTION_SPECS.adminUnassignOrderFromRider = {
  schema: Joi.object({
    orderId: Joi.string().required(),
    reason: trimmedString().max(300).allow('', null).optional(),
    note: trimmedString().max(300).allow('', null).optional(),
    idempotencyKey: trimmedString().max(120).optional(),
  }).required(),
  notes: 'unassign order from rider',
  errorCodes: ['VALIDATION_FAILED', 'DELIVERY_ILLEGAL_TRANSITION'],
};
ADMIN_ACTION_SPECS.adminGetRiderPresence = {
  schema: Joi.object({
    riderId: Joi.string().required(),
  }).required(),
  notes: 'get rider presence',
  errorCodes: ['VALIDATION_FAILED', 'RIDER_NOT_FOUND'],
};
ADMIN_ACTION_SPECS.adminGetRiderTracking = {
  schema: Joi.object({
    riderId: Joi.string().required(),
  }).required(),
  notes: 'get rider tracking',
  errorCodes: ['VALIDATION_FAILED', 'RIDER_NOT_FOUND'],
};
ADMIN_ACTION_SPECS.adminListRidersForStore = {
  schema: Joi.object({
    status: trimmedString().max(24).optional(),
  }).optional(),
  notes: 'list delivery riders for store',
  errorCodes: ['VALIDATION_FAILED'],
};
ADMIN_ACTION_SPECS.adminGetDeliveryLiveBoard = {
  schema: Joi.object({
    limit: Joi.number().integer().min(1).max(100).optional(),
    pageSize: Joi.number().integer().min(1).max(100).optional(),
  }).optional(),
  notes: 'get delivery live board',
  errorCodes: ['VALIDATION_FAILED'],
};
ADMIN_ACTION_SPECS.adminGetDeliveryOrderTimeline = {
  schema: Joi.object({
    orderId: Joi.string().required(),
  }).required(),
  notes: 'get delivery order timeline',
  errorCodes: ['VALIDATION_FAILED', 'ORDER_NOT_FOUND'],
};
ADMIN_ACTION_SPECS.adminListDeliveryAssignments = {
  schema: Joi.object({
    riderId: Joi.string().optional(),
    status: trimmedString().max(24).optional(),
    limit: Joi.number().integer().min(1).max(100).optional(),
    pageSize: Joi.number().integer().min(1).max(100).optional(),
  }).optional(),
  notes: 'list store delivery assignments',
  errorCodes: ['VALIDATION_FAILED'],
};
ADMIN_ACTION_SPECS.adminGetDeliveryDashboardStats = {
  schema: Joi.any().optional(),
  notes: 'get delivery dashboard stats',
  errorCodes: ['VALIDATION_FAILED'],
};
