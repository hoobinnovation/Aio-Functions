import { DataSource } from 'typeorm';

type Scope = { storeId?: string | null; from: string; to: string };

function storeFilter(scope: Scope, alias = 'je'): { clause: string; params: unknown[] } {
  if (scope.storeId === undefined) return { clause: '', params: [] };
  return { clause: ` AND ${alias}.storeId ${scope.storeId ? '= ?' : 'IS NULL'}`, params: scope.storeId ? [scope.storeId] : [] };
}

export async function buildGeneralLedger(db: DataSource, scope: Scope) {
  const sf = storeFilter(scope);
  return db.query(
    `SELECT je.id entryId, je.entryDate, je.documentType, je.documentId, a.code accountCode, a.name accountName,
            jel.lineNo, jel.description, jel.debitCents, jel.creditCents, (jel.debitCents - jel.creditCents) netCents
     FROM accounting_journal_entries je
     JOIN accounting_journal_entry_lines jel ON jel.entryId = je.id
     JOIN accounting_accounts a ON a.id = jel.accountId
     WHERE je.status='posted' AND je.entryDate BETWEEN ? AND ? ${sf.clause}
     ORDER BY je.entryDate ASC, je.id ASC, jel.lineNo ASC`,
    [scope.from, scope.to, ...sf.params],
  );
}

export async function buildTrialBalance(db: DataSource, scope: Scope) {
  const sf = storeFilter(scope);
  return db.query(
    `SELECT a.id accountId, a.code accountCode, a.name accountName, a.type accountType,
            COALESCE(SUM(jel.debitCents),0) debitCents,
            COALESCE(SUM(jel.creditCents),0) creditCents,
            COALESCE(SUM(jel.debitCents - jel.creditCents),0) balanceCents
     FROM accounting_accounts a
     LEFT JOIN accounting_journal_entry_lines jel ON jel.accountId = a.id
     LEFT JOIN accounting_journal_entries je ON je.id = jel.entryId AND je.status='posted' AND je.entryDate BETWEEN ? AND ? ${sf.clause}
     WHERE a.isActive = 1
     GROUP BY a.id, a.code, a.name, a.type
     HAVING debitCents <> 0 OR creditCents <> 0
     ORDER BY a.code ASC`,
    [scope.from, scope.to, ...sf.params],
  );
}

export async function buildProfitAndLoss(db: DataSource, scope: Scope) {
  const sf = storeFilter(scope);
  return db.query(
    `SELECT a.type accountType,
            COALESCE(SUM(jel.debitCents),0) debitCents,
            COALESCE(SUM(jel.creditCents),0) creditCents,
            COALESCE(SUM(jel.creditCents - jel.debitCents),0) netCents
     FROM accounting_journal_entries je
     JOIN accounting_journal_entry_lines jel ON jel.entryId = je.id
     JOIN accounting_accounts a ON a.id = jel.accountId
     WHERE je.status='posted' AND je.entryDate BETWEEN ? AND ? ${sf.clause}
       AND a.type IN ('revenue','expense','cogs')
     GROUP BY a.type`,
    [scope.from, scope.to, ...sf.params],
  );
}

export async function buildBalanceSheet(db: DataSource, scope: Scope) {
  const sf = storeFilter(scope);
  return db.query(
    `SELECT a.type accountType,
            COALESCE(SUM(jel.debitCents - jel.creditCents),0) balanceCents
     FROM accounting_journal_entries je
     JOIN accounting_journal_entry_lines jel ON jel.entryId = je.id
     JOIN accounting_accounts a ON a.id = jel.accountId
     WHERE je.status='posted' AND je.entryDate <= ? ${sf.clause}
       AND a.type IN ('asset','liability','equity')
     GROUP BY a.type`,
    [scope.to, ...sf.params],
  );
}

export async function buildCashFlowFoundation(db: DataSource, scope: Scope) {
  const sf = storeFilter(scope);
  return db.query(
    `SELECT
      CASE
        WHEN a.type IN ('revenue','expense','cogs') THEN 'operating'
        WHEN je.documentType IN ('purchase_order','inventory_transfer') THEN 'investing'
        ELSE 'financing'
      END cashFlowSection,
      COALESCE(SUM(jel.debitCents - jel.creditCents),0) netCents
    FROM accounting_journal_entries je
    JOIN accounting_journal_entry_lines jel ON jel.entryId = je.id
    JOIN accounting_accounts a ON a.id = jel.accountId
    WHERE je.status='posted' AND je.entryDate BETWEEN ? AND ? ${sf.clause}
      AND a.type IN ('asset','liability','equity','revenue','expense','cogs')
    GROUP BY cashFlowSection`,
    [scope.from, scope.to, ...sf.params],
  );
}
