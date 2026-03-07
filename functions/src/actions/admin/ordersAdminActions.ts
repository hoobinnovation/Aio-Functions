import { EntityManager } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { ActionContext } from '../../core/protocol';
import { AppError } from '../../core/errors';
import { Order } from '../../entities/Order';
import { OrderStatusEvent } from '../../entities/OrderStatusEvent';
import { Shipment } from '../../entities/Shipment';
import { TrackingEvent } from '../../entities/TrackingEvent';
import { InsuranceOrder } from '../../entities/InsuranceOrder';
import { InsuranceItem } from '../../entities/InsuranceItem';
import { InsuranceStatusEvent } from '../../entities/InsuranceStatusEvent';
import { RiskRule } from '../../entities/RiskRule';
import { RiskFlag } from '../../entities/RiskFlag';
import { Branch } from '../../entities/Branch';
import { Device } from '../../entities/Device';
import { Employee } from '../../entities/Employee';
import { Drawer } from '../../entities/Drawer';
import { DrawerSession } from '../../entities/DrawerSession';
import { LedgerEntry } from '../../entities/LedgerEntry';
import { Return } from '../../entities/Return';
import { Refund } from '../../entities/Refund';

async function byId(ctx: ActionContext, entity: any, id: string, message: string) {
    const row = await ctx.db.getRepository(entity).findOneBy({ id } as any);
    if (!row) throw new AppError('NOT_FOUND', message);
    return row;
}

const crud = (entity: any, message: string) => ({
    list: async (ctx: ActionContext, payload: any) => ({
        items: await ctx.db.getRepository(entity).find({
            where: { storeId: payload.storeId } as any,
        }),
    }),

    get: async (ctx: ActionContext, payload: any) => ({
        item: await byId(ctx, entity, payload.id, message),
    }),

    create: async (ctx: ActionContext, payload: any) => {
        const id = uuidv4();

        await ctx.db.transaction(async (tx: EntityManager) => {
            await tx.getRepository(entity).save(
                tx.getRepository(entity).create({
                    id,
                    ...payload,
                }),
            );
        });

        return {
            item: await ctx.db.getRepository(entity).findOneByOrFail({ id } as any),
        };
    },

    update: async (ctx: ActionContext, payload: any) => {
        await ctx.db.transaction(async (tx: EntityManager) => {
            const result = await tx.getRepository(entity).update(
                { id: payload.id } as any,
                payload,
            );

            if (!result.affected) throw new AppError('NOT_FOUND', message);
        });

        return {
            item: await ctx.db.getRepository(entity).findOneByOrFail({ id: payload.id } as any),
        };
    },

    disable: async (ctx: ActionContext, payload: any) => {
        await ctx.db.transaction(async (tx: EntityManager) => {
            const result = await tx.getRepository(entity).update(
                { id: payload.id } as any,
                { status: 'disabled' } as any,
            );

            if (!result.affected) throw new AppError('NOT_FOUND', message);
        });

        return { disabled: true };
    },
});

export async function adminOrdersList(ctx: ActionContext, payload: any) {
    return {
        orders: await ctx.db.getRepository(Order).find({
            where: { storeId: payload.storeId } as any,
            order: { createdAt: 'DESC' as any },
        }),
    };
}

export async function adminOrdersGet(ctx: ActionContext, payload: any) {
    const orderId = String(payload.orderId || payload.id || '').trim();
    return {
        order: await byId(ctx, Order, orderId, 'Order not found'),
    };
}

export async function adminOrdersUpdateStatus(ctx: ActionContext, payload: any) {
    const orderId = String(payload.orderId || payload.id || '').trim();

    await ctx.db.transaction(async (tx: EntityManager) => {
        const result = await tx.getRepository(Order).update(
            { id: orderId } as any,
            { status: payload.status } as any,
        );

        if (!result.affected) throw new AppError('NOT_FOUND', 'Order not found');

        await tx.getRepository(OrderStatusEvent).save(
            tx.getRepository(OrderStatusEvent).create({
                id: uuidv4(),
                orderId,
                status: payload.status,
                note: payload.note ?? null,
                createdByUid: ctx.uid!,
            }),
        );
    });

    return adminOrdersGet(ctx, { orderId });
}

