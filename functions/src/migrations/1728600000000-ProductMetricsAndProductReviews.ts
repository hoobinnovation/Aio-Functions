import { MigrationInterface, QueryRunner } from 'typeorm';

export class ProductMetricsAndProductReviews1728600000000 implements MigrationInterface {
  name = 'ProductMetricsAndProductReviews1728600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("ALTER TABLE products ADD COLUMN ratingAverage decimal(5,2) NOT NULL DEFAULT 0 AFTER status");
    await queryRunner.query("ALTER TABLE products ADD COLUMN ratingCount int NOT NULL DEFAULT 0 AFTER ratingAverage");
    await queryRunner.query("ALTER TABLE products ADD COLUMN favoriteCount int NOT NULL DEFAULT 0 AFTER ratingCount");
    await queryRunner.query("ALTER TABLE products ADD COLUMN completedOrderQty int NOT NULL DEFAULT 0 AFTER favoriteCount");
    await queryRunner.query("ALTER TABLE products ADD COLUMN popularityScore int NOT NULL DEFAULT 0 AFTER completedOrderQty");

    await queryRunner.query('CREATE INDEX idx_products_store_status_popularity ON products (storeId,status,popularityScore,updatedAt)');
    await queryRunner.query('CREATE INDEX idx_products_store_status_rating ON products (storeId,status,ratingAverage,updatedAt)');

    await queryRunner.query('ALTER TABLE order_reviews ADD COLUMN productId char(36) NULL AFTER orderId');
    await queryRunner.query('CREATE INDEX idx_or_store_product ON order_reviews (storeId,productId)');
    await queryRunner.query('DROP INDEX uq_or_order_uid ON order_reviews');
    await queryRunner.query('CREATE UNIQUE INDEX uq_or_order_uid_product ON order_reviews (orderId,uid,productId)');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX uq_or_order_uid_product ON order_reviews');
    await queryRunner.query('CREATE UNIQUE INDEX uq_or_order_uid ON order_reviews (orderId,uid)');
    await queryRunner.query('DROP INDEX idx_or_store_product ON order_reviews');
    await queryRunner.query('ALTER TABLE order_reviews DROP COLUMN productId');

    await queryRunner.query('DROP INDEX idx_products_store_status_rating ON products');
    await queryRunner.query('DROP INDEX idx_products_store_status_popularity ON products');

    await queryRunner.query('ALTER TABLE products DROP COLUMN popularityScore');
    await queryRunner.query('ALTER TABLE products DROP COLUMN completedOrderQty');
    await queryRunner.query('ALTER TABLE products DROP COLUMN favoriteCount');
    await queryRunner.query('ALTER TABLE products DROP COLUMN ratingCount');
    await queryRunner.query('ALTER TABLE products DROP COLUMN ratingAverage');
  }
}
