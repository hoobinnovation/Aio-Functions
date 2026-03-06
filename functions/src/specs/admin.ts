import Joi from 'joi';
import { ActionSpec } from '../core/validate';

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

ADMIN_ACTION_SPECS.adminDineInSettingsGet = { schema: Joi.any().optional(), notes: 'dine-in settings get', errorCodes: ['VALIDATION_FAILED'] };
ADMIN_ACTION_SPECS.adminDineInSettingsUpdate = { schema: Joi.object({ enabled: Joi.boolean().required(), secureTableModeEnabled: Joi.boolean().required(), verificationMethod: Joi.string().valid('qrOnly','qrPlusGeo').required(), sessionTtlMinutes: Joi.number().integer().min(1).required(), requireSessionForOrder: Joi.boolean().required(), requireSessionForWaiterCall: Joi.boolean().required(), requireSessionForRating: Joi.boolean().required(), requireSessionForBillRequest: Joi.boolean().required(), allowCustomerSessionClose: Joi.boolean().required() }).required(), notes: 'dine-in settings update', errorCodes: ['VALIDATION_FAILED'] };
ADMIN_ACTION_SPECS.adminDineInTablesList = { schema: Joi.object({ branchId: Joi.string().optional() }).optional(), notes: 'dine-in tables list', errorCodes: ['VALIDATION_FAILED'] };
ADMIN_ACTION_SPECS.adminDineInTablesGet = { schema: Joi.object({ tableId: Joi.string().required() }).required(), notes: 'dine-in tables get', errorCodes: ['VALIDATION_FAILED'] };
ADMIN_ACTION_SPECS.adminDineInTablesCreate = { schema: Joi.object({ branchId: Joi.string().required(), code: Joi.string().required(), tableNumber: Joi.string().required(), name: Joi.string().allow('', null), seatsCount: Joi.number().integer().min(1).required() }).required(), notes: 'dine-in table create', errorCodes: ['VALIDATION_FAILED'] };
ADMIN_ACTION_SPECS.adminDineInTablesUpdate = { schema: Joi.object({ tableId: Joi.string().required(), tableNumber: Joi.string().required(), name: Joi.string().allow('', null), seatsCount: Joi.number().integer().min(1).required(), status: Joi.string().valid('active','disabled','maintenance').required() }).required(), notes: 'dine-in table update', errorCodes: ['VALIDATION_FAILED'] };
ADMIN_ACTION_SPECS.adminDineInTablesDisable = { schema: Joi.object({ tableId: Joi.string().required() }).required(), notes: 'dine-in table disable', errorCodes: ['VALIDATION_FAILED'] };
ADMIN_ACTION_SPECS.adminDineInTablesGenerateQr = { schema: Joi.object({ tableId: Joi.string().required() }).required(), notes: 'dine-in table qr generate', errorCodes: ['VALIDATION_FAILED'] };
ADMIN_ACTION_SPECS.adminDineInTablesRegenerateQr = { schema: Joi.object({ tableId: Joi.string().required() }).required(), notes: 'dine-in table qr regenerate', errorCodes: ['VALIDATION_FAILED'] };
ADMIN_ACTION_SPECS.adminDineInTablesBulkGeneratePdfData = { schema: Joi.object({ branchId: Joi.string().required(), tableIds: Joi.array().items(Joi.string()).optional() }).required(), notes: 'dine-in pdf data', errorCodes: ['VALIDATION_FAILED'] };
ADMIN_ACTION_SPECS.adminDineInSessionsList = { schema: Joi.object({ branchId: Joi.string().optional(), status: sessionStatusSchema.optional() }).optional(), notes: 'dine-in sessions list', errorCodes: ['VALIDATION_FAILED'] };
ADMIN_ACTION_SPECS.adminDineInSessionsGet = { schema: Joi.object({ sessionId: Joi.string().required() }).required(), notes: 'dine-in sessions get', errorCodes: ['VALIDATION_FAILED'] };
ADMIN_ACTION_SPECS.adminDineInSessionsClose = { schema: Joi.object({ sessionId: Joi.string().required() }).required(), notes: 'dine-in sessions close', errorCodes: ['VALIDATION_FAILED'] };
ADMIN_ACTION_SPECS.adminDineInWaiterCallsList = { schema: Joi.object({ branchId: Joi.string().optional(), status: Joi.string().optional() }).optional(), notes: 'dine-in waiter calls list', errorCodes: ['VALIDATION_FAILED'] };
ADMIN_ACTION_SPECS.adminDineInWaiterCallsGet = { schema: Joi.object({ waiterCallId: Joi.string().required() }).required(), notes: 'dine-in waiter calls get', errorCodes: ['VALIDATION_FAILED'] };
ADMIN_ACTION_SPECS.adminDineInWaiterCallsAcknowledge = { schema: Joi.object({ waiterCallId: Joi.string().required() }).required(), notes: 'dine-in waiter calls ack', errorCodes: ['VALIDATION_FAILED'] };
ADMIN_ACTION_SPECS.adminDineInWaiterCallsResolve = { schema: Joi.object({ waiterCallId: Joi.string().required() }).required(), notes: 'dine-in waiter calls resolve', errorCodes: ['VALIDATION_FAILED'] };
ADMIN_ACTION_SPECS.adminDineInDashboardStats = { schema: Joi.object({ branchId: Joi.string().optional(), dateFrom: Joi.string().required(), dateTo: Joi.string().required() }).required(), notes: 'dine-in stats', errorCodes: ['VALIDATION_FAILED'] };