export async function adminOrdersSetTracking(ctx: ActionContext, payload: any) {
    const orderId = String(payload.orderId || payload.id || '').trim();

    await ctx.db.transaction(async (tx: EntityManager) => {
        let shipment = await tx.getRepository(Shipment).findOneBy({ orderId } as any);

        if (!shipment) {
            shipment = tx.getRepository(Shipment).create({
                id: uuidv4(),
                orderId,
                carrier: payload.carrier,
                trackingNumber: payload.trackingNumber,
                status: payload.status || 'in_transit',
            } as any);

            await tx.getRepository(Shipment).save(shipment);
        } else {
            await tx.getRepository(Shipment).update(
                { id: shipment.id } as any,
                {
                    carrier: payload.carrier,
                    trackingNumber: payload.trackingNumber,
                    status: payload.status || shipment.status,
                } as any,
            );
        }
    });

    return adminOrdersTrackingGet(ctx, { orderId });
}

export async function adminOrdersAddInternalNote(ctx: ActionContext, payload: any) {
    const orderId = String(payload.orderId || payload.id || '').trim();

    await ctx.db.transaction(async (tx: EntityManager) => {
        await tx.getRepository(OrderStatusEvent).save(
            tx.getRepository(OrderStatusEvent).create({
                id: uuidv4(),
                orderId,
                status: 'note',
                note: payload.note,
                createdByUid: ctx.uid!,
            }),
        );
    });

    return { added: true };
}

export async function adminOrdersInvoiceUrl(_ctx: ActionContext, payload: any) {
    return {
        invoiceUrl: `gs://invoices/${payload.storeId}/${payload.orderId}.pdf`,
    };
}

export async function adminOrdersTrackingGet(ctx: ActionContext, payload: any) {
    const orderId = String(payload.orderId || payload.id || '').trim();
    const shipment = await ctx.db.getRepository(Shipment).findOneBy({ orderId } as any);

    if (!shipment) return { shipment: null, events: [] };

    const events = await ctx.db.getRepository(TrackingEvent).find({
        where: { shipmentId: shipment.id } as any,
        order: { createdAt: 'ASC' as any },
    });

    return { shipment, events };
}

export async function adminOrdersTrackingAddEvent(ctx: ActionContext, payload: any) {
    await ctx.db.transaction(async (tx: EntityManager) => {
        await tx.getRepository(TrackingEvent).save(
            tx.getRepository(TrackingEvent).create({
                id: uuidv4(),
                shipmentId: payload.shipmentId,
                message: payload.message,
                location: payload.location ?? null,
            }),
        );
    });

    return adminOrdersTrackingGet(ctx, { orderId: payload.orderId });
}

export async function adminOrdersTrackingDeleteEvent(ctx: ActionContext, payload: any) {
    await ctx.db.transaction(async (tx: EntityManager) => {
        await tx.getRepository(TrackingEvent).delete({ id: payload.id } as any);
    });

    return { deleted: true };
}

export async function adminOrdersTrackingUpdateShipment(ctx: ActionContext, payload: any) {
    await ctx.db.transaction(async (tx: EntityManager) => {
        await tx.getRepository(Shipment).update(
            { id: payload.shipmentId } as any,
            {
                status: payload.status,
                carrier: payload.carrier,
                trackingNumber: payload.trackingNumber,
            } as any,
        );
    });

    return { updated: true };
}

export async function adminInsuranceList(ctx: ActionContext, payload: any) {
    return {
        orders: await ctx.db.getRepository(InsuranceOrder).find({
            where: { storeId: payload.storeId } as any,
            order: { createdAt: 'DESC' as any },
        }),
    };
}

