import { DataSource, EntityManager } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { AccountingAccount } from '../../entities/AccountingAccount';
import { AccountingJournalEntry } from '../../entities/AccountingJournalEntry';
import { AccountingJournalEntryLine } from '../../entities/AccountingJournalEntryLine';
import { AppError } from '../errors';
import { assertPostingDateAllowed } from './accountingPeriods';
import { CreateJournalEntryInput, JournalLineInput } from './types';

function toCents(value: number | undefined): number {
  return Number.isFinite(value) ? Math.round(Number(value)) : 0;
}

function normalizeDate(date?: string): string {
  return date && date.length >= 10 ? date.slice(0, 10) : new Date().toISOString().slice(0, 10);
}

export function validateJournalBalance(lines: JournalLineInput[]): { debitCents: number; creditCents: number } {
  if (!Array.isArray(lines) || lines.length < 2) throw new AppError('VALIDATION_FAILED', 'Journal entry requires at least two lines');

  let debitCents = 0;
  let creditCents = 0;
  for (const [i, line] of lines.entries()) {
    const debit = toCents(line.debitCents);
    const credit = toCents(line.creditCents);
    if (!line.accountId) throw new AppError('VALIDATION_FAILED', 'Journal line account is required', { lineNo: i + 1 });
    if ((debit > 0 && credit > 0) || (debit === 0 && credit === 0)) {
      throw new AppError('VALIDATION_FAILED', 'Each journal line must contain either debit or credit', { lineNo: i + 1 });
    }
    debitCents += debit;
    creditCents += credit;
  }

  if (debitCents !== creditCents) throw new AppError('VALIDATION_FAILED', 'Journal entry is not balanced', { debitCents, creditCents });
  return { debitCents, creditCents };
}

export async function validateAccountPostingEligibility(manager: EntityManager, accountId: string): Promise<AccountingAccount> {
  const account = await manager.getRepository(AccountingAccount).findOneBy({ id: accountId });
  if (!account) throw new AppError('NOT_FOUND', 'Accounting account not found', { accountId });
  if (!account.isActive || !account.allowPosting) {
    throw new AppError('VALIDATION_FAILED', 'Accounting account is not eligible for posting', { accountId });
  }
  return account;
}

export async function postJournalEntryWithManager(manager: EntityManager, entryId: string, postedByUid?: string | null): Promise<AccountingJournalEntry> {
  const entryRepo = manager.getRepository(AccountingJournalEntry);
  const lineRepo = manager.getRepository(AccountingJournalEntryLine);
  const entry = await entryRepo.findOneBy({ id: entryId });
  if (!entry) throw new AppError('NOT_FOUND', 'Journal entry not found', { entryId });
  if (entry.status !== 'draft') throw new AppError('VALIDATION_FAILED', 'Only draft journal entries can be posted', { entryId, status: entry.status });

  await assertPostingDateAllowed(manager, entry.entryDate, entry.storeId);
  const lines = await lineRepo.findBy({ entryId: entry.id });
  validateJournalBalance(lines.map((line: AccountingJournalEntryLine) => ({
    accountId: line.accountId,
    debitCents: Number(line.debitCents),
    creditCents: Number(line.creditCents),
  })));

  await entryRepo.update({ id: entry.id }, { status: 'posted', postedAt: new Date(), postedByUid: postedByUid ?? null });
  return entryRepo.findOneByOrFail({ id: entry.id });
}


export async function createJournalEntryWithManager(manager: EntityManager, input: CreateJournalEntryInput): Promise<AccountingJournalEntry> {
  const entryDate = normalizeDate(input.entryDate);
  const period = await assertPostingDateAllowed(manager, entryDate, input.storeId ?? null);
  validateJournalBalance(input.lines);

  for (const line of input.lines) await validateAccountPostingEligibility(manager, line.accountId);

  const entry = manager.getRepository(AccountingJournalEntry).create({
    id: input.id ?? uuidv4(),
    storeId: input.storeId ?? null,
    periodId: period?.id ?? null,
    entryDate,
    status: 'draft',
    documentType: input.documentType ?? null,
    documentId: input.documentId ?? null,
    sourceContext: input.sourceContext ?? null,
    memo: input.memo ?? null,
    createdByUid: input.createdByUid ?? null,
  });

  await manager.getRepository(AccountingJournalEntry).save(entry);

  let lineNo = 1;
  for (const line of input.lines) {
    await manager.getRepository(AccountingJournalEntryLine).save(manager.getRepository(AccountingJournalEntryLine).create({
      id: uuidv4(),
      entryId: entry.id,
      accountId: line.accountId,
      lineNo,
      description: line.description ?? null,
      debitCents: String(toCents(line.debitCents)),
      creditCents: String(toCents(line.creditCents)),
      currencyCode: line.currencyCode ?? 'EGP',
      branchId: line.branchId ?? null,
    }));
    lineNo += 1;
  }

  return entry;
}

export async function createJournalEntry(db: DataSource, input: CreateJournalEntryInput): Promise<AccountingJournalEntry> {
  return db.transaction((manager) => createJournalEntryWithManager(manager, input));
}

export async function postJournalEntry(db: DataSource, entryId: string, postedByUid?: string | null): Promise<AccountingJournalEntry> {
  return db.transaction((manager) => postJournalEntryWithManager(manager, entryId, postedByUid));
}

export async function reverseJournalEntry(db: DataSource, entryId: string, reversedByUid?: string | null, memo?: string | null): Promise<AccountingJournalEntry> {
  return db.transaction(async (manager) => {
    const entryRepo = manager.getRepository(AccountingJournalEntry);
    const lineRepo = manager.getRepository(AccountingJournalEntryLine);

    const original = await entryRepo.findOneBy({ id: entryId });
    if (!original) throw new AppError('NOT_FOUND', 'Journal entry not found', { entryId });
    if (original.status !== 'posted') throw new AppError('VALIDATION_FAILED', 'Only posted journal entries can be reversed', { entryId, status: original.status });

    const exists = await entryRepo.findOneBy({ reversalOfEntryId: original.id });
    if (exists) return exists;

    const lines = await lineRepo.find({ where: { entryId: original.id }, order: { lineNo: 'ASC' } });
    if (lines.length < 2) throw new AppError('VALIDATION_FAILED', 'Cannot reverse a journal entry without enough lines', { entryId });

    const reversal = entryRepo.create({
      id: uuidv4(),
      storeId: original.storeId,
      periodId: original.periodId,
      entryDate: normalizeDate(),
      status: 'draft',
      documentType: original.documentType,
      documentId: original.documentId,
      sourceContext: original.sourceContext,
      memo: memo ?? `Reversal for ${original.id}`,
      reversalOfEntryId: original.id,
      createdByUid: reversedByUid ?? null,
    });
    await entryRepo.save(reversal);

    let lineNo = 1;
    for (const line of lines) {
      await lineRepo.save(lineRepo.create({
        id: uuidv4(),
        entryId: reversal.id,
        accountId: line.accountId,
        lineNo,
        description: line.description,
        debitCents: line.creditCents,
        creditCents: line.debitCents,
        currencyCode: line.currencyCode,
        branchId: line.branchId,
      }));
      lineNo += 1;
    }

    const postedReversal = await postJournalEntryWithManager(manager, reversal.id, reversedByUid ?? null);
    await entryRepo.update({ id: original.id }, { status: 'reversed', reversedAt: new Date(), reversedByUid: reversedByUid ?? null });
    return postedReversal;
  });
}
