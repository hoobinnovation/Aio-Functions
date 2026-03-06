import { MigrationInterface, QueryRunner } from 'typeorm';

export class AccountingLedgerIndexes1727400000000 implements MigrationInterface {
  name = 'AccountingLedgerIndexes1727400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE INDEX idx_ledger_store_created_type_channel ON ledger_entries (storeId,createdAt,type,channel)`);
    await queryRunner.query(`CREATE INDEX idx_ledger_store_branch_device_employee ON ledger_entries (storeId,branchId,deviceId,employeeId)`);
    await queryRunner.query(`CREATE INDEX idx_ledger_store_refid_created ON ledger_entries (storeId,refId,createdAt)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX idx_ledger_store_refid_created ON ledger_entries`);
    await queryRunner.query(`DROP INDEX idx_ledger_store_branch_device_employee ON ledger_entries`);
    await queryRunner.query(`DROP INDEX idx_ledger_store_created_type_channel ON ledger_entries`);
  }
}
