import { EntityManager } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { ActionContext } from '../../core/protocol';
import { AppError } from '../../core/errors';
import { AccountsReceivableDocument } from '../../entities/AccountsReceivableDocument';
import { AccountsPayableDocument } from '../../entities/AccountsPayableDocument';
import { TaxCode } from '../../entities/TaxCode';
import { TaxRate } from '../../entities/TaxRate';
import { TaxAssignment } from '../../entities/TaxAssignment';
import { FinancialAccount } from '../../entities/FinancialAccount';
import { ReconciliationSession } from '../../entities/ReconciliationSession';
import { ReconciliationTransaction } from '../../entities/ReconciliationTransaction';
import { applyPayableSettlement, applyReceivableSettlement, reconcileTransaction } from '../../core/finance/financialControlService';

function normDate(v?: string): string {
  return v && v.length >= 10 ? v.slice(0, 10) : new Date().toISOString().slice(0, 10);
}

export async function adminArDocumentsList(ctx: ActionContext, payload: any) {
  return { items: await ctx.db.getRepository(AccountsReceivableDocument).find({ where: { storeId: payload?.storeId ?? ctx.storeId }, order: { dueDate: 'ASC' as any } }) };
}
export async function adminArDocumentsCreate(ctx: ActionContext, payload: any) {
  const id = uuidv4();
  const issueDate = normDate(payload.issueDate);
  const dueDate = normDate(payload.dueDate ?? payload.issueDate);
  const totalCents = Math.round(Number(payload.totalCents ?? 0));
  if (totalCents <= 0) throw new AppError('VALIDATION_FAILED', 'totalCents must be positive');
  await ctx.db.getRepository(AccountsReceivableDocument).save(ctx.db.getRepository(AccountsReceivableDocument).create({
    id, storeId: payload.storeId ?? ctx.storeId, customerUid: payload.customerUid, sourceDocumentType: payload.sourceDocumentType, sourceDocumentId: payload.sourceDocumentId,
    documentNo: payload.documentNo, issueDate, dueDate, totalCents: String(totalCents), settledCents: '0', outstandingCents: String(totalCents),
    approvalState: payload.approvalState ?? 'approved', status: 'open', accountingAccountId: payload.accountingAccountId ?? null, journalEntryId: payload.journalEntryId ?? null, createdByUid: ctx.uid ?? null,
  }));
  return { document: await ctx.db.getRepository(AccountsReceivableDocument).findOneByOrFail({ id }) };
}
export async function adminArDocumentsSettle(ctx: ActionContext, payload: any) {
  const document = await ctx.db.transaction((tx: EntityManager) => applyReceivableSettlement(tx, {
    storeId: payload.storeId ?? ctx.storeId,
    receivableDocumentId: payload.receivableDocumentId,
    settlementDate: normDate(payload.settlementDate),
    amountCents: Math.round(Number(payload.amountCents ?? 0)),
    method: payload.method,
    financialAccountId: payload.financialAccountId ?? null,
    journalEntryId: payload.journalEntryId ?? null,
    sourceReference: payload.sourceReference ?? null,
    actorUid: ctx.uid ?? null,
  }));
  return { document };
}

export async function adminApDocumentsList(ctx: ActionContext, payload: any) {
  return { items: await ctx.db.getRepository(AccountsPayableDocument).find({ where: { storeId: payload?.storeId ?? ctx.storeId }, order: { dueDate: 'ASC' as any } }) };
}
export async function adminApDocumentsCreate(ctx: ActionContext, payload: any) {
  const id = uuidv4();
  const issueDate = normDate(payload.issueDate);
  const dueDate = normDate(payload.dueDate ?? payload.issueDate);
  const totalCents = Math.round(Number(payload.totalCents ?? 0));
  if (totalCents <= 0) throw new AppError('VALIDATION_FAILED', 'totalCents must be positive');
  await ctx.db.getRepository(AccountsPayableDocument).save(ctx.db.getRepository(AccountsPayableDocument).create({
    id, storeId: payload.storeId ?? ctx.storeId, supplierId: payload.supplierId, sourceDocumentType: payload.sourceDocumentType, sourceDocumentId: payload.sourceDocumentId,
    documentNo: payload.documentNo, issueDate, dueDate, totalCents: String(totalCents), settledCents: '0', outstandingCents: String(totalCents),
    approvalState: payload.approvalState ?? 'approved', status: 'open', accountingAccountId: payload.accountingAccountId ?? null, journalEntryId: payload.journalEntryId ?? null, createdByUid: ctx.uid ?? null,
  }));
  return { document: await ctx.db.getRepository(AccountsPayableDocument).findOneByOrFail({ id }) };
}
export async function adminApDocumentsSettle(ctx: ActionContext, payload: any) {
  const document = await ctx.db.transaction((tx: EntityManager) => applyPayableSettlement(tx, {
    storeId: payload.storeId ?? ctx.storeId,
    payableDocumentId: payload.payableDocumentId,
    settlementDate: normDate(payload.settlementDate),
    amountCents: Math.round(Number(payload.amountCents ?? 0)),
    method: payload.method,
    financialAccountId: payload.financialAccountId ?? null,
    journalEntryId: payload.journalEntryId ?? null,
    sourceReference: payload.sourceReference ?? null,
    actorUid: ctx.uid ?? null,
  }));
  return { document };
}

export async function adminTaxCodesList(ctx: ActionContext, payload: any) {
  const storeId = payload?.storeId ?? ctx.storeId ?? null;
  const qb = ctx.db.getRepository(TaxCode).createQueryBuilder('t').orderBy('t.code', 'ASC');
  if (storeId) qb.where('t.storeId = :storeId OR t.storeId IS NULL', { storeId });
  return { items: await qb.getMany() };
}
export async function adminTaxCodesCreate(ctx: ActionContext, payload: any) {
  const id = uuidv4();
  await ctx.db.transaction(async (tx: EntityManager) => {
    await tx.getRepository(TaxCode).save(tx.getRepository(TaxCode).create({ id, storeId: payload.storeId ?? ctx.storeId ?? null, code: payload.code, name: payload.name, taxType: payload.taxType, classification: payload.classification, direction: payload.direction ?? 'output', isActive: payload.isActive ?? true }));
    if (payload.rate !== undefined) {
      await tx.getRepository(TaxRate).save(tx.getRepository(TaxRate).create({ id: uuidv4(), taxCodeId: id, rate: String(payload.rate), effectiveFrom: normDate(payload.effectiveFrom), effectiveTo: payload.effectiveTo ? normDate(payload.effectiveTo) : null, isCompound: payload.isCompound ?? false, isInclusive: payload.isInclusive ?? false }));
    }
  });
  return { taxCode: await ctx.db.getRepository(TaxCode).findOneByOrFail({ id }) };
}
export async function adminTaxAssignmentsCreate(ctx: ActionContext, payload: any) {
  const id = uuidv4();
  await ctx.db.getRepository(TaxAssignment).save(ctx.db.getRepository(TaxAssignment).create({ id, storeId: payload.storeId ?? ctx.storeId ?? null, taxCodeId: payload.taxCodeId, contextType: payload.contextType, contextId: payload.contextId, isActive: payload.isActive ?? true }));
  return { assignment: await ctx.db.getRepository(TaxAssignment).findOneByOrFail({ id }) };
}

export async function adminFinancialAccountsList(ctx: ActionContext, payload: any) {
  return { items: await ctx.db.getRepository(FinancialAccount).find({ where: { storeId: payload?.storeId ?? ctx.storeId }, order: { code: 'ASC' as any } }) };
}
export async function adminFinancialAccountsCreate(ctx: ActionContext, payload: any) {
  const id = uuidv4();
  await ctx.db.getRepository(FinancialAccount).save(ctx.db.getRepository(FinancialAccount).create({ id, storeId: payload.storeId ?? ctx.storeId, type: payload.type, code: payload.code, name: payload.name, institutionName: payload.institutionName ?? null, accountNumberMasked: payload.accountNumberMasked ?? null, accountingAccountId: payload.accountingAccountId, isActive: payload.isActive ?? true }));
  return { account: await ctx.db.getRepository(FinancialAccount).findOneByOrFail({ id }) };
}

export async function adminReconciliationSessionsCreate(ctx: ActionContext, payload: any) {
  const id = uuidv4();
  await ctx.db.getRepository(ReconciliationSession).save(ctx.db.getRepository(ReconciliationSession).create({
    id,
    storeId: payload.storeId ?? ctx.storeId,
    financialAccountId: payload.financialAccountId,
    statementFromDate: normDate(payload.statementFromDate),
    statementToDate: normDate(payload.statementToDate),
    status: 'open',
    bookBalanceCents: String(Math.round(Number(payload.bookBalanceCents ?? 0))),
    statementBalanceCents: String(Math.round(Number(payload.statementBalanceCents ?? 0))),
    varianceCents: String(Math.round(Number(payload.statementBalanceCents ?? 0)) - Math.round(Number(payload.bookBalanceCents ?? 0))),
  }));
  return { session: await ctx.db.getRepository(ReconciliationSession).findOneByOrFail({ id }) };
}
export async function adminReconciliationTransactionsRegister(ctx: ActionContext, payload: any) {
  const id = uuidv4();
  const session = await ctx.db.getRepository(ReconciliationSession).findOneBy({ id: payload.reconciliationSessionId });
  if (!session) throw new AppError('NOT_FOUND', 'Reconciliation session not found');
  await ctx.db.getRepository(ReconciliationTransaction).save(ctx.db.getRepository(ReconciliationTransaction).create({
    id,
    reconciliationSessionId: session.id,
    storeId: session.storeId,
    financialAccountId: session.financialAccountId,
    transactionDate: normDate(payload.transactionDate),
    direction: payload.direction,
    amountCents: String(Math.round(Number(payload.amountCents))),
    externalRef: payload.externalRef ?? null,
    description: payload.description ?? null,
    matchState: 'unmatched',
    matchedCents: '0',
    varianceCents: String(Math.round(Number(payload.amountCents))),
  }));
  return { transaction: await ctx.db.getRepository(ReconciliationTransaction).findOneByOrFail({ id }) };
}
export async function adminReconciliationTransactionsMatch(ctx: ActionContext, payload: any) {
  const transaction = await ctx.db.transaction((tx: EntityManager) => reconcileTransaction(tx, {
    reconciliationTransactionId: payload.reconciliationTransactionId,
    targetType: payload.targetType,
    targetId: payload.targetId,
    matchedCents: Math.round(Number(payload.matchedCents)),
    journalEntryId: payload.journalEntryId ?? null,
    actorUid: ctx.uid ?? null,
  }));
  return { transaction };
}
