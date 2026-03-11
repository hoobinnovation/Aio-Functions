import { DataSource, EntityManager } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { AppError } from '../errors';
import { AccountingAccount } from '../../entities/AccountingAccount';
import { AccountingPostingEvent } from '../../entities/AccountingPostingEvent';
import { createJournalEntryWithManager, postJournalEntryWithManager } from './journalService';
import { findPostingRules } from './postingRules';

type PostingEventInput = {
  storeId?: string | null;
  sourceDocumentType: string;
  sourceDocumentId: string;
  sourceEventType: string;
  amountCents: number;
  metadata?: Record<string, unknown> | null;
  createdByUid?: string | null;
};

type PostingLine = {
  accountId: string;
  debitCents?: number;
  creditCents?: number;
  description?: string;
  branchId?: string | null;
};

const DEFAULT_ACCOUNTING_BLUEPRINTS: Record<string, { debitCode: string; creditCode: string; }> = {
  payment_confirmed: { debitCode: 'cash_on_hand', creditCode: 'sales_revenue' },
  refund_completed: { debitCode: 'sales_returns', creditCode: 'cash_on_hand' },
  manual_expense_created: { debitCode: 'operating_expense', creditCode: 'cash_on_hand' },
  drawer_cash_movement: { debitCode: 'cash_on_hand', creditCode: 'suspense_clearing' },
  pos_sale_completed: { debitCode: 'cash_on_hand', creditCode: 'sales_revenue' },
};

async function resolveAccountIdByCode(manager: EntityManager, code: string, storeId?: string | null): Promise<string> {
  const scoped = await manager.getRepository(AccountingAccount).findOne({ where: { code, storeId: storeId ?? null, isActive: true } });
  if (scoped) return scoped.id;
  const global = await manager.getRepository(AccountingAccount).findOne({ where: { code, storeId: null, isActive: true } });
  if (global) return global.id;
  throw new AppError('NOT_FOUND', 'Accounting account code not found for posting', { code, storeId: storeId ?? null });
}

function toNumber(value: unknown, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

async function buildPostingLines(manager: EntityManager, event: PostingEventInput): Promise<PostingLine[]> {
  const amount = Math.abs(Math.round(event.amountCents));
  if (amount <= 0) throw new AppError('VALIDATION_FAILED', 'Posting amount must be greater than zero');

  const rules = await findPostingRules(manager, {
    documentType: event.sourceDocumentType,
    eventKey: event.sourceEventType,
    storeId: event.storeId ?? null,
  });

  if (rules.length > 0) {
    const config = (rules[0].configJson ?? {}) as any;
    if (Array.isArray(config.lines) && config.lines.length >= 2) {
      const lines: PostingLine[] = [];
      for (const rawLine of config.lines) {
        const side = rawLine?.side === 'credit' ? 'credit' : 'debit';
        const lineAmount = Math.abs(Math.round(toNumber(rawLine?.amountCents, amount)));
        const accountId = typeof rawLine?.accountId === 'string' && rawLine.accountId
          ? rawLine.accountId
          : await resolveAccountIdByCode(manager, String(rawLine?.accountCode ?? ''), event.storeId);
        lines.push({
          accountId,
          debitCents: side === 'debit' ? lineAmount : 0,
          creditCents: side === 'credit' ? lineAmount : 0,
          description: typeof rawLine?.description === 'string' ? rawLine.description : undefined,
          branchId: typeof rawLine?.branchId === 'string' ? rawLine.branchId : null,
        });
      }
      return lines;
    }
  }

  const blueprint = DEFAULT_ACCOUNTING_BLUEPRINTS[event.sourceEventType];
  if (!blueprint) throw new AppError('VALIDATION_FAILED', 'No accounting posting blueprint configured', { sourceEventType: event.sourceEventType });

  if (event.sourceEventType === 'drawer_cash_movement' && event.amountCents < 0) {
    const debitId = await resolveAccountIdByCode(manager, blueprint.creditCode, event.storeId);
    const creditId = await resolveAccountIdByCode(manager, blueprint.debitCode, event.storeId);
    return [
      { accountId: debitId, debitCents: amount, creditCents: 0 },
      { accountId: creditId, debitCents: 0, creditCents: amount },
    ];
  }

  const debitAccountId = await resolveAccountIdByCode(manager, blueprint.debitCode, event.storeId);
  const creditAccountId = await resolveAccountIdByCode(manager, blueprint.creditCode, event.storeId);
  return [
    { accountId: debitAccountId, debitCents: amount, creditCents: 0 },
    { accountId: creditAccountId, debitCents: 0, creditCents: amount },
  ];
}

export async function postBusinessEvent(db: DataSource, event: PostingEventInput): Promise<{ posted: boolean; idempotent: boolean; journalEntryId: string | null; }> {
  return db.transaction(async (manager) => {
    const eventRepo = manager.getRepository(AccountingPostingEvent);
    const existing = await eventRepo.findOneBy({
      storeId: event.storeId ?? null,
      sourceDocumentType: event.sourceDocumentType,
      sourceDocumentId: event.sourceDocumentId,
      sourceEventType: event.sourceEventType,
    });

    if (existing?.status === 'posted') {
      return { posted: true, idempotent: true, journalEntryId: existing.journalEntryId ?? null };
    }

    const postingEvent = existing ?? eventRepo.create({
      id: uuidv4(),
      storeId: event.storeId ?? null,
      sourceDocumentType: event.sourceDocumentType,
      sourceDocumentId: event.sourceDocumentId,
      sourceEventType: event.sourceEventType,
      status: 'pending',
      journalEntryId: null,
      metadata: event.metadata ?? null,
      createdByUid: event.createdByUid ?? null,
      errorCode: null,
      errorMessage: null,
      postedAt: null,
    });

    postingEvent.status = 'pending';
    postingEvent.metadata = event.metadata ?? postingEvent.metadata;
    postingEvent.errorCode = null;
    postingEvent.errorMessage = null;
    await eventRepo.save(postingEvent);

    const lines = await buildPostingLines(manager, event);
    const created = await createJournalEntryWithManager(manager, {
      storeId: event.storeId ?? null,
      documentType: event.sourceDocumentType,
      documentId: event.sourceDocumentId,
      sourceContext: {
        sourceEventType: event.sourceEventType,
        postingEventId: postingEvent.id,
        ...(event.metadata ?? {}),
      },
      memo: `Auto posting for ${event.sourceDocumentType}:${event.sourceDocumentId}:${event.sourceEventType}`,
      createdByUid: event.createdByUid ?? null,
      lines,
    });

    const posted = await postJournalEntryWithManager(manager, created.id, event.createdByUid ?? null);
    postingEvent.status = 'posted';
    postingEvent.journalEntryId = posted.id;
    postingEvent.postedAt = new Date();
    await eventRepo.save(postingEvent);

    return { posted: true, idempotent: false, journalEntryId: posted.id };
  });
}

export async function tryPostBusinessEvent(db: DataSource, event: PostingEventInput): Promise<{ posted: boolean; idempotent: boolean; journalEntryId: string | null; errorCode?: string; }> {
  try {
    return await postBusinessEvent(db, event);
  } catch (error: any) {
    const code = typeof error?.code === 'string' ? error.code : 'INTERNAL';
    const message = typeof error?.message === 'string' ? error.message : 'Posting integration failed';
    try {
      await db.transaction(async (manager) => {
        const repo = manager.getRepository(AccountingPostingEvent);
        const existing = await repo.findOneBy({
          storeId: event.storeId ?? null,
          sourceDocumentType: event.sourceDocumentType,
          sourceDocumentId: event.sourceDocumentId,
          sourceEventType: event.sourceEventType,
        });
        const postingEvent = existing ?? repo.create({
          id: uuidv4(),
          storeId: event.storeId ?? null,
          sourceDocumentType: event.sourceDocumentType,
          sourceDocumentId: event.sourceDocumentId,
          sourceEventType: event.sourceEventType,
          createdByUid: event.createdByUid ?? null,
          metadata: event.metadata ?? null,
          journalEntryId: null,
          postedAt: null,
          status: 'failed',
          errorCode: code,
          errorMessage: message,
        });
        postingEvent.status = 'failed';
        postingEvent.errorCode = code;
        postingEvent.errorMessage = message.slice(0, 255);
        postingEvent.metadata = event.metadata ?? postingEvent.metadata;
        await repo.save(postingEvent);
      });
    } catch {
      // best effort only, keep operational flow safe
    }
    return { posted: false, idempotent: false, journalEntryId: null, errorCode: code };
  }
}
