import { EntityManager } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { AppError } from '../errors';
import { assertPostingDateAllowed } from '../accounting/accountingPeriods';
import { AccountsReceivableDocument } from '../../entities/AccountsReceivableDocument';
import { AccountsReceivableSettlement } from '../../entities/AccountsReceivableSettlement';
import { AccountsPayableDocument } from '../../entities/AccountsPayableDocument';
import { AccountsPayableSettlement } from '../../entities/AccountsPayableSettlement';
import { FinancialAuditLog } from '../../entities/FinancialAuditLog';
import { ReconciliationMatch } from '../../entities/ReconciliationMatch';
import { ReconciliationTransaction } from '../../entities/ReconciliationTransaction';

function cents(value: number | string): number {
  return Math.round(Number(value));
}

async function audit(manager: EntityManager, storeId: string, entityType: string, entityId: string, action: string, actorUid: string | null | undefined, payload: Record<string, unknown>) {
  await manager.getRepository(FinancialAuditLog).save(manager.getRepository(FinancialAuditLog).create({
    id: uuidv4(), storeId, entityType, entityId, action, actorUid: actorUid ?? null, payload,
  }));
}

export async function applyReceivableSettlement(manager: EntityManager, input: { storeId: string; receivableDocumentId: string; settlementDate: string; amountCents: number; method: string; financialAccountId?: string | null; journalEntryId?: string | null; sourceReference?: string | null; actorUid?: string | null; }): Promise<AccountsReceivableDocument> {
  if (input.amountCents <= 0) throw new AppError('VALIDATION_FAILED', 'Settlement amount must be positive');
  await assertPostingDateAllowed(manager, input.settlementDate, input.storeId);
  const repo = manager.getRepository(AccountsReceivableDocument);
  const doc = await repo.findOneBy({ id: input.receivableDocumentId, storeId: input.storeId });
  if (!doc) throw new AppError('NOT_FOUND', 'Receivable document not found');
  if (doc.approvalState !== 'approved') throw new AppError('VALIDATION_FAILED', 'Receivable document must be approved before settlement');
  if (doc.status === 'settled' || doc.status === 'cancelled') throw new AppError('VALIDATION_FAILED', 'Receivable document cannot be settled in current status', { status: doc.status });

  const outstanding = cents(doc.outstandingCents);
  if (input.amountCents > outstanding) throw new AppError('VALIDATION_FAILED', 'Settlement amount exceeds outstanding receivable');

  await manager.getRepository(AccountsReceivableSettlement).save(manager.getRepository(AccountsReceivableSettlement).create({
    id: uuidv4(),
    storeId: input.storeId,
    receivableDocumentId: doc.id,
    settlementDate: input.settlementDate,
    amountCents: String(input.amountCents),
    method: input.method,
    financialAccountId: input.financialAccountId ?? null,
    journalEntryId: input.journalEntryId ?? null,
    sourceReference: input.sourceReference ?? null,
    createdByUid: input.actorUid ?? null,
  }));

  const newSettled = cents(doc.settledCents) + input.amountCents;
  const newOutstanding = outstanding - input.amountCents;
  const status = newOutstanding === 0 ? 'settled' : 'partially_settled';
  await repo.update({ id: doc.id }, { settledCents: String(newSettled), outstandingCents: String(newOutstanding), status });
  await audit(manager, input.storeId, 'accounts_receivable_documents', doc.id, 'settlement_applied', input.actorUid, { amountCents: input.amountCents, settlementDate: input.settlementDate, method: input.method });

  return repo.findOneByOrFail({ id: doc.id });
}

