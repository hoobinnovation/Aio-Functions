import { MigrationInterface, QueryRunner } from 'typeorm';

export class ReportsMarketingIndexes1727200000000 implements MigrationInterface {
  name = 'ReportsMarketingIndexes1727200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE INDEX idx_marketing_store_created_campaign ON marketing_attribution_events (storeId,createdAt,campaign)`);
    await queryRunner.query(`CREATE INDEX idx_marketing_store_created_medium ON marketing_attribution_events (storeId,createdAt,medium)`);
    await queryRunner.query(`CREATE INDEX idx_orders_store_uid_created ON orders (storeId,uid,createdAt)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX idx_orders_store_uid_created ON orders`);
    await queryRunner.query(`DROP INDEX idx_marketing_store_created_medium ON marketing_attribution_events`);
    await queryRunner.query(`DROP INDEX idx_marketing_store_created_campaign ON marketing_attribution_events`);
  }
}
