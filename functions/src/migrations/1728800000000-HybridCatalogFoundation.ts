import { MigrationInterface, QueryRunner } from 'typeorm';

export class HybridCatalogFoundation1728800000000 implements MigrationInterface {
  name = 'HybridCatalogFoundation1728800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("ALTER TABLE products ADD COLUMN mode varchar(24) NOT NULL DEFAULT 'store' AFTER id");
    await queryRunner.query('ALTER TABLE products MODIFY COLUMN storeId varchar(64) NULL');
    await queryRunner.query('ALTER TABLE products MODIFY COLUMN categoryId char(36) NULL');

    await queryRunner.query("ALTER TABLE categories ADD COLUMN mode varchar(24) NOT NULL DEFAULT 'store' AFTER id");
    await queryRunner.query('ALTER TABLE categories MODIFY COLUMN storeId varchar(64) NULL');

    await queryRunner.query(`CREATE TABLE product_categories (
      id char(36) PRIMARY KEY,
      productId char(36) NOT NULL,
      categoryId char(36) NOT NULL,
      isPrimary tinyint(1) NOT NULL DEFAULT 0,
      createdAt datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uq_product_categories_product_category (productId,categoryId),
      KEY idx_product_categories_category (categoryId),
      KEY idx_product_categories_product_primary (productId,isPrimary)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

    await queryRunner.query(`INSERT IGNORE INTO product_categories (id, productId, categoryId, isPrimary, createdAt)
      SELECT UUID(), p.id, p.categoryId, 1, NOW()
      FROM products p
      WHERE p.categoryId IS NOT NULL`);

    await queryRunner.query(`CREATE TABLE product_base_media (
      id char(36) PRIMARY KEY,
      productId char(36) NOT NULL,
      mediaAssetId char(36) NOT NULL,
      sortOrder int NOT NULL DEFAULT 0,
      createdAt datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uq_product_base_media_product_asset (productId,mediaAssetId),
      KEY idx_product_base_media_product_sort (productId,sortOrder)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

    await queryRunner.query(`INSERT IGNORE INTO product_base_media (id, productId, mediaAssetId, sortOrder, createdAt, updatedAt)
      SELECT pi.id, pi.productId, pi.mediaAssetId, pi.sortOrder, pi.createdAt, pi.updatedAt
      FROM product_images pi`);

    await queryRunner.query(`CREATE TABLE store_product_media_overrides (
      id char(36) PRIMARY KEY,
      storeId varchar(64) NOT NULL,
      productId char(36) NOT NULL,
      mediaAssetId char(36) NOT NULL,
      sortOrder int NOT NULL DEFAULT 0,
      createdAt datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uq_store_product_media_override (storeId,productId,mediaAssetId),
      KEY idx_store_product_media_product_sort (storeId,productId,sortOrder)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

    await queryRunner.query('DROP INDEX uq_products_store_slug ON products');
    await queryRunner.query('DROP INDEX uq_categories_store_slug ON categories');
    await queryRunner.query('CREATE UNIQUE INDEX uq_products_mode_store_slug ON products (mode,storeId,slug)');
    await queryRunner.query('CREATE UNIQUE INDEX uq_categories_mode_store_slug ON categories (mode,storeId,slug)');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX uq_categories_mode_store_slug ON categories');
    await queryRunner.query('DROP INDEX uq_products_mode_store_slug ON products');
    await queryRunner.query('CREATE UNIQUE INDEX uq_categories_store_slug ON categories (storeId,slug)');
    await queryRunner.query('CREATE UNIQUE INDEX uq_products_store_slug ON products (storeId,slug)');

    await queryRunner.query('DROP TABLE store_product_media_overrides');
    await queryRunner.query('DROP TABLE product_base_media');
    await queryRunner.query('DROP TABLE product_categories');

    await queryRunner.query('ALTER TABLE categories MODIFY COLUMN storeId varchar(64) NOT NULL');
    await queryRunner.query('ALTER TABLE categories DROP COLUMN mode');

    await queryRunner.query('ALTER TABLE products MODIFY COLUMN categoryId char(36) NOT NULL');
    await queryRunner.query('ALTER TABLE products MODIFY COLUMN storeId varchar(64) NOT NULL');
    await queryRunner.query('ALTER TABLE products DROP COLUMN mode');
  }
}
