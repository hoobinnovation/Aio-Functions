import { EntityManager } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { SeedSummary } from './types';

export function initSummary(): SeedSummary {
  return { created: {}, updated: {}, skipped: [] };
}

export function incCreated(summary: SeedSummary, entity: string, amount = 1) {
  summary.created[entity] = (summary.created[entity] ?? 0) + amount;
}

export function incUpdated(summary: SeedSummary, entity: string, amount = 1) {
  summary.updated[entity] = (summary.updated[entity] ?? 0) + amount;
}

export function addSkip(summary: SeedSummary, entity: string, reason: string) {
  summary.skipped.push({ entity, reason });
}

export function strNum(value: number): string {
  return String(Math.trunc(value));
}

export function deterministicId(prefix: string, index = 0): string {
  const safePrefix = prefix.replace(/[^a-zA-Z0-9]/g, '').slice(0, 10).padEnd(10, 'x');
  const safeIndex = String(index).padStart(12, '0');
  return `${safePrefix.slice(0, 8)}-${safePrefix.slice(8, 10)}${safeIndex.slice(0, 2)}-${safeIndex.slice(2, 6)}-${safeIndex.slice(6, 10)}-${safeIndex.slice(10).padEnd(12, '0')}`;
}

export async function upsertById<T extends Record<string, any>>(
  manager: EntityManager,
  entity: any,
  entityName: string,
  row: T,
  summary: SeedSummary,
): Promise<T> {
  const repo = manager.getRepository(entity);
  const idField = repo.metadata.primaryColumns[0]?.propertyName;
  if (!idField) {
    incCreated(summary, entityName);
    return repo.save(repo.create(row));
  }

  const idValue = row[idField];
  const existing = await repo.findOne({ where: { [idField]: idValue } as any });
  if (existing) {
    await repo.save(repo.create({ ...existing, ...row }));
    incUpdated(summary, entityName);
    return repo.create({ ...existing, ...row });
  }

  const created = repo.create(row);
  await repo.save(created);
  incCreated(summary, entityName);
  return created;
}

export function fallbackUuid(id?: string) {
  return id ?? uuidv4();
}
