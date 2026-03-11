import { DataSource, EntityManager } from 'typeorm';
import { AppError } from '../errors';
import { AccountingPeriod } from '../../entities/AccountingPeriod';

type RepositoryHost = DataSource | EntityManager;

export async function assertPostingDateAllowed(host: RepositoryHost, postingDate: string, storeId?: string | null): Promise<AccountingPeriod | null> {
  const periodRepo = host.getRepository(AccountingPeriod);
  const scoped = await periodRepo.createQueryBuilder('p')
    .where('p.startDate <= :postingDate AND p.endDate >= :postingDate', { postingDate })
    .andWhere('p.storeId = :storeId', { storeId: storeId ?? null })
    .orderBy('p.startDate', 'DESC')
    .getOne();

  const period = scoped ?? await periodRepo.createQueryBuilder('p')
    .where('p.startDate <= :postingDate AND p.endDate >= :postingDate', { postingDate })
    .andWhere('p.storeId IS NULL')
    .orderBy('p.startDate', 'DESC')
    .getOne();

  if (!period) return null;
  if (period.status !== 'open') {
    throw new AppError('VALIDATION_FAILED', 'Posting date belongs to a closed accounting period', {
      periodId: period.id,
      periodCode: period.periodCode,
      status: period.status,
    });
  }
  return period;
}
