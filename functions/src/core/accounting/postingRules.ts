import { DataSource, EntityManager } from 'typeorm';
import { AccountingPostingRule } from '../../entities/AccountingPostingRule';
import { PostingRuleMatchInput } from './types';

type RepositoryHost = DataSource | EntityManager;

export async function findPostingRules(host: RepositoryHost, input: PostingRuleMatchInput): Promise<AccountingPostingRule[]> {
  const repo = host.getRepository(AccountingPostingRule);
  const scoped = await repo.createQueryBuilder('r')
    .where('r.documentType = :documentType', { documentType: input.documentType })
    .andWhere('r.eventKey = :eventKey', { eventKey: input.eventKey })
    .andWhere('r.isActive = 1')
    .andWhere('r.storeId = :storeId', { storeId: input.storeId ?? null })
    .orderBy('r.priority', 'ASC')
    .addOrderBy('r.createdAt', 'ASC')
    .getMany();

  if (scoped.length > 0 || !input.storeId) return scoped;

  return repo.createQueryBuilder('r')
    .where('r.documentType = :documentType', { documentType: input.documentType })
    .andWhere('r.eventKey = :eventKey', { eventKey: input.eventKey })
    .andWhere('r.isActive = 1')
    .andWhere('r.storeId IS NULL')
    .orderBy('r.priority', 'ASC')
    .addOrderBy('r.createdAt', 'ASC')
    .getMany();
}