export async function applyPayableSettlement(manager: EntityManager, input: { storeId: string; payableDocumentId: string; settlementDate: string; amountCents: number; method: string; financialAccountId?: string | null; journalEntryId?: string | null; sourceReference?: string | null; actorUid?: string | null; }): Promise<AccountsPayableDocument> {
  if (input.amountCents <= 0) throw new AppError('VALIDATION_FAILED', 'Settlement amount must be positive');
  await assertPostingDateAllowed(manager, input.settlementDate, input.storeId);
  const repo = manager.getRepository(AccountsPayableDocument);
  const doc = await repo.findOneBy({ id: input.payableDocumentId, storeId: input.storeId });
  if (!doc) throw new AppError('NOT_FOUND', 'Payable document not found');
  if (doc.approvalState !== 'approved') throw new AppError('VALIDATION_FAILED', 'Payable document must be approved before settlement');
  if (doc.status === 'settled' || doc.status === 'cancelled') throw new AppError('VALIDATION_FAILED', 'Payable document cannot be settled in current status', { status: doc.status });

  const outstanding = cents(doc.outstandingCents);
  if (input.amountCents > outstanding) throw new AppError('VALIDATION_FAILED', 'Settlement amount exceeds outstanding payable');

  await manager.getRepository(AccountsPayableSettlement).save(manager.getRepository(AccountsPayableSettlement).create({
    id: uuidv4(),
    storeId: input.storeId,
    payableDocumentId: doc.id,
    settlementDate: input.settlementDate,
    amountCents: String(input.amountCents),
    method: input.method,
    financialAccountId: input.financialAccountId ?? null,
    journalEntryId: input.journalEntryId ?? null,
    sourceReference: input.sourceReference ?? null,
    createdByUid: input.actorUid ?? null,
  }));

  const newSettled = cents(doc.settledCents) + input.amountCents;
  const newOutstanding = outstanding - input.amountCents;
  const status = newOutstanding === 0 ? 'settled' : 'partially_settled';
  await repo.update({ id: doc.id }, { settledCents: String(newSettled), outstandingCents: String(newOutstanding), status });
  await audit(manager, input.storeId, 'accounts_payable_documents', doc.id, 'settlement_applied', input.actorUid, { amountCents: input.amountCents, settlementDate: input.settlementDate, method: input.method });

  return repo.findOneByOrFail({ id: doc.id });
}

export async function reconcileTransaction(manager: EntityManager, input: { reconciliationTransactionId: string; targetType: string; targetId: string; matchedCents: number; journalEntryId?: string | null; actorUid?: string | null; }): Promise<ReconciliationTransaction> {
  if (input.matchedCents <= 0) throw new AppError('VALIDATION_FAILED', 'Matched amount must be positive');
  const txRepo = manager.getRepository(ReconciliationTransaction);
  const tx = await txRepo.findOneBy({ id: input.reconciliationTransactionId });
  if (!tx) throw new AppError('NOT_FOUND', 'Reconciliation transaction not found');
  const amount = cents(tx.amountCents);
  const already = cents(tx.matchedCents);
  if (already + input.matchedCents > amount) throw new AppError('VALIDATION_FAILED', 'Matched amount exceeds reconciliation transaction amount');

  await manager.getRepository(ReconciliationMatch).save(manager.getRepository(ReconciliationMatch).create({
    id: uuidv4(),
    reconciliationTransactionId: tx.id,
    targetType: input.targetType,
    targetId: input.targetId,
    matchedCents: String(input.matchedCents),
    journalEntryId: input.journalEntryId ?? null,
    createdByUid: input.actorUid ?? null,
  }));

  const matchedCents = already + input.matchedCents;
  const varianceCents = amount - matchedCents;
  const matchState = varianceCents === 0 ? 'matched' : 'partial';
  await txRepo.update({ id: tx.id }, { matchedCents: String(matchedCents), varianceCents: String(varianceCents), matchState });
  await audit(manager, tx.storeId, 'reconciliation_transactions', tx.id, 'match_applied', input.actorUid, { matchedCents: input.matchedCents, targetType: input.targetType, targetId: input.targetId });

  return txRepo.findOneByOrFail({ id: tx.id });
}
