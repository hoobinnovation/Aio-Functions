import { MigrationInterface, QueryRunner } from 'typeorm';

export class Phase3CatalogHomeSeo1724000000000 implements MigrationInterface {
  name = 'Phase3CatalogHomeSeo1724000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE IF NOT EXISTS categories (
      id char(36) PRIMARY KEY,
      storeId varchar(64) NOT NULL,
      name varchar(120) NOT NULL,
      slug varchar(140) NOT NULL,
      parentId char(36) NULL,
      sortOrder int NOT NULL DEFAULT 0,
      status varchar(24) NOT NULL DEFAULT 'active',
      createdAt datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uq_categories_store_slug (storeId, slug),
      KEY idx_categories_store_status (storeId,status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

    await queryRunner.query(`CREATE TABLE IF NOT EXISTS products (
      id char(36) PRIMARY KEY,
      storeId varchar(64) NOT NULL,
      categoryId char(36) NOT NULL,
      name varchar(180) NOT NULL,
      slug varchar(200) NOT NULL,
      description text NULL,
      status varchar(24) NOT NULL DEFAULT 'active',
      createdAt datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uq_products_store_slug (storeId, slug),
      KEY idx_products_store_status (storeId,status),
      KEY idx_products_category (categoryId)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

    await queryRunner.query(`CREATE TABLE IF NOT EXISTS product_variants (
      id char(36) PRIMARY KEY,
      productId char(36) NOT NULL,
      sku varchar(120) NOT NULL,
      priceCents bigint NOT NULL,
      stockQty int NOT NULL DEFAULT 0,
      attributes json NULL,
      status varchar(24) NOT NULL DEFAULT 'active',
      createdAt datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uq_product_variants_sku (sku),
      KEY idx_product_variants_product (productId,status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

    await queryRunner.query(`CREATE TABLE IF NOT EXISTS product_specs (
      id char(36) PRIMARY KEY,
      productId char(36) NOT NULL,
      specKey varchar(120) NOT NULL,
      specValue varchar(300) NOT NULL,
      sortOrder int NOT NULL DEFAULT 0,
      createdAt datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      KEY idx_product_specs_product (productId)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

    await queryRunner.query(`CREATE TABLE IF NOT EXISTS product_images (
      id char(36) PRIMARY KEY,
      productId char(36) NOT NULL,
      mediaAssetId char(36) NOT NULL,
      sortOrder int NOT NULL DEFAULT 0,
      createdAt datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      KEY idx_product_images_product (productId),
      KEY idx_product_images_media (mediaAssetId)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

    await queryRunner.query(`CREATE TABLE IF NOT EXISTS inventory_adjustments (
      id char(36) PRIMARY KEY,
      variantId char(36) NOT NULL,
      deltaQty int NOT NULL,
      reason varchar(250) NULL,
      performedByUid varchar(128) NOT NULL,
      createdAt datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
      KEY idx_inventory_adjustments_variant (variantId,createdAt)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

    await queryRunner.query(`CREATE TABLE IF NOT EXISTS banners (
      id char(36) PRIMARY KEY,
      storeId varchar(64) NOT NULL,
      title varchar(140) NOT NULL,
      mediaAssetId char(36) NOT NULL,
      linkUrl varchar(255) NULL,
      sortOrder int NOT NULL DEFAULT 0,
      status varchar(24) NOT NULL DEFAULT 'active',
      createdAt datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      KEY idx_banners_store_status (storeId,status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

    await queryRunner.query(`CREATE TABLE IF NOT EXISTS featured_items (
      id char(36) PRIMARY KEY,
      storeId varchar(64) NOT NULL,
      productId char(36) NOT NULL,
      sortOrder int NOT NULL DEFAULT 0,
      createdAt datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
      KEY idx_featured_store_order (storeId,sortOrder)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

    await queryRunner.query(`CREATE TABLE IF NOT EXISTS user_product_favorites (
      id char(36) PRIMARY KEY,
      uid varchar(128) NOT NULL,
      productId char(36) NOT NULL,
      createdAt datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uq_user_product_favorites (uid,productId)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

    await queryRunner.query(`CREATE TABLE IF NOT EXISTS user_store_favorites (
      id char(36) PRIMARY KEY,
      uid varchar(128) NOT NULL,
      storeId varchar(64) NOT NULL,
      createdAt datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uq_user_store_favorites (uid,storeId)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

    await queryRunner.query(`CREATE TABLE IF NOT EXISTS home_sections (
      id char(36) PRIMARY KEY,
      storeId varchar(64) NOT NULL,
      type varchar(40) NOT NULL,
      config json NULL,
      sortOrder int NOT NULL DEFAULT 0,
      enabled tinyint(1) NOT NULL DEFAULT 1,
      createdAt datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      KEY idx_home_sections_store_order (storeId,sortOrder,enabled)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

    await queryRunner.query(`CREATE TABLE IF NOT EXISTS seo_settings (
      id char(36) PRIMARY KEY,
      storeId varchar(64) NOT NULL,
      pageType varchar(40) NOT NULL,
      pageKey varchar(200) NOT NULL,
      title varchar(160) NULL,
      description varchar(320) NULL,
      extra json NULL,
      createdAt datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uq_seo_store_page (storeId,pageType,pageKey)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

    await queryRunner.query(`CREATE TABLE IF NOT EXISTS landing_pages (
      id char(36) PRIMARY KEY,
      storeId varchar(64) NOT NULL,
      slug varchar(160) NOT NULL,
      title varchar(180) NOT NULL,
      body json NOT NULL,
      status varchar(24) NOT NULL DEFAULT 'draft',
      createdAt datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uq_landing_store_slug (storeId,slug),
      KEY idx_landing_store_status (storeId,status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

    await queryRunner.query(`CREATE TABLE IF NOT EXISTS sitemap_runs (
      id char(36) PRIMARY KEY,
      storeId varchar(64) NOT NULL,
      status varchar(24) NOT NULL,
      urlsCount int NOT NULL DEFAULT 0,
      createdAt datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
      KEY idx_sitemap_runs_store_created (storeId,createdAt)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const tables = ['sitemap_runs','landing_pages','seo_settings','home_sections','user_store_favorites','user_product_favorites','featured_items','banners','inventory_adjustments','product_images','product_specs','product_variants','products','categories'];
    for (const t of tables) await queryRunner.query(`DROP TABLE IF EXISTS ${t}`);
  }
}
