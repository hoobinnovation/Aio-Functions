import { AccountingAccount } from '../../../../../entities/AccountingAccount';
import { AccountingJournalEntry } from '../../../../../entities/AccountingJournalEntry';
import { AccountingJournalEntryLine } from '../../../../../entities/AccountingJournalEntryLine';
import { AccountingPeriod } from '../../../../../entities/AccountingPeriod';
import { AccountingPostingEvent } from '../../../../../entities/AccountingPostingEvent';
import { AccountingPostingRule } from '../../../../../entities/AccountingPostingRule';
import { Branch } from '../../../../../entities/Branch';
import { addSkip, upsertById } from '../seederUtils';
import { SeedContext, SeedSummary } from '../types';
import { dateOnly, getStoreBranches, scopedId } from './seedHelpers';

export async function seedAccountingAdvanced(ctx: SeedContext, summary: SeedSummary) {
    const storeId = ctx.storeId!;
    const branches = await getStoreBranches(ctx);
    const branchId = branches[0]?.id ?? null;

    const periodId = scopedId(storeId, 'accPeriod', 1);
    const cashId = scopedId(storeId, 'accCash', 1);
    const revenueId = scopedId(storeId, 'accRevenue', 1);
    const arId = scopedId(storeId, 'accAR', 1);
    const cogsId = scopedId(storeId, 'accCOGS', 1);
    const inventoryId = scopedId(storeId, 'accInventory', 1);
    const entryId = scopedId(storeId, 'accEntry', 1);
    const postingEventId = scopedId(storeId, 'accEvent', 1);

    await upsertById(ctx.manager, AccountingPeriod, 'AccountingPeriod', {
        id: periodId,
        storeId,
        fiscalYear: ctx.now.getUTCFullYear(),
        periodCode: `${ctx.now.getUTCFullYear()}-${String(ctx.now.getUTCMonth() + 1).padStart(2, '0')}`,
        startDate: `${ctx.now.getUTCFullYear()}-${String(ctx.now.getUTCMonth() + 1).padStart(2, '0')}-01`,
        endDate: `${ctx.now.getUTCFullYear()}-${String(ctx.now.getUTCMonth() + 1).padStart(2, '0')}-28`,
        status: 'open',
        closedAt: null,
        closedByUid: null,
    }, summary);

    await upsertById(ctx.manager, AccountingAccount, 'AccountingAccount', {
        id: cashId,
        storeId,
        parentId: null,
        code: '1110',
        name: 'Cash on Hand',
        type: 'asset',
        normalSide: 'debit',
        isActive: true,
        allowPosting: true,
        isSystem: true,
    }, summary);

    await upsertById(ctx.manager, AccountingAccount, 'AccountingAccount', {
        id: arId,
        storeId,
        parentId: null,
        code: '1120',
        name: 'Accounts Receivable',
        type: 'asset',
        normalSide: 'debit',
        isActive: true,
        allowPosting: true,
        isSystem: true,
    }, summary);

    await upsertById(ctx.manager, AccountingAccount, 'AccountingAccount', {
        id: inventoryId,
        storeId,
        parentId: null,
        code: '1310',
        name: 'Inventory',
        type: 'asset',
        normalSide: 'debit',
        isActive: true,
        allowPosting: true,
        isSystem: true,
    }, summary);

    await upsertById(ctx.manager, AccountingAccount, 'AccountingAccount', {
        id: revenueId,
        storeId,
        parentId: null,
        code: '4110',
        name: 'Sales Revenue',
        type: 'revenue',
        normalSide: 'credit',
        isActive: true,
        allowPosting: true,
        isSystem: true,
    }, summary);

    await upsertById(ctx.manager, AccountingAccount, 'AccountingAccount', {
        id: cogsId,
        storeId,
        parentId: null,
        code: '5110',
        name: 'Cost of Goods Sold',
        type: 'cogs',
        normalSide: 'debit',
        isActive: true,
        allowPosting: true,
        isSystem: true,
    }, summary);

    await upsertById(ctx.manager, AccountingPostingRule, 'AccountingPostingRule', {
        id: scopedId(storeId, 'postingRule', 1),
        storeId,
        ruleKey: 'order_paid_cash',
        documentType: 'order',
        eventKey: 'paid',
        priority: 100,
        isActive: true,
        configJson: {
            debitAccountId: cashId,
            creditAccountId: revenueId,
        },
    }, summary);

    await upsertById(ctx.manager, AccountingPostingRule, 'AccountingPostingRule', {
        id: scopedId(storeId, 'postingRule', 2),
        storeId,
        ruleKey: 'inventory_issue_sale',
        documentType: 'order',
        eventKey: 'delivered',
        priority: 110,
        isActive: true,
        configJson: {
            debitAccountId: cogsId,
            creditAccountId: inventoryId,
        },
    }, summary);

    await upsertById(ctx.manager, AccountingJournalEntry, 'AccountingJournalEntry', {
        id: entryId,
        storeId,
        periodId,
        entryDate: dateOnly(ctx.now),
        status: 'posted',
        documentType: 'order',
        documentId: `seed-order-${storeId.slice(-4)}`,
        sourceContext: { channel: 'seed', type: 'order_cash_sale' },
        memo: 'Seed posted journal entry',
        postedAt: ctx.now,
        postedByUid: ctx.demoUids.adminAnalystUid,
        reversedAt: null,
        reversedByUid: null,
        reversalOfEntryId: null,
        createdByUid: ctx.demoUids.adminAnalystUid,
    }, summary);

    await upsertById(ctx.manager, AccountingJournalEntryLine, 'AccountingJournalEntryLine', {
        id: scopedId(storeId, 'entryLine', 1),
        entryId,
        accountId: cashId,
        lineNo: 1,
        description: 'Cash sale debit',
        debitCents: '77000',
        creditCents: '0',
        currencyCode: 'EGP',
        branchId,
    }, summary);

    await upsertById(ctx.manager, AccountingJournalEntryLine, 'AccountingJournalEntryLine', {
        id: scopedId(storeId, 'entryLine', 2),
        entryId,
        accountId: revenueId,
        lineNo: 2,
        description: 'Revenue credit',
        debitCents: '0',
        creditCents: '77000',
        currencyCode: 'EGP',
        branchId,
    }, summary);

    await upsertById(ctx.manager, AccountingPostingEvent, 'AccountingPostingEvent', {
        id: postingEventId,
        storeId,
        sourceDocumentType: 'order',
        sourceDocumentId: `seed-order-${storeId.slice(-4)}`,
        sourceEventType: 'paid',
        status: 'posted',
        journalEntryId: entryId,
        errorCode: null,
        errorMessage: null,
        metadata: { seed: true },
        createdByUid: ctx.demoUids.adminAnalystUid,
        postedAt: ctx.now,
    }, summary);
}