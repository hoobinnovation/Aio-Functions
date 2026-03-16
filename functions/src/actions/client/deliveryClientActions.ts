import { EntityManager } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { ActionContext } from '../../core/protocol';
import { AppError } from '../../core/errors';
import { Order } from '../../entities/Order';
import { OrderStatusEvent } from '../../entities/OrderStatusEvent';
import { Shipment } from '../../entities/Shipment';
import { TrackingEvent } from '../../entities/TrackingEvent';
import { normalizeListQueryInput } from '../../utils/queryNormalization';
import { requireSessionIdentity } from '../../core/identity';

function requireStoreId(ctx: ActionContext): string {
    const storeId = String(ctx.storeId || '').trim();
    if (!storeId) {
        throw new AppError('STORE_ACCESS_REQUIRED', 'storeId is required');
    }
    return storeId;
}

function resolveOrderId(payload: any): string {
    const value = payload?.orderId ?? payload?.id;
    if (!value) {
        throw new AppError('VALIDATION_FAILED', 'orderId is required');
    }
    return String(value);
}

function mapShipmentStatusFromOrderStatus(status: string): string {
    switch (status) {
        case 'placed':
            return 'pending';
        case 'accepted':
        case 'confirmed':
        case 'ready_for_dispatch':
            return 'ready';
        case 'assigned':
            return 'assigned';
        case 'picked_up':
            return 'picked_up';
        case 'out_for_delivery':
        case 'going':
            return 'out_for_delivery';
        case 'arrived':
            return 'arrived';
        case 'delivered':
            return 'delivered';
        case 'cancelled':
        case 'canceled':
            return 'cancelled';
        default:
            return 'pending';
    }
}

function toMoney(cents: string | number | null | undefined): number {
    return Number(cents || 0) / 100;
}

async function getShipmentByOrderId(ctx: ActionContext, orderId: string): Promise<Shipment | null> {
    return ctx.db.getRepository(Shipment).findOneBy({ orderId });
}

async function ensureOrderForStore(ctx: ActionContext, storeId: string, orderId: string): Promise<Order> {
    const order = await ctx.db.getRepository(Order).findOneBy({ id: orderId, storeId });
    if (!order) {
        throw new AppError('NOT_FOUND', 'Order not found');
    }
    return order;
}

export async function deliveryOrdersList(ctx: ActionContext, payload: any = {}) {
    requireSessionIdentity(ctx);
    const storeId = requireStoreId(ctx);

    const q = normalizeListQueryInput(payload, {
        defaultPageSize: 20,
        maxPageSize: 200,
    });

    const repo = ctx.db.getRepository(Order);
    const qb = repo
        .createQueryBuilder('o')
        .where('o.storeId = :storeId', { storeId });

    const status = payload?.status ? String(payload.status) : null;
    const statuses = Array.isArray(payload?.statuses)
        ? payload.statuses.map((s: unknown) => String(s))
        : null;
    const mode = String(payload?.mode || 'active');

    if (statuses && statuses.length) {
        qb.andWhere('o.status IN (:...statuses)', { statuses });
    } else if (status) {
        qb.andWhere('o.status = :status', { status });
    } else if (mode === 'history') {
        qb.andWhere('o.status IN (:...historyStatuses)', {
            historyStatuses: ['delivered', 'cancelled', 'canceled'],
        });
    } else {
        qb.andWhere('o.status IN (:...activeStatuses)', {
            activeStatuses: [
                'placed',
                'accepted',
                'confirmed',
                'ready_for_dispatch',
                'assigned',
                'picked_up',
                'out_for_delivery',
                'going',
                'arrived',
            ],
        });
    }

    qb.orderBy('o.createdAt', 'DESC').skip(q.offset).take(q.limit);

    const [orders, total]: [Order[], number] = await qb.getManyAndCount();

    const orderIds: string[] = orders.map((o: Order) => o.id);

    const shipments: Shipment[] = orderIds.length
        ? await ctx.db
            .getRepository(Shipment)
            .createQueryBuilder('s')
            .where('s.orderId IN (:...orderIds)', { orderIds })
            .getMany()
        : [];

    const shipmentMap = new Map<string, Shipment>(
        shipments.map((s: Shipment): [string, Shipment] => [s.orderId, s])
    );

    return {
        orders: orders.map((o: Order) => {
            const shipment: Shipment | null = shipmentMap.get(o.id) ?? null;

            return {
                id: o.id,
                storeId: o.storeId,
                status: o.status,
                serviceType: o.serviceType,
                customerName: o.shippingRecipientName || null,
                customerPhone: o.shippingPhone || null,
                addressLabel: o.shippingAddressLabel || null,
                addressLine: o.shippingAddressLine || null,
                total: toMoney(o.totalCents),
                subtotal: toMoney(o.subtotalCents),
                shipping: toMoney(o.shippingCents),
                discount: toMoney(o.discountCents),
                tax: toMoney(o.taxCents),
                paymentStatus: o.paymentStatus,
                riskStatus: o.riskStatus,
                createdAt: o.createdAt,
                shipment: shipment
                    ? {
                        id: shipment.id,
                        carrier: shipment.carrier,
                        trackingNumber: shipment.trackingNumber,
                        status: shipment.status,
                        updatedAt: shipment.updatedAt,
                    }
                    : null,
            };
        }),
        pageInfo: {
            total,
            page: q.page,
            pageSize: q.pageSize,
        },
    };
}

