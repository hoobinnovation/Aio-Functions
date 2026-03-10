import { MigrationInterface, QueryRunner } from 'typeorm';

export class FawaterkPaymentSessionFields1728300000000 implements MigrationInterface {
  name = 'FawaterkPaymentSessionFields1728300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE payment_sessions ADD COLUMN paymentUrl varchar(240) NULL`);
    await queryRunner.query(`ALTER TABLE payment_sessions ADD COLUMN invoiceKey varchar(120) NULL`);
    await queryRunner.query(`ALTER TABLE payment_sessions ADD COLUMN externalReference varchar(120) NULL`);
    await queryRunner.query(`ALTER TABLE payment_sessions ADD COLUMN rawProviderPayload json NULL`);
    await queryRunner.query(`CREATE INDEX idx_payment_sessions_invoice_key ON payment_sessions (invoiceKey)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX idx_payment_sessions_invoice_key ON payment_sessions`);
    await queryRunner.query(`ALTER TABLE payment_sessions DROP COLUMN rawProviderPayload`);
    await queryRunner.query(`ALTER TABLE payment_sessions DROP COLUMN externalReference`);
    await queryRunner.query(`ALTER TABLE payment_sessions DROP COLUMN invoiceKey`);
    await queryRunner.query(`ALTER TABLE payment_sessions DROP COLUMN paymentUrl`);
  }
}
