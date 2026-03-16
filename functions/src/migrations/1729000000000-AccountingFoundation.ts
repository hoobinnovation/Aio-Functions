import { MigrationInterface, QueryRunner } from 'typeorm';

export class AccountingFoundation1729000000000 implements MigrationInterface {
  name = 'AccountingFoundation1729000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE accounting_accounts (
        id char(36) NOT NULL,
        storeId varchar(64) NULL,
        parentId char(36) NULL,
        code varchar(40) NOT NULL,
        name varchar(140) NOT NULL,
        type varchar(24) NOT NULL,
        normalSide varchar(16) NOT NULL,
        isActive tinyint(1) NOT NULL DEFAULT 1,
        allowPosting tinyint(1) NOT NULL DEFAULT 1,
        isSystem tinyint(1) NOT NULL DEFAULT 0,
        createdAt datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        accountScopeKey varchar(72) GENERATED ALWAYS AS (COALESCE(storeId,'__global__')) STORED,
        PRIMARY KEY (id),
        CONSTRAINT fk_accounting_accounts_parent FOREIGN KEY (parentId) REFERENCES accounting_accounts(id) ON DELETE SET NULL,
        CONSTRAINT chk_accounting_accounts_type CHECK (type IN ('asset','liability','equity','revenue','expense','cogs','contra')),
        CONSTRAINT chk_accounting_accounts_normal_side CHECK (normalSide IN ('debit','credit'))
      ) ENGINE=InnoDB
    `);
    await queryRunner.query('CREATE UNIQUE INDEX uq_accounting_accounts_scope_code ON accounting_accounts (accountScopeKey, code)');
    await queryRunner.query('CREATE INDEX idx_accounting_accounts_scope_active ON accounting_accounts (storeId, isActive)');
    await queryRunner.query('CREATE INDEX idx_accounting_accounts_parent ON accounting_accounts (parentId)');

    await queryRunner.query(`
      CREATE TABLE accounting_periods (
        id char(36) NOT NULL,
        storeId varchar(64) NULL,
        fiscalYear int NOT NULL,
        periodCode varchar(24) NOT NULL,
        startDate date NOT NULL,
        endDate date NOT NULL,
        status varchar(16) NOT NULL DEFAULT 'open',
        closedAt datetime NULL,
        closedByUid varchar(64) NULL,
        createdAt datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        periodScopeKey varchar(72) GENERATED ALWAYS AS (COALESCE(storeId,'__global__')) STORED,
        PRIMARY KEY (id),
        CONSTRAINT chk_accounting_period_status CHECK (status IN ('open','closed')),
        CONSTRAINT chk_accounting_period_dates CHECK (startDate <= endDate)
      ) ENGINE=InnoDB
    `);
    await queryRunner.query('CREATE UNIQUE INDEX uq_accounting_periods_scope_code ON accounting_periods (periodScopeKey, periodCode)');
    await queryRunner.query('CREATE INDEX idx_accounting_periods_scope_dates ON accounting_periods (storeId, startDate, endDate)');

    await queryRunner.query(`
      CREATE TABLE accounting_journal_entries (
        id char(36) NOT NULL,
        storeId varchar(64) NULL,
        periodId char(36) NULL,
        entryDate date NOT NULL,
        status varchar(24) NOT NULL DEFAULT 'draft',
        documentType varchar(48) NULL,
        documentId varchar(80) NULL,
        sourceContext json NULL,
        memo text NULL,
        postedAt datetime NULL,
        postedByUid varchar(64) NULL,
        reversedAt datetime NULL,
        reversedByUid varchar(64) NULL,
        reversalOfEntryId char(36) NULL,
        createdByUid varchar(64) NULL,
        createdAt datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        CONSTRAINT fk_accounting_journal_entries_period FOREIGN KEY (periodId) REFERENCES accounting_periods(id) ON DELETE SET NULL,
        CONSTRAINT fk_accounting_journal_entries_reversal FOREIGN KEY (reversalOfEntryId) REFERENCES accounting_journal_entries(id) ON DELETE SET NULL,
        CONSTRAINT chk_accounting_journal_entry_status CHECK (status IN ('draft','posted','reversed'))
      ) ENGINE=InnoDB
    `);
    await queryRunner.query('CREATE INDEX idx_accounting_journal_entries_store_date ON accounting_journal_entries (storeId, entryDate)');
    await queryRunner.query('CREATE INDEX idx_accounting_journal_entries_document ON accounting_journal_entries (documentType, documentId)');

    await queryRunner.query(`
      CREATE TABLE accounting_journal_entry_lines (
        id char(36) NOT NULL,
        entryId char(36) NOT NULL,
        accountId char(36) NOT NULL,
        lineNo int NOT NULL,
        description varchar(255) NULL,
        debitCents bigint NOT NULL DEFAULT 0,
        creditCents bigint NOT NULL DEFAULT 0,
        currencyCode varchar(8) NOT NULL DEFAULT 'EGP',
        branchId char(36) NULL,
        createdAt datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        CONSTRAINT fk_accounting_journal_lines_entry FOREIGN KEY (entryId) REFERENCES accounting_journal_entries(id) ON DELETE CASCADE,
        CONSTRAINT fk_accounting_journal_lines_account FOREIGN KEY (accountId) REFERENCES accounting_accounts(id),
        CONSTRAINT chk_accounting_journal_lines_amounts CHECK (debitCents >= 0 AND creditCents >= 0 AND ((debitCents = 0 AND creditCents > 0) OR (creditCents = 0 AND debitCents > 0)))
      ) ENGINE=InnoDB
    `);
    await queryRunner.query('CREATE UNIQUE INDEX uq_accounting_journal_lines_entry_line_no ON accounting_journal_entry_lines (entryId, lineNo)');
    await queryRunner.query('CREATE INDEX idx_accounting_journal_lines_account ON accounting_journal_entry_lines (accountId)');

    await queryRunner.query(`
      CREATE TABLE accounting_posting_rules (
        id char(36) NOT NULL,
        storeId varchar(64) NULL,
        ruleKey varchar(80) NOT NULL,
        documentType varchar(48) NOT NULL,
        eventKey varchar(64) NOT NULL,
        priority int NOT NULL DEFAULT 100,
        isActive tinyint(1) NOT NULL DEFAULT 1,
        configJson json NULL,
        createdAt datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        postingScopeKey varchar(72) GENERATED ALWAYS AS (COALESCE(storeId,'__global__')) STORED,
        PRIMARY KEY (id)
      ) ENGINE=InnoDB
    `);
    await queryRunner.query('CREATE UNIQUE INDEX uq_accounting_posting_rules_scope_rule ON accounting_posting_rules (postingScopeKey, ruleKey)');
    await queryRunner.query('CREATE INDEX idx_accounting_posting_rules_doc_event ON accounting_posting_rules (documentType, eventKey, isActive)');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE accounting_posting_rules');
    await queryRunner.query('DROP TABLE accounting_journal_entry_lines');
    await queryRunner.query('DROP TABLE accounting_journal_entries');
    await queryRunner.query('DROP TABLE accounting_periods');
    await queryRunner.query('DROP TABLE accounting_accounts');
  }
}