export async function deliveryOrdersGet(ctx: ActionContext, payload: any) {
    requireSessionIdentity(ctx);
    const storeId = requireStoreId(ctx);
    const orderId = resolveOrderId(payload);

    const order = await ensureOrderForStore(ctx, storeId, orderId);
    const shipment = await getShipmentByOrderId(ctx, order.id);

    return {
        order: {
            id: order.id,
            storeId: order.storeId,
            status: order.status,
            serviceType: order.serviceType,
            customerName: order.shippingRecipientName || null,
            customerPhone: order.shippingPhone || null,
            addressLabel: order.shippingAddressLabel || null,
            addressLine: order.shippingAddressLine || null,
            total: toMoney(order.totalCents),
            subtotal: toMoney(order.subtotalCents),
            shipping: toMoney(order.shippingCents),
            discount: toMoney(order.discountCents),
            tax: toMoney(order.taxCents),
            paymentStatus: order.paymentStatus,
            riskStatus: order.riskStatus,
            createdAt: order.createdAt,
            shipment: shipment
                ? {
                    id: shipment.id,
                    carrier: shipment.carrier,
                    trackingNumber: shipment.trackingNumber,
                    status: shipment.status,
                    updatedAt: shipment.updatedAt,
                }
                : null,
        },
    };
}

export async function deliveryOrdersTracking(ctx: ActionContext, payload: any) {
    requireSessionIdentity(ctx);
    const storeId = requireStoreId(ctx);
    const orderId = resolveOrderId(payload);

    const order = await ensureOrderForStore(ctx, storeId, orderId);
    const shipment = await getShipmentByOrderId(ctx, order.id);

    if (!shipment) {
        return {
            shipment: null,
            events: [],
        };
    }

    const events: TrackingEvent[] = await ctx.db.getRepository(TrackingEvent).find({
        where: { shipmentId: shipment.id },
        order: { createdAt: 'ASC' as any },
    });

    return {
        shipment,
        events,
    };
}

export async function deliveryOrdersUpdateStatus(ctx: ActionContext, payload: any) {
    const uid = requireSessionIdentity(ctx);
    const storeId = requireStoreId(ctx);
    const orderId = resolveOrderId(payload);
    const status = String(payload?.status || '').trim();

    if (!status) {
        throw new AppError('VALIDATION_FAILED', 'status is required');
    }

    const order = await ensureOrderForStore(ctx, storeId, orderId);

    await ctx.db.transaction(async (tx: EntityManager) => {
        await tx.getRepository(Order).update(
            { id: order.id, storeId },
            { status }
        );

        await tx.getRepository(OrderStatusEvent).save(
            tx.getRepository(OrderStatusEvent).create({
                id: uuidv4(),
                orderId: order.id,
                status,
                note: payload?.note ?? 'updated from delivery app',
                createdByUid: uid,
            })
        );

        let shipment = await tx.getRepository(Shipment).findOneBy({ orderId: order.id });

        if (!shipment) {
            shipment = tx.getRepository(Shipment).create({
                id: uuidv4(),
                orderId: order.id,
                carrier: payload?.carrier || null,
                trackingNumber: payload?.trackingNumber || null,
                status: mapShipmentStatusFromOrderStatus(status),
            });
            await tx.getRepository(Shipment).save(shipment);
        } else {
            await tx.getRepository(Shipment).update(
                { id: shipment.id },
                {
                    status: mapShipmentStatusFromOrderStatus(status),
                    carrier: payload?.carrier ?? shipment.carrier,
                    trackingNumber: payload?.trackingNumber ?? shipment.trackingNumber,
                }
            );
        }

        const finalShipment = await tx.getRepository(Shipment).findOneByOrFail({
            orderId: order.id,
        });

        await tx.getRepository(TrackingEvent).save(
            tx.getRepository(TrackingEvent).create({
                id: uuidv4(),
                shipmentId: finalShipment.id,
                message: payload?.message || `Order status changed to ${status}`,
                location: payload?.location ?? null,
            })
        );
    });

    return deliveryOrdersGet(ctx, { orderId });
}