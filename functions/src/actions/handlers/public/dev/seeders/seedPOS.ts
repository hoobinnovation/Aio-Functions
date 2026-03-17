import { LedgerEntry } from '../../../../../entities/LedgerEntry';
import { POSReturn } from '../../../../../entities/POSReturn';
import { POSReturnItem } from '../../../../../entities/POSReturnItem';
import { POSSale } from '../../../../../entities/POSSale';
import { POSSaleItem } from '../../../../../entities/POSSaleItem';
import { POSSalePayment } from '../../../../../entities/POSSalePayment';
import { POSSession } from '../../../../../entities/POSSession';
import { StockMovement } from '../../../../../entities/StockMovement';
import { addSkip, upsertById } from '../seederUtils';
import { SeedContext, SeedSummary } from '../types';
import { ensurePOSInfra, getAnyCustomers, getStoreProducts, getStoreVariants, scopedId } from './seedHelpers';

export async function seedPOS(ctx: SeedContext, summary: SeedSummary) {
    const infra = await ensurePOSInfra(ctx);
    const variants = await getStoreVariants(ctx);
    const products = await getStoreProducts(ctx);
    const customers = await getAnyCustomers(ctx);

    if (!infra || !variants.length || !products.length) {
        addSkip(summary, 'POS', `Missing infra/catalog for storeId=${ctx.storeId}`);
        return;
    }

    const storeId = ctx.storeId!;
    const posSessionId = scopedId(storeId, 'posSession', 1);
    const posSaleId = scopedId(storeId, 'posSale', 1);
    const posReturnId = scopedId(storeId, 'posReturn', 1);

    await upsertById(ctx.manager, POSSession, 'POSSession', {
        id: posSessionId,
        storeId,
        branchId: infra.branch.id,
        deviceId: infra.deviceId,
        employeeId: infra.employeeId,
        drawerSessionId: infra.drawerSessionId,
        status: 'open',
        openingFloatCents: '500000',
        expectedCashCents: '575000',
        actualCashCents: null,
        varianceCents: null,
        note: 'Seed POS open session',
        openedByUid: ctx.demoUids.adminOpsUid,
        closedByUid: null,
        closedAt: null,
    }, summary);

    const selectedProducts = products.slice(0, 2);
    const selectedVariants = variants.slice(0, 2);
    const customer = customers[0];

    await upsertById(ctx.manager, POSSale, 'POSSale', {
        id: posSaleId,
        storeId,
        branchId: infra.branch.id,
        deviceId: infra.deviceId,
        employeeId: infra.employeeId,
        posSessionId,
        drawerSessionId: infra.drawerSessionId,
        customerUid: customer?.uid ?? null,
        status: 'completed',
        subtotalCents: '75000',
        discountCents: '5000',
        taxCents: '7000',
        totalCents: '77000',
        note: 'Seed POS sale',
        externalRef: `POS-${storeId.slice(-6)}-001`,
        createdByUid: ctx.demoUids.adminOpsUid,
    }, summary);

    for (let i = 0; i < selectedVariants.length; i += 1) {
        await upsertById(ctx.manager, POSSaleItem, 'POSSaleItem', {
            id: scopedId(storeId, 'posSaleItem', i + 1),
            posSaleId,
            productId: selectedProducts[i]?.id ?? selectedProducts[0].id,
            variantId: selectedVariants[i].id,
            nameSnapshot: selectedProducts[i]?.name ?? selectedProducts[0].name,
            unitPriceCents: String(25000 + i * 10000),
            qty: i === 0 ? '2' : '1',
            lineTotalCents: i === 0 ? '50000' : '25000',
        }, summary);

        await upsertById(ctx.manager, StockMovement, 'StockMovement', {
            id: scopedId(storeId, 'posIssue', i + 1),
            storeId,
            variantId: selectedVariants[i].id,
            warehouseId: null,
            warehouseLocationId: null,
            lotId: null,
            movementType: 'sale_issue',
            qtyDelta: i === 0 ? '-2' : '-1',
            beforeQty: i === 0 ? '20' : '15',
            afterQty: i === 0 ? '18' : '14',
            unitCostCents: i === 0 ? '10000' : '12000',
            totalCostCents: i === 0 ? '20000' : '12000',
            sourceDocumentType: 'pos_sale',
            sourceDocumentId: posSaleId,
            sourceLineId: scopedId(storeId, 'posSaleItem', i + 1),
            note: 'Seed POS issue',
            createdByUid: ctx.demoUids.adminOpsUid,
        }, summary);
    }

    await upsertById(ctx.manager, POSSalePayment, 'POSSalePayment', {
        id: scopedId(storeId, 'posPayment', 1),
        posSaleId,
        tenderType: 'cash',
        amountCents: '77000',
        referenceNo: `CASH-${storeId.slice(-4)}`,
        status: 'captured',
    }, summary);

    await upsertById(ctx.manager, LedgerEntry, 'LedgerEntry', {
        id: scopedId(storeId, 'posLedgerSale', 1),
        storeId,
        amountCents: '77000',
        type: 'sale',
        channel: 'pos',
        branchId: infra.branch.id,
        deviceId: infra.deviceId,
        employeeId: infra.employeeId,
        drawerSessionId: infra.drawerSessionId,
        refType: 'pos_sale',
        refId: posSaleId,
    }, summary);

    await upsertById(ctx.manager, POSReturn, 'POSReturn', {
        id: posReturnId,
        storeId,
        posSaleId,
        posSessionId,
        drawerSessionId: infra.drawerSessionId,
        employeeId: infra.employeeId,
        status: 'completed',
        totalRefundCents: '25000',
        note: 'Seed POS return',
        createdByUid: ctx.demoUids.adminOpsUid,
    }, summary);

    await upsertById(ctx.manager, POSReturnItem, 'POSReturnItem', {
        id: scopedId(storeId, 'posReturnItem', 1),
        posReturnId,
        posSaleItemId: scopedId(storeId, 'posSaleItem', 2),
        variantId: selectedVariants[1]?.id ?? selectedVariants[0].id,
        qty: '1',
        unitPriceCents: '25000',
        lineRefundCents: '25000',
    }, summary);

    await upsertById(ctx.manager, StockMovement, 'StockMovement', {
        id: scopedId(storeId, 'posReturnIn', 1),
        storeId,
        variantId: selectedVariants[1]?.id ?? selectedVariants[0].id,
        warehouseId: null,
        warehouseLocationId: null,
        lotId: null,
        movementType: 'return_in',
        qtyDelta: '1',
        beforeQty: '14',
        afterQty: '15',
        unitCostCents: '12000',
        totalCostCents: '12000',
        sourceDocumentType: 'pos_return',
        sourceDocumentId: posReturnId,
        sourceLineId: scopedId(storeId, 'posReturnItem', 1),
        note: 'Seed POS return back to stock',
        createdByUid: ctx.demoUids.adminOpsUid,
    }, summary);

    await upsertById(ctx.manager, LedgerEntry, 'LedgerEntry', {
        id: scopedId(storeId, 'posLedgerRefund', 1),
        storeId,
        amountCents: '-25000',
        type: 'refund',
        channel: 'pos',
        branchId: infra.branch.id,
        deviceId: infra.deviceId,
        employeeId: infra.employeeId,
        drawerSessionId: infra.drawerSessionId,
        refType: 'pos_return',
        refId: posReturnId,
    }, summary);
}