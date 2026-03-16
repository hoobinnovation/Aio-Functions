import { MigrationInterface, QueryRunner } from 'typeorm';

export class AccountingPostingEvents1729100000000 implements MigrationInterface {
  name = 'AccountingPostingEvents1729100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE accounting_posting_events (
        id char(36) NOT NULL,
        storeId varchar(64) NULL,
        sourceDocumentType varchar(48) NOT NULL,
        sourceDocumentId varchar(80) NOT NULL,
        sourceEventType varchar(64) NOT NULL,
        status varchar(16) NOT NULL DEFAULT 'pending',
        journalEntryId char(36) NULL,
        errorCode varchar(64) NULL,
        errorMessage varchar(255) NULL,
        metadata json NULL,
        createdByUid varchar(64) NULL,
        postedAt datetime NULL,
        createdAt datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        postingScopeKey varchar(72) GENERATED ALWAYS AS (COALESCE(storeId,'__global__')) STORED,
        PRIMARY KEY (id),
        CONSTRAINT fk_accounting_posting_events_journal FOREIGN KEY (journalEntryId) REFERENCES accounting_journal_entries(id) ON DELETE SET NULL,
        CONSTRAINT chk_accounting_posting_event_status CHECK (status IN ('pending','posted','failed'))
      ) ENGINE=InnoDB
    `);
    await queryRunner.query('CREATE UNIQUE INDEX uq_accounting_posting_events_scope_source ON accounting_posting_events (postingScopeKey, sourceDocumentType, sourceDocumentId, sourceEventType)');
    await queryRunner.query('CREATE INDEX idx_accounting_posting_events_store_status ON accounting_posting_events (storeId, status)');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE accounting_posting_events');
  }
}
