import { MigrationInterface, QueryRunner } from 'typeorm';

export class HybridCatalogIntegrity1728900000000 implements MigrationInterface {
  name = 'HybridCatalogIntegrity1728900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE products ADD CONSTRAINT chk_products_mode_scope_consistency CHECK ((mode=\'global\' AND storeId IS NULL) OR (mode=\'store\' AND storeId IS NOT NULL))');
    await queryRunner.query('ALTER TABLE categories ADD CONSTRAINT chk_categories_mode_scope_consistency CHECK ((mode=\'global\' AND storeId IS NULL) OR (mode=\'store\' AND storeId IS NOT NULL))');

    await queryRunner.query('ALTER TABLE products ADD COLUMN scopeSlug varchar(72) GENERATED ALWAYS AS (COALESCE(storeId,\'__global__\')) STORED');
    await queryRunner.query('ALTER TABLE categories ADD COLUMN scopeSlug varchar(72) GENERATED ALWAYS AS (COALESCE(storeId,\'__global__\')) STORED');

    await queryRunner.query('DROP INDEX uq_products_mode_store_slug ON products');
    await queryRunner.query('DROP INDEX uq_categories_mode_store_slug ON categories');

    await queryRunner.query('CREATE UNIQUE INDEX uq_products_mode_scope_slug ON products (mode,scopeSlug,slug)');
    await queryRunner.query('CREATE UNIQUE INDEX uq_categories_mode_scope_slug ON categories (mode,scopeSlug,slug)');

    await queryRunner.query('ALTER TABLE product_categories ADD COLUMN primaryMarker tinyint GENERATED ALWAYS AS (IF(isPrimary=1,1,NULL)) STORED');
    await queryRunner.query('CREATE UNIQUE INDEX uq_product_categories_primary_per_product ON product_categories (productId,primaryMarker)');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX uq_product_categories_primary_per_product ON product_categories');
    await queryRunner.query('ALTER TABLE product_categories DROP COLUMN primaryMarker');

    await queryRunner.query('DROP INDEX uq_categories_mode_scope_slug ON categories');
    await queryRunner.query('DROP INDEX uq_products_mode_scope_slug ON products');

    await queryRunner.query('CREATE UNIQUE INDEX uq_categories_mode_store_slug ON categories (mode,storeId,slug)');
    await queryRunner.query('CREATE UNIQUE INDEX uq_products_mode_store_slug ON products (mode,storeId,slug)');

    await queryRunner.query('ALTER TABLE categories DROP COLUMN scopeSlug');
    await queryRunner.query('ALTER TABLE products DROP COLUMN scopeSlug');

    await queryRunner.query('ALTER TABLE categories DROP CHECK chk_categories_mode_scope_consistency');
    await queryRunner.query('ALTER TABLE products DROP CHECK chk_products_mode_scope_consistency');
  }
}
