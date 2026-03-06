import { createHash, createHmac, timingSafeEqual } from 'crypto';
import { EntityManager } from 'typeorm';
import { ActionContext } from '../../core/protocol';
import { AppError } from '../../core/errors';
import { EdgeNode } from '../../entities/EdgeNode';
import { EdgeIngestedEvent } from '../../entities/EdgeIngestedEvent';
import { Order } from '../../entities/Order';
import { OrderStatusEvent } from '../../entities/OrderStatusEvent';
import { TrackingEvent } from '../../entities/TrackingEvent';
import { LedgerEntry } from '../../entities/LedgerEntry';
import { InventoryAdjustment } from '../../entities/InventoryAdjustment';

const SUPPORTED_EVENT_TYPES = new Set([
  'orderCreated',
  'orderStatusChanged',
  'waiterRequested',
  'billRequested',
  'requestHandled',
  'trackingEventAdded',
  'ledgerEntryCreated',
  'inventoryMovementCreated',
]);

type EdgeEvent = {
  eventId: string;
  seq: number;
  eventType: string;
  createdAt: string;
  payload: Record<string, unknown>;
};

type IngestPayload = {
  hubId: string;
  events: EdgeEvent[];
};

function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (value && typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    const sorted = Object.keys(obj).sort().map((k) => `${JSON.stringify(k)}:${canonicalJson(obj[k])}`);
    return `{${sorted.join(',')}}`;
  }
  return JSON.stringify(value);
}

function constantTimeEqual(a: string, b: string): boolean {
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  if (aBuf.length !== bBuf.length) return false;
  return timingSafeEqual(aBuf, bBuf);
}

function verifySignature(secretHash: string, hubId: string, events: EdgeEvent[], providedSignature?: string): void {
  if (!providedSignature) throw new AppError('EDGE_SIGNATURE_INVALID', 'Missing edge signature');

  const message = `${hubId}${canonicalJson(events)}`;
  const isDev = process.env.NODE_ENV !== 'production';

  if (isDev && secretHash.startsWith('raw:')) {
    const expected = createHmac('sha256', secretHash.slice(4)).update(message).digest('hex');
    if (!constantTimeEqual(expected, providedSignature)) {
      throw new AppError('EDGE_SIGNATURE_INVALID', 'Invalid edge signature');
    }
    return;
  }

  const hashedSignature = createHash('sha256').update(providedSignature).digest('hex');
  if (!constantTimeEqual(hashedSignature, secretHash)) {
    throw new AppError('EDGE_SIGNATURE_INVALID', 'Invalid edge signature');
  }
}

async function batchUpdateOrderStatuses(tx: EntityManager, updates: Array<{ orderId: string; status: string }>): Promise<void> {
  if (!updates.length) return;

  const whens = updates.map(() => 'WHEN ? THEN ?').join(' ');
  const whereIn = updates.map(() => '?').join(',');
  const params: string[] = [];
  updates.forEach((u) => params.push(u.orderId, u.status));
  updates.forEach((u) => params.push(u.orderId));
  await tx.getRepository(Order).query(`UPDATE orders SET status = CASE id ${whens} ELSE status END WHERE id IN (${whereIn})`, params);
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
}

function requiredString(record: Record<string, unknown>, key: string, eventType: string): string {
  const value = record[key];
  if (typeof value !== 'string' || !value.trim()) {
    throw new AppError('VALIDATION_FAILED', `${eventType} requires payload.${key}`);
  }
  return value;
}