export async function adminInsuranceGet(ctx: ActionContext, payload: any) {
    const insuranceOrderId = String(payload.insuranceOrderId || payload.id || '').trim();
    const insuranceOrder = await byId(ctx, InsuranceOrder, insuranceOrderId, 'Insurance order not found');
    const items = await ctx.db.getRepository(InsuranceItem).find({
        where: { insuranceOrderId: insuranceOrder.id } as any,
    });

    return { insuranceOrder, items };
}

export async function adminInsuranceAddItem(ctx: ActionContext, payload: any) {
    await ctx.db.transaction(async (tx: EntityManager) => {
        await tx.getRepository(InsuranceItem).save(
            tx.getRepository(InsuranceItem).create({
                id: uuidv4(),
                ...payload,
            }),
        );
    });

    return adminInsuranceGet(ctx, { insuranceOrderId: payload.insuranceOrderId });
}

export async function adminInsuranceUpdateItem(ctx: ActionContext, payload: any) {
    await ctx.db.transaction(async (tx: EntityManager) => {
        await tx.getRepository(InsuranceItem).update({ id: payload.id } as any, payload);
    });

    return adminInsuranceGet(ctx, { insuranceOrderId: payload.insuranceOrderId });
}

export async function adminInsuranceRemoveItem(ctx: ActionContext, payload: any) {
    await ctx.db.transaction(async (tx: EntityManager) => {
        await tx.getRepository(InsuranceItem).delete({ id: payload.id } as any);
    });

    return { deleted: true };
}

export async function adminInsuranceLockQuote(ctx: ActionContext, payload: any) {
    await ctx.db.transaction(async (tx: EntityManager) => {
        await tx.getRepository(InsuranceOrder).update(
            { id: payload.insuranceOrderId } as any,
            {
                quoteLocked: true,
                deliveryCentsX2Applied: true,
                status: 'quoted',
            } as any,
        );

        await tx.getRepository(InsuranceStatusEvent).save(
            tx.getRepository(InsuranceStatusEvent).create({
                id: uuidv4(),
                insuranceOrderId: payload.insuranceOrderId,
                status: 'quoted',
                note: 'locked quote',
                createdByUid: ctx.uid!,
            }),
        );
    });

    return adminInsuranceGet(ctx, { insuranceOrderId: payload.insuranceOrderId });
}

export async function adminInsuranceSendQuote(ctx: ActionContext, payload: any) {
    await ctx.db.transaction(async (tx: EntityManager) => {
        await tx.getRepository(InsuranceOrder).update(
            { id: payload.insuranceOrderId } as any,
            { status: 'quoted' } as any,
        );
    });

    return adminInsuranceGet(ctx, { insuranceOrderId: payload.insuranceOrderId });
}

export async function adminInsuranceSetShipmentTracking(_ctx: ActionContext, payload: any) {
    return {
        insuranceOrderId: payload.insuranceOrderId,
        tracking: {
            carrier: payload.carrier,
            trackingNumber: payload.trackingNumber,
        },
    };
}

export async function adminRiskRulesGet(ctx: ActionContext, payload: any) {
    let rules = await ctx.db.getRepository(RiskRule).findOneBy({ storeId: payload.storeId } as any);

    if (!rules) {
        rules = ctx.db.getRepository(RiskRule).create({
            storeId: payload.storeId,
            config: {},
        });
    }

    return { rules };
}

export async function adminRiskRulesUpdate(ctx: ActionContext, payload: any) {
    await ctx.db.transaction(async (tx: EntityManager) => {
        await tx.getRepository(RiskRule).upsert(
            {
                storeId: payload.storeId,
                config: payload.config,
            },
            ['storeId'],
        );
    });

    return adminRiskRulesGet(ctx, payload);
}

export async function adminRiskFlaggedOrdersList(ctx: ActionContext, payload: any) {
    return {
        flags: await ctx.db.getRepository(RiskFlag).find({
            where: { status: 'flagged' } as any,
            take: payload.limit || 100,
        }),
    };
}

export async function adminRiskFlaggedOrdersResolve(ctx: ActionContext, payload: any) {
    await ctx.db.transaction(async (tx: EntityManager) => {
        await tx.getRepository(RiskFlag).update(
            { id: payload.id } as any,
            {
                status: 'resolved',
                resolvedByUid: ctx.uid!,
                resolvedAt: new Date(),
            } as any,
        );
    });

    return { resolved: true };
}

const branchCrud = crud(Branch, 'Branch not found');
export const adminBranchesList = branchCrud.list;
export const adminBranchesCreate = branchCrud.create;
export const adminBranchesUpdate = branchCrud.update;
export const adminBranchesDisable = branchCrud.disable;

const deviceCrud = crud(Device, 'Device not found');
export const adminDevicesList = deviceCrud.list;
export const adminDevicesCreate = deviceCrud.create;
export const adminDevicesUpdate = deviceCrud.update;
export const adminDevicesDisable = deviceCrud.disable;

const employeeCrud = crud(Employee, 'Employee not found');
export const adminEmployeesList = employeeCrud.list;
export const adminEmployeesCreate = employeeCrud.create;
export const adminEmployeesUpdate = employeeCrud.update;
export const adminEmployeesDisable = employeeCrud.disable;

const drawerCrud = crud(Drawer, 'Drawer not found');
export const adminDrawersList = drawerCrud.list;
export const adminDrawersCreate = drawerCrud.create;
export const adminDrawersUpdate = drawerCrud.update;
export const adminDrawersDisable = drawerCrud.disable;

export async function adminDrawerSessionsOpen(ctx: ActionContext, payload: any) {
    const id = uuidv4();

    await ctx.db.transaction(async (tx: EntityManager) => {
        await tx.getRepository(DrawerSession).save(
            tx.getRepository(DrawerSession).create({
                id,
                drawerId: payload.drawerId,
                openedByUid: ctx.uid!,
                openedAt: new Date(),
                closedByUid: null,
                closedAt: null,
                openingBalanceCents: String(payload.openingBalanceCents),
                closingBalanceCents: null,
            }),
        );
    });

    return {
        session: await ctx.db.getRepository(DrawerSession).findOneByOrFail({ id } as any),
    };
}

export async function adminDrawerSessionsClose(ctx: ActionContext, payload: any) {
    await ctx.db.transaction(async (tx: EntityManager) => {
        const session = await tx.getRepository(DrawerSession).findOneBy({ id: payload.sessionId } as any);

        if (!session || session.closedAt) {
            throw new AppError('VALIDATION_ERROR', 'Session not open');
        }

        await tx.getRepository(DrawerSession).update(
            { id: session.id } as any,
            {
                closedByUid: ctx.uid!,
                closedAt: new Date(),
                closingBalanceCents: String(payload.closingBalanceCents),
            } as any,
        );
    });

    return { closed: true };
}

async function ledger(ctx: ActionContext, payload: any, type: string) {
    const id = uuidv4();

    await ctx.db.transaction(async (tx: EntityManager) => {
        await tx.getRepository(LedgerEntry).save(
            tx.getRepository(LedgerEntry).create({
                id,
                storeId: payload.storeId,
                amountCents: String(payload.amountCents),
                type,
                channel: payload.channel || 'backoffice',
                branchId: payload.branchId ?? null,
                deviceId: payload.deviceId ?? null,
                employeeId: payload.employeeId ?? null,
                drawerSessionId: payload.drawerSessionId ?? null,
                refType: type,
                refId: id,
            }),
        );
    });

    return {
        entry: await ctx.db.getRepository(LedgerEntry).findOneByOrFail({ id } as any),
    };
}

export async function adminAccountingKpis(ctx: ActionContext, payload: any) {
    const rows = await ctx.db.query(
        'SELECT SUM(amountCents) net, COUNT(*) count FROM ledger_entries WHERE storeId=?',
        [payload.storeId],
    );
    return { kpis: rows[0] };
}

export async function adminAccountingLedger(ctx: ActionContext, payload: any) {
    return {
        entries: await ctx.db.getRepository(LedgerEntry).find({
            where: { storeId: payload.storeId } as any,
            order: { createdAt: 'DESC' as any },
            take: payload.limit || 100,
        }),
    };
}

export async function adminAccountingCreateExpense(ctx: ActionContext, payload: any) {
    return ledger(ctx, { ...payload, amountCents: -Math.abs(payload.amountCents) }, 'expense');
}

export async function adminAccountingCreateAdjustment(ctx: ActionContext, payload: any) {
    return ledger(ctx, payload, 'adjustment');
}

export async function adminAccountingCreatePOSSale(ctx: ActionContext, payload: any) {
    return ledger(ctx, { ...payload, channel: 'POS' }, 'pos_sale');
}

export async function reportsOverview(ctx: ActionContext, payload: any) {
    const overview = await ctx.db.query(
        'SELECT COUNT(*) orders, SUM(totalCents) sales FROM orders WHERE storeId=?',
        [payload.storeId],
    );
    return { overview: overview[0] };
}

export async function reportsTopProducts(ctx: ActionContext, payload: any) {
    const rows = await ctx.db.query(
        'SELECT productId, SUM(qty) qty FROM order_items oi JOIN orders o ON o.id=oi.orderId WHERE o.storeId=? GROUP BY productId ORDER BY qty DESC LIMIT ?',
        [payload.storeId, payload.limit || 10],
    );
    return { rows };
}

export async function reportsOrdersByStatus(ctx: ActionContext, payload: any) {
    const rows = await ctx.db.query(
        'SELECT status, COUNT(*) c FROM orders WHERE storeId=? GROUP BY status',
        [payload.storeId],
    );
    return { rows };
}

export async function reportsInventorySummary(ctx: ActionContext, payload: any) {
    const rows = await ctx.db.query(
        'SELECT COUNT(*) variants, SUM(stockQty) stock FROM product_variants pv JOIN products p ON p.id=pv.productId WHERE p.storeId=?',
        [payload.storeId],
    );
    return { summary: rows[0] };
}

export async function reportsCustomersSummary(ctx: ActionContext, payload: any) {
    const rows = await ctx.db.query(
        'SELECT COUNT(DISTINCT uid) customers FROM orders WHERE storeId=?',
        [payload.storeId],
    );
    return { summary: rows[0] };
}

export async function reportsReturnsSummary(ctx: ActionContext, payload: any) {
    const rows = await ctx.db.query(
        'SELECT COUNT(*) returnsCount FROM returns WHERE storeId=?',
        [payload.storeId],
    );
    return { summary: rows[0] };
}

export async function reportsLoyaltySummary(ctx: ActionContext, payload: any) {
    const rows = await ctx.db.query(
        'SELECT SUM(pointsDelta) points FROM loyalty_transactions WHERE storeId=?',
        [payload.storeId],
    );
    return { summary: rows[0] };
}

export async function reportsCashbackSummary(ctx: ActionContext, payload: any) {
    const rows = await ctx.db.query(
        'SELECT COUNT(*) offers FROM cashback_offers WHERE storeId=?',
        [payload.storeId],
    );
    return { summary: rows[0] };
}

export async function adminReturnsList(ctx: ActionContext, payload: any) {
    return {
        returns: await ctx.db.getRepository(Return).find({
            where: { storeId: payload.storeId } as any,
            order: { requestedAt: 'DESC' as any },
        }),
    };
}

export async function adminReturnsGet(ctx: ActionContext, payload: any) {
    const returnId = String(payload.returnId || payload.id || '').trim();

    if (!returnId) {
        throw new AppError('VALIDATION_ERROR', 'returnId is required');
    }

    return {
        return: await byId(ctx, Return, returnId, 'Return not found'),
    };
}

