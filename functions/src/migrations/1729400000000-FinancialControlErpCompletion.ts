import { MigrationInterface, QueryRunner } from 'typeorm';

export class FinancialControlErpCompletion1729400000000 implements MigrationInterface {
  name = 'FinancialControlErpCompletion1729400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE accounts_receivable_documents (
      id char(36) NOT NULL,
      storeId varchar(64) NOT NULL,
      customerUid varchar(128) NOT NULL,
      sourceDocumentType varchar(48) NOT NULL,
      sourceDocumentId varchar(80) NOT NULL,
      documentNo varchar(32) NOT NULL,
      issueDate date NOT NULL,
      dueDate date NOT NULL,
      totalCents bigint NOT NULL,
      settledCents bigint NOT NULL DEFAULT 0,
      outstandingCents bigint NOT NULL,
      status varchar(24) NOT NULL DEFAULT 'open',
      approvalState varchar(24) NOT NULL DEFAULT 'approved',
      accountingAccountId char(36) NULL,
      journalEntryId char(36) NULL,
      createdByUid varchar(64) NULL,
      createdAt datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE INDEX uq_ar_document_no (documentNo),
      CONSTRAINT fk_ar_document_account FOREIGN KEY (accountingAccountId) REFERENCES accounting_accounts(id) ON DELETE SET NULL,
      CONSTRAINT fk_ar_document_journal FOREIGN KEY (journalEntryId) REFERENCES accounting_journal_entries(id) ON DELETE SET NULL,
      CONSTRAINT chk_ar_document_state CHECK (status IN ('open','partially_settled','settled','cancelled','writeoff')),
      CONSTRAINT chk_ar_document_approval CHECK (approvalState IN ('draft','pending_approval','approved','rejected')),
      CONSTRAINT chk_ar_document_due CHECK (dueDate >= issueDate),
      CONSTRAINT chk_ar_document_amounts CHECK (totalCents >= 0 AND settledCents >= 0 AND outstandingCents >= 0 AND totalCents = settledCents + outstandingCents)
    ) ENGINE=InnoDB`);
    await queryRunner.query('CREATE INDEX idx_ar_store_due_status ON accounts_receivable_documents (storeId, dueDate, status)');

    await queryRunner.query(`CREATE TABLE accounts_receivable_settlements (
      id char(36) NOT NULL,
      storeId varchar(64) NOT NULL,
      receivableDocumentId char(36) NOT NULL,
      settlementDate date NOT NULL,
      amountCents bigint NOT NULL,
      method varchar(24) NOT NULL,
      financialAccountId char(36) NULL,
      journalEntryId char(36) NULL,
      sourceReference varchar(64) NULL,
      createdByUid varchar(64) NULL,
      createdAt datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      CONSTRAINT fk_ar_settlement_doc FOREIGN KEY (receivableDocumentId) REFERENCES accounts_receivable_documents(id) ON DELETE CASCADE,
      CONSTRAINT fk_ar_settlement_journal FOREIGN KEY (journalEntryId) REFERENCES accounting_journal_entries(id) ON DELETE SET NULL,
      CONSTRAINT chk_ar_settlement_amount CHECK (amountCents > 0)
    ) ENGINE=InnoDB`);

    await queryRunner.query(`CREATE TABLE accounts_payable_documents (
      id char(36) NOT NULL,
      storeId varchar(64) NOT NULL,
      supplierId char(36) NOT NULL,
      sourceDocumentType varchar(48) NOT NULL,
      sourceDocumentId varchar(80) NOT NULL,
      documentNo varchar(32) NOT NULL,
      issueDate date NOT NULL,
      dueDate date NOT NULL,
      totalCents bigint NOT NULL,
      settledCents bigint NOT NULL DEFAULT 0,
      outstandingCents bigint NOT NULL,
      status varchar(24) NOT NULL DEFAULT 'open',
      approvalState varchar(24) NOT NULL DEFAULT 'approved',
      accountingAccountId char(36) NULL,
      journalEntryId char(36) NULL,
      createdByUid varchar(64) NULL,
      createdAt datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE INDEX uq_ap_document_no (documentNo),
      CONSTRAINT fk_ap_document_supplier FOREIGN KEY (supplierId) REFERENCES suppliers(id),
      CONSTRAINT fk_ap_document_account FOREIGN KEY (accountingAccountId) REFERENCES accounting_accounts(id) ON DELETE SET NULL,
      CONSTRAINT fk_ap_document_journal FOREIGN KEY (journalEntryId) REFERENCES accounting_journal_entries(id) ON DELETE SET NULL,
      CONSTRAINT chk_ap_document_state CHECK (status IN ('open','partially_settled','settled','cancelled','writeoff')),
      CONSTRAINT chk_ap_document_approval CHECK (approvalState IN ('draft','pending_approval','approved','rejected')),
      CONSTRAINT chk_ap_document_due CHECK (dueDate >= issueDate),
      CONSTRAINT chk_ap_document_amounts CHECK (totalCents >= 0 AND settledCents >= 0 AND outstandingCents >= 0 AND totalCents = settledCents + outstandingCents)
    ) ENGINE=InnoDB`);
    await queryRunner.query('CREATE INDEX idx_ap_store_due_status ON accounts_payable_documents (storeId, dueDate, status)');

    await queryRunner.query(`CREATE TABLE accounts_payable_settlements (
      id char(36) NOT NULL,
      storeId varchar(64) NOT NULL,
      payableDocumentId char(36) NOT NULL,
      settlementDate date NOT NULL,
      amountCents bigint NOT NULL,
      method varchar(24) NOT NULL,
      financialAccountId char(36) NULL,
      journalEntryId char(36) NULL,
      sourceReference varchar(64) NULL,
      createdByUid varchar(64) NULL,
      createdAt datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      CONSTRAINT fk_ap_settlement_doc FOREIGN KEY (payableDocumentId) REFERENCES accounts_payable_documents(id) ON DELETE CASCADE,
      CONSTRAINT fk_ap_settlement_journal FOREIGN KEY (journalEntryId) REFERENCES accounting_journal_entries(id) ON DELETE SET NULL,
      CONSTRAINT chk_ap_settlement_amount CHECK (amountCents > 0)
    ) ENGINE=InnoDB`);

    await queryRunner.query(`CREATE TABLE tax_codes (
      id char(36) NOT NULL,
      storeId varchar(64) NULL,
      code varchar(32) NOT NULL,
      name varchar(120) NOT NULL,
      taxType varchar(24) NOT NULL,
      classification varchar(24) NOT NULL,
      direction varchar(16) NOT NULL DEFAULT 'output',
      isActive tinyint(1) NOT NULL DEFAULT 1,
      createdAt datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE INDEX uq_tax_codes_scope_code (storeId, code),
      CONSTRAINT chk_tax_direction CHECK (direction IN ('input','output','both'))
    ) ENGINE=InnoDB`);

    await queryRunner.query(`CREATE TABLE tax_rates (
      id char(36) NOT NULL,
      taxCodeId char(36) NOT NULL,
      rate decimal(9,6) NOT NULL,
      effectiveFrom date NOT NULL,
      effectiveTo date NULL,
      isCompound tinyint(1) NOT NULL DEFAULT 1,
      isInclusive tinyint(1) NOT NULL DEFAULT 0,
      createdAt datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      CONSTRAINT fk_tax_rates_code FOREIGN KEY (taxCodeId) REFERENCES tax_codes(id) ON DELETE CASCADE,
      CONSTRAINT chk_tax_rate_value CHECK (rate >= 0),
      CONSTRAINT chk_tax_rate_date CHECK (effectiveTo IS NULL OR effectiveTo >= effectiveFrom)
    ) ENGINE=InnoDB`);

    await queryRunner.query(`CREATE TABLE tax_assignments (
      id char(36) NOT NULL,
      storeId varchar(64) NULL,
      taxCodeId char(36) NOT NULL,
      contextType varchar(32) NOT NULL,
      contextId varchar(80) NOT NULL,
      isActive tinyint(1) NOT NULL DEFAULT 1,
      createdAt datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE INDEX uq_tax_assignment_context (taxCodeId, contextType, contextId),
      CONSTRAINT fk_tax_assignments_code FOREIGN KEY (taxCodeId) REFERENCES tax_codes(id) ON DELETE CASCADE
    ) ENGINE=InnoDB`);

    await queryRunner.query(`CREATE TABLE financial_accounts (
      id char(36) NOT NULL,
      storeId varchar(64) NOT NULL,
      type varchar(24) NOT NULL,
      code varchar(32) NOT NULL,
      name varchar(120) NOT NULL,
      institutionName varchar(48) NULL,
      accountNumberMasked varchar(64) NULL,
      accountingAccountId char(36) NOT NULL,
      isActive tinyint(1) NOT NULL DEFAULT 1,
      createdAt datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE INDEX uq_fin_account_scope_code (storeId, code),
      CONSTRAINT fk_fin_account_chart FOREIGN KEY (accountingAccountId) REFERENCES accounting_accounts(id),
      CONSTRAINT chk_fin_account_type CHECK (type IN ('bank','cash'))
    ) ENGINE=InnoDB`);


    await queryRunner.query('ALTER TABLE accounts_receivable_settlements ADD CONSTRAINT fk_ar_settlement_fin_account FOREIGN KEY (financialAccountId) REFERENCES financial_accounts(id) ON DELETE SET NULL');
    await queryRunner.query('ALTER TABLE accounts_payable_settlements ADD CONSTRAINT fk_ap_settlement_fin_account FOREIGN KEY (financialAccountId) REFERENCES financial_accounts(id) ON DELETE SET NULL');

    await queryRunner.query(`CREATE TABLE reconciliation_sessions (
      id char(36) NOT NULL,
      storeId varchar(64) NOT NULL,
      financialAccountId char(36) NOT NULL,
      statementFromDate date NOT NULL,
      statementToDate date NOT NULL,
      status varchar(24) NOT NULL DEFAULT 'open',
      bookBalanceCents bigint NOT NULL DEFAULT 0,
      statementBalanceCents bigint NOT NULL DEFAULT 0,
      varianceCents bigint NOT NULL DEFAULT 0,
      closedByUid varchar(64) NULL,
      closedAt datetime NULL,
      createdAt datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      CONSTRAINT fk_recon_session_account FOREIGN KEY (financialAccountId) REFERENCES financial_accounts(id),
      CONSTRAINT chk_recon_session_dates CHECK (statementToDate >= statementFromDate),
      CONSTRAINT chk_recon_session_status CHECK (status IN ('open','matched','closed'))
    ) ENGINE=InnoDB`);

    await queryRunner.query(`CREATE TABLE reconciliation_transactions (
      id char(36) NOT NULL,
      reconciliationSessionId char(36) NOT NULL,
      storeId varchar(64) NOT NULL,
      financialAccountId char(36) NOT NULL,
      transactionDate date NOT NULL,
      direction varchar(32) NOT NULL,
      amountCents bigint NOT NULL,
      externalRef varchar(80) NULL,
      description varchar(255) NULL,
      matchState varchar(24) NOT NULL DEFAULT 'unmatched',
      matchedCents bigint NOT NULL DEFAULT 0,
      varianceCents bigint NOT NULL DEFAULT 0,
      createdAt datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      CONSTRAINT fk_recon_tx_session FOREIGN KEY (reconciliationSessionId) REFERENCES reconciliation_sessions(id) ON DELETE CASCADE,
      CONSTRAINT fk_recon_tx_account FOREIGN KEY (financialAccountId) REFERENCES financial_accounts(id),
      CONSTRAINT chk_recon_tx_direction CHECK (direction IN ('debit','credit')),
      CONSTRAINT chk_recon_tx_match_state CHECK (matchState IN ('unmatched','partial','matched','exception')),
      CONSTRAINT chk_recon_tx_amounts CHECK (amountCents > 0 AND matchedCents >= 0 AND matchedCents <= amountCents)
    ) ENGINE=InnoDB`);

    await queryRunner.query(`CREATE TABLE reconciliation_matches (
      id char(36) NOT NULL,
      reconciliationTransactionId char(36) NOT NULL,
      targetType varchar(48) NOT NULL,
      targetId varchar(80) NOT NULL,
      matchedCents bigint NOT NULL,
      journalEntryId char(36) NULL,
      createdByUid varchar(64) NULL,
      createdAt datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      CONSTRAINT fk_recon_match_tx FOREIGN KEY (reconciliationTransactionId) REFERENCES reconciliation_transactions(id) ON DELETE CASCADE,
      CONSTRAINT fk_recon_match_journal FOREIGN KEY (journalEntryId) REFERENCES accounting_journal_entries(id) ON DELETE SET NULL,
      CONSTRAINT chk_recon_match_amount CHECK (matchedCents > 0)
    ) ENGINE=InnoDB`);

    await queryRunner.query(`CREATE TABLE financial_audit_logs (
      id char(36) NOT NULL,
      storeId varchar(64) NOT NULL,
      entityType varchar(48) NOT NULL,
      entityId varchar(80) NOT NULL,
      action varchar(48) NOT NULL,
      actorUid varchar(64) NULL,
      payload json NULL,
      createdAt datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id)
    ) ENGINE=InnoDB`);
    await queryRunner.query('CREATE INDEX idx_fin_audit_entity ON financial_audit_logs (storeId, entityType, entityId, createdAt)');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS financial_audit_logs');
    await queryRunner.query('DROP TABLE IF EXISTS reconciliation_matches');
    await queryRunner.query('DROP TABLE IF EXISTS reconciliation_transactions');
    await queryRunner.query('DROP TABLE IF EXISTS reconciliation_sessions');
    await queryRunner.query('DROP TABLE IF EXISTS financial_accounts');
    await queryRunner.query('DROP TABLE IF EXISTS tax_assignments');
    await queryRunner.query('DROP TABLE IF EXISTS tax_rates');
    await queryRunner.query('DROP TABLE IF EXISTS tax_codes');
    await queryRunner.query('DROP TABLE IF EXISTS accounts_payable_settlements');
    await queryRunner.query('DROP TABLE IF EXISTS accounts_payable_documents');
    await queryRunner.query('DROP TABLE IF EXISTS accounts_receivable_settlements');
    await queryRunner.query('DROP TABLE IF EXISTS accounts_receivable_documents');
  }
}
