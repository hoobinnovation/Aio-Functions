import { DataSource } from 'typeorm';
import { AppError } from '../errors';
import { AccountingPeriod } from '../../entities/AccountingPeriod';

export async function validatePeriodClose(db: DataSource, periodId: string): Promise<{ period: AccountingPeriod; draftEntries: number }> {
  const period = await db.getRepository(AccountingPeriod).findOneBy({ id: periodId });
  if (!period) throw new AppError('NOT_FOUND', 'Accounting period not found');
  if (period.status === 'closed') throw new AppError('VALIDATION_FAILED', 'Accounting period is already closed', { periodId });

  const [rows] = await Promise.all([
    db.query(`SELECT COUNT(*) count FROM accounting_journal_entries WHERE periodId=? AND status='draft'`, [period.id]),
  ]);
  const draftEntries = Number(rows[0]?.count ?? 0);
  if (draftEntries > 0) throw new AppError('VALIDATION_FAILED', 'Accounting period has unposted draft entries', { periodId: period.id, draftEntries });
  return { period, draftEntries };
}

export async function closeAccountingPeriod(db: DataSource, periodId: string, actorUid?: string | null): Promise<AccountingPeriod> {
  const { period } = await validatePeriodClose(db, periodId);
  await db.getRepository(AccountingPeriod).update({ id: period.id }, { status: 'closed', closedAt: new Date(), closedByUid: actorUid ?? null });
  return db.getRepository(AccountingPeriod).findOneByOrFail({ id: period.id });
}

export async function reopenAccountingPeriod(db: DataSource, periodId: string): Promise<AccountingPeriod> {
  const period = await db.getRepository(AccountingPeriod).findOneBy({ id: periodId });
  if (!period) throw new AppError('NOT_FOUND', 'Accounting period not found');
  const blockedRows = await db.query(`SELECT COUNT(*) count FROM accounting_journal_entries WHERE periodId=? AND status='reversed'`, [period.id]);
  if (Number(blockedRows[0]?.count ?? 0) > 0) throw new AppError('VALIDATION_FAILED', 'Cannot reopen accounting period with reversed entries; create adjustment period instead', { periodId: period.id });
  await db.getRepository(AccountingPeriod).update({ id: period.id }, { status: 'open', closedAt: null, closedByUid: null });
  return db.getRepository(AccountingPeriod).findOneByOrFail({ id: period.id });
}