export async function adminReturnsApprove(ctx: ActionContext, payload: any) {
    const returnId = String(payload.returnId || payload.id || '').trim();

    if (!returnId) {
        throw new AppError('VALIDATION_ERROR', 'returnId is required');
    }

    await ctx.db.transaction(async (tx: EntityManager) => {
        const result = await tx.getRepository(Return).update(
            { id: returnId } as any,
            {
                status: 'approved',
                approvedAt: new Date(),
            } as any,
        );

        if (!result.affected) throw new AppError('NOT_FOUND', 'Return not found');
    });

    return adminReturnsGet(ctx, { returnId });
}

export async function adminReturnsReject(ctx: ActionContext, payload: any) {
    const returnId = String(payload.returnId || payload.id || '').trim();

    if (!returnId) {
        throw new AppError('VALIDATION_ERROR', 'returnId is required');
    }

    await ctx.db.transaction(async (tx: EntityManager) => {
        const result = await tx.getRepository(Return).update(
            { id: returnId } as any,
            {
                status: 'rejected',
                rejectedAt: new Date(),
            } as any,
        );

        if (!result.affected) throw new AppError('NOT_FOUND', 'Return not found');
    });

    return adminReturnsGet(ctx, { returnId });
}

export async function adminReturnsRefundPartial(ctx: ActionContext, payload: any) {
    const returnId = String(payload.returnId || payload.id || '').trim();

    if (!returnId) {
        throw new AppError('VALIDATION_ERROR', 'returnId is required');
    }

    const rawAmount =
        payload.amountCents !== undefined && payload.amountCents !== null
            ? payload.amountCents
            : payload.amount;

    const amountCents = Number(rawAmount);

    if (!Number.isFinite(amountCents) || amountCents <= 0) {
        throw new AppError('VALIDATION_ERROR', 'amountCents must be greater than 0');
    }

    const refundId = uuidv4();

    await ctx.db.transaction(async (tx: EntityManager) => {
        const existingReturn = await tx.getRepository(Return).findOneBy({ id: returnId } as any);
        if (!existingReturn) throw new AppError('NOT_FOUND', 'Return not found');

        await tx.getRepository(Refund).save(
            tx.getRepository(Refund).create({
                id: refundId,
                returnId,
                amountCents: String(Math.round(amountCents)),
                method: payload.method || 'manual',
                status: 'completed',
            }),
        );

        await tx.getRepository(Return).update(
            { id: returnId } as any,
            { status: 'refunded' } as any,
        );
    });

    return {
        refund: await ctx.db.getRepository(Refund).findOneByOrFail({ id: refundId } as any),
    };
}

export async function adminReturnsRefundFull(ctx: ActionContext, payload: any) {
    const returnId = String(payload.returnId || payload.id || '').trim();

    if (!returnId) {
        throw new AppError('VALIDATION_ERROR', 'returnId is required');
    }

    const returnRow = await byId(ctx, Return, returnId, 'Return not found');
    const order = await byId(ctx, Order, (returnRow as any).orderId, 'Order not found');

    return adminReturnsRefundPartial(ctx, {
        returnId,
        amountCents: Number((order as any).totalCents),
        method: payload.method || 'original',
    });
}

export async function adminReturnsUpdateStatus(ctx: ActionContext, payload: any) {
    const returnId = String(payload.returnId || payload.id || '').trim();

    if (!returnId) {
        throw new AppError('VALIDATION_ERROR', 'returnId is required');
    }

    if (!payload.status) {
        throw new AppError('VALIDATION_ERROR', 'status is required');
    }

    await ctx.db.transaction(async (tx: EntityManager) => {
        const result = await tx.getRepository(Return).update(
            { id: returnId } as any,
            { status: payload.status } as any,
        );

        if (!result.affected) throw new AppError('NOT_FOUND', 'Return not found');
    });

    return adminReturnsGet(ctx, { returnId });
}