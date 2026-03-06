import { MigrationInterface, QueryRunner } from 'typeorm';

export class ReportsBasicIndexes1727100000000 implements MigrationInterface {
  name = 'ReportsBasicIndexes1727100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE INDEX idx_orders_store_created_channel ON orders (storeId,createdAt,channel)`);
    await queryRunner.query(`CREATE INDEX idx_order_items_product_order ON order_items (productId,orderId)`);
    await queryRunner.query(`CREATE INDEX idx_returns_store_requested ON returns (storeId,requestedAt)`);
    await queryRunner.query(`CREATE INDEX idx_loyalty_transactions_store_created ON loyalty_transactions (storeId,createdAt)`);
    await queryRunner.query(`CREATE INDEX idx_refunds_return ON refunds (returnId)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX idx_refunds_return ON refunds`);
    await queryRunner.query(`DROP INDEX idx_loyalty_transactions_store_created ON loyalty_transactions`);
    await queryRunner.query(`DROP INDEX idx_returns_store_requested ON returns`);
    await queryRunner.query(`DROP INDEX idx_order_items_product_order ON order_items`);
    await queryRunner.query(`DROP INDEX idx_orders_store_created_channel ON orders`);
  }
}