export async function adminEdgeSyncIngest(ctx: ActionContext, payload: IngestPayload) {
  const storeId = ctx.storeId;
  if (!storeId) throw new AppError('VALIDATION_FAILED', 'storeId is required');

  const edgeNode = await ctx.db.getRepository(EdgeNode).findOne({ where: { hubId: payload.hubId, storeId, status: 'active' } });
  if (!edgeNode) throw new AppError('EDGE_NODE_FORBIDDEN', 'Hub is not active for this store');

  verifySignature(edgeNode.secretHash, payload.hubId, payload.events, ctx.meta?.signature as string | undefined);

  const orderedEvents = [...payload.events].sort((a, b) => a.seq - b.seq);
  orderedEvents.forEach((event: EdgeEvent) => {
    if (!SUPPORTED_EVENT_TYPES.has(event.eventType)) throw new AppError('VALIDATION_FAILED', `Unsupported eventType ${event.eventType}`);
  });

  const existingRows = orderedEvents.length
    ? await ctx.db.getRepository(EdgeIngestedEvent)
      .createQueryBuilder('ing')
      .select(['ing.eventId'])
      .where('ing.eventId IN (:...eventIds)', { eventIds: orderedEvents.map((event) => event.eventId) })
      .getMany()
    : [];

  const existingIds = new Set(existingRows.map((row: EdgeIngestedEvent) => row.eventId));
  const toApply = orderedEvents.filter((event) => !existingIds.has(event.eventId));

  if (!toApply.length) {
    return { accepted: 0, lastAppliedSeq: orderedEvents.length ? orderedEvents[orderedEvents.length - 1].seq : null };
  }

  await ctx.db.transaction(async (tx) => {
    const orderRows: Order[] = [];
    const statusRows: OrderStatusEvent[] = [];
    const trackingRows: TrackingEvent[] = [];
    const ledgerRows: LedgerEntry[] = [];
    const inventoryRows: InventoryAdjustment[] = [];
    const ingestedRows: EdgeIngestedEvent[] = [];
    const orderStatusUpdates: Array<{ orderId: string; status: string }> = [];
    const appliedAt = new Date();

    for (const event of toApply) {
      const rowPayload = asRecord(event.payload);

      if (event.eventType === 'orderCreated') {
        const orderId = requiredString(rowPayload, 'orderId', event.eventType);
        orderRows.push(tx.getRepository(Order).create({
          id: orderId,
          storeId,
          uid: typeof rowPayload.uid === 'string' ? rowPayload.uid : payload.hubId,
          channel: typeof rowPayload.channel === 'string' ? rowPayload.channel : 'edge',
          status: typeof rowPayload.status === 'string' ? rowPayload.status : 'created',
          subtotalCents: String(rowPayload.subtotalCents ?? '0'),
          discountCents: String(rowPayload.discountCents ?? '0'),
          shippingCents: String(rowPayload.shippingCents ?? '0'),
          taxCents: String(rowPayload.taxCents ?? '0'),
          totalCents: String(rowPayload.totalCents ?? '0'),
          paymentStatus: typeof rowPayload.paymentStatus === 'string' ? rowPayload.paymentStatus : 'pending',
          riskStatus: typeof rowPayload.riskStatus === 'string' ? rowPayload.riskStatus : 'clear',
          createdAt: new Date(event.createdAt),
        }));
      }

      if (event.eventType === 'orderStatusChanged' || event.eventType === 'waiterRequested' || event.eventType === 'billRequested' || event.eventType === 'requestHandled') {
        const orderId = requiredString(rowPayload, 'orderId', event.eventType);
        const status = typeof rowPayload.status === 'string' ? rowPayload.status : event.eventType;
        statusRows.push(tx.getRepository(OrderStatusEvent).create({
          id: event.eventId,
          orderId,
          status,
          note: typeof rowPayload.note === 'string' ? rowPayload.note : null,
          createdByUid: payload.hubId,
          createdAt: new Date(event.createdAt),
        }));
        if (event.eventType === 'orderStatusChanged') orderStatusUpdates.push({ orderId, status });
      }

      if (event.eventType === 'trackingEventAdded') {
        trackingRows.push(tx.getRepository(TrackingEvent).create({
          id: event.eventId,
          shipmentId: requiredString(rowPayload, 'shipmentId', event.eventType),
          message: requiredString(rowPayload, 'message', event.eventType),
          location: typeof rowPayload.location === 'string' ? rowPayload.location : null,
          createdAt: new Date(event.createdAt),
        }));
      }

      if (event.eventType === 'ledgerEntryCreated') {
        ledgerRows.push(tx.getRepository(LedgerEntry).create({
          id: requiredString(rowPayload, 'entryId', event.eventType),
          storeId,
          amountCents: String(rowPayload.amountCents ?? '0'),
          type: typeof rowPayload.type === 'string' ? rowPayload.type : 'edge',
          channel: typeof rowPayload.channel === 'string' ? rowPayload.channel : 'edge',
          branchId: typeof rowPayload.branchId === 'string' ? rowPayload.branchId : null,
          deviceId: typeof rowPayload.deviceId === 'string' ? rowPayload.deviceId : null,
          employeeId: typeof rowPayload.employeeId === 'string' ? rowPayload.employeeId : null,
          drawerSessionId: typeof rowPayload.drawerSessionId === 'string' ? rowPayload.drawerSessionId : null,
          refType: typeof rowPayload.refType === 'string' ? rowPayload.refType : 'edgeEvent',
          refId: typeof rowPayload.refId === 'string' ? rowPayload.refId : event.eventId,
          createdAt: new Date(event.createdAt),
        }));
      }

      if (event.eventType === 'inventoryMovementCreated') {
        inventoryRows.push(tx.getRepository(InventoryAdjustment).create({
          id: requiredString(rowPayload, 'adjustmentId', event.eventType),
          variantId: typeof rowPayload.variantId === 'string' ? rowPayload.variantId : null,
          storeId,
          productId: typeof rowPayload.productId === 'string' ? rowPayload.productId : null,
          deltaQty: String(rowPayload.deltaQty ?? '0'),
          beforeQty: rowPayload.beforeQty === undefined ? null : String(rowPayload.beforeQty),
          afterQty: rowPayload.afterQty === undefined ? null : String(rowPayload.afterQty),
          reason: typeof rowPayload.reason === 'string' ? rowPayload.reason : 'edgeMovement',
          importBatchId: null,
          performedByUid: typeof rowPayload.performedByUid === 'string' ? rowPayload.performedByUid : null,
          createdByAdminUid: ctx.auth?.uid ?? null,
          createdAt: new Date(event.createdAt),
        }));
      }

      ingestedRows.push(tx.getRepository(EdgeIngestedEvent).create({
        eventId: event.eventId,
        hubId: payload.hubId,
        storeId,
        seq: String(event.seq),
        eventType: event.eventType,
        createdAt: new Date(event.createdAt),
        appliedAt,
      }));
    }

    if (orderRows.length) await tx.getRepository(Order).upsert(orderRows, ['id']);
    if (statusRows.length) await tx.getRepository(OrderStatusEvent).insert(statusRows);
    if (trackingRows.length) await tx.getRepository(TrackingEvent).insert(trackingRows);
    if (ledgerRows.length) await tx.getRepository(LedgerEntry).upsert(ledgerRows, ['id']);
    if (inventoryRows.length) await tx.getRepository(InventoryAdjustment).upsert(inventoryRows, ['id']);
    if (ingestedRows.length) await tx.getRepository(EdgeIngestedEvent).insert(ingestedRows);
    await batchUpdateOrderStatuses(tx, orderStatusUpdates);
  });

  return { accepted: toApply.length, lastAppliedSeq: toApply[toApply.length - 1].seq };
}
