import { MigrationInterface, QueryRunner } from 'typeorm';

export class ProductAliasAndPriceImportFoundation1729500000000 implements MigrationInterface {
  name = 'ProductAliasAndPriceImportFoundation1729500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE IF NOT EXISTS product_aliases (
      id char(36) NOT NULL,
      storeId varchar(64) NOT NULL,
      productId char(36) NOT NULL,
      alias varchar(180) NOT NULL,
      normalizedAlias varchar(180) NOT NULL,
      createdAt datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uq_product_aliases_store_product (storeId, productId),
      KEY idx_product_aliases_store_normalized (storeId, normalizedAlias),
      CONSTRAINT fk_product_aliases_product FOREIGN KEY (productId) REFERENCES products(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

    await queryRunner.query(`CREATE TABLE IF NOT EXISTS store_variant_price_overrides (
      id char(36) NOT NULL,
      storeId varchar(64) NOT NULL,
      variantId char(36) NOT NULL,
      priceCents bigint NOT NULL,
      priceImportSessionId char(36) NULL,
      createdAt datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uq_store_variant_price_overrides_store_variant (storeId, variantId),
      KEY idx_store_variant_price_overrides_session (priceImportSessionId),
      CONSTRAINT fk_store_variant_price_overrides_variant FOREIGN KEY (variantId) REFERENCES product_variants(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

    await queryRunner.query(`CREATE TABLE IF NOT EXISTS product_import_mappings (
      id char(36) NOT NULL,
      storeId varchar(64) NOT NULL,
      sourceText varchar(180) NOT NULL,
      normalizedSourceText varchar(180) NOT NULL,
      productId char(36) NOT NULL,
      variantId char(36) NULL,
      confidence int NOT NULL DEFAULT 0,
      mappingType varchar(24) NOT NULL DEFAULT 'manual',
      createdAt datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uq_product_import_mappings_store_source (storeId, normalizedSourceText),
      KEY idx_product_import_mappings_store_product (storeId, productId),
      CONSTRAINT fk_product_import_mappings_product FOREIGN KEY (productId) REFERENCES products(id) ON DELETE CASCADE,
      CONSTRAINT fk_product_import_mappings_variant FOREIGN KEY (variantId) REFERENCES product_variants(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

    await queryRunner.query(`CREATE TABLE IF NOT EXISTS price_import_sessions (
      id char(36) NOT NULL,
      storeId varchar(64) NOT NULL,
      fileMediaAssetId char(36) NULL,
      fileName varchar(255) NULL,
      fileType varchar(24) NULL,
      status varchar(24) NOT NULL DEFAULT 'draft',
      totalRows int NOT NULL DEFAULT 0,
      mappedRows int NOT NULL DEFAULT 0,
      suggestedRows int NOT NULL DEFAULT 0,
      reviewRows int NOT NULL DEFAULT 0,
      appliedRows int NOT NULL DEFAULT 0,
      skippedRows int NOT NULL DEFAULT 0,
      invalidRows int NOT NULL DEFAULT 0,
      createdByAdminUid varchar(128) NOT NULL,
      errorDetails text NULL,
      createdAt datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      finishedAt datetime NULL,
      PRIMARY KEY (id),
      KEY idx_price_import_sessions_store_status (storeId, status, createdAt),
      CONSTRAINT fk_price_import_sessions_media FOREIGN KEY (fileMediaAssetId) REFERENCES media_assets(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

    await queryRunner.query(`CREATE TABLE IF NOT EXISTS price_import_rows (
      id char(36) NOT NULL,
      sessionId char(36) NOT NULL,
      rowNumber int NOT NULL,
      sourceName varchar(180) NOT NULL,
      normalizedSourceName varchar(180) NOT NULL,
      sourcePriceCents bigint NULL,
      sourceUnit varchar(80) NULL,
      sourceBalance decimal(12,3) NULL,
      matchedProductId char(36) NULL,
      matchedVariantId char(36) NULL,
      confidenceScore int NULL,
      matchStatus varchar(32) NOT NULL DEFAULT 'unmapped',
      mappingSource varchar(24) NULL,
      candidateMatches json NULL,
      issues json NULL,
      createdAt datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uq_price_import_rows_session_row (sessionId, rowNumber),
      KEY idx_price_import_rows_session_status (sessionId, matchStatus),
      CONSTRAINT fk_price_import_rows_session FOREIGN KEY (sessionId) REFERENCES price_import_sessions(id) ON DELETE CASCADE,
      CONSTRAINT fk_price_import_rows_product FOREIGN KEY (matchedProductId) REFERENCES products(id) ON DELETE SET NULL,
      CONSTRAINT fk_price_import_rows_variant FOREIGN KEY (matchedVariantId) REFERENCES product_variants(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

    await queryRunner.query(`ALTER TABLE store_variant_price_overrides
      ADD CONSTRAINT fk_store_variant_price_overrides_session
      FOREIGN KEY (priceImportSessionId) REFERENCES price_import_sessions(id) ON DELETE SET NULL`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS price_import_rows');
    await queryRunner.query('DROP TABLE IF EXISTS price_import_sessions');
    await queryRunner.query('DROP TABLE IF EXISTS product_import_mappings');
    await queryRunner.query('DROP TABLE IF EXISTS store_variant_price_overrides');
    await queryRunner.query('DROP TABLE IF EXISTS product_aliases');
  }
}
