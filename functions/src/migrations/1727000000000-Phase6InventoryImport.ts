import { MigrationInterface, QueryRunner } from 'typeorm';

export class Phase6InventoryImport1727000000000 implements MigrationInterface {
  name = 'Phase6InventoryImport1727000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE IF NOT EXISTS product_prefix_mappings (
      id int NOT NULL AUTO_INCREMENT PRIMARY KEY,
      storeId varchar(64) NOT NULL,
      prefix varchar(64) NOT NULL,
      productId char(36) NOT NULL,
      createdAt datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uq_product_prefix_mappings_store_prefix (storeId,prefix),
      KEY idx_product_prefix_mappings_store_prefix (storeId,prefix),
      KEY idx_product_prefix_mappings_product (productId)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

    await queryRunner.query(`CREATE TABLE IF NOT EXISTS inventory_import_batches (
      id int NOT NULL AUTO_INCREMENT PRIMARY KEY,
      storeId varchar(64) NOT NULL,
      fileMediaAssetId char(36) NOT NULL,
      fileType enum('excel','pdf') NOT NULL,
      status enum('draft','needsMapping','readyToApply','processing','done','failed') NOT NULL DEFAULT 'draft',
      idempotencyKey char(64) NOT NULL,
      totalRows int NOT NULL DEFAULT 0,
      parsedRows int NOT NULL DEFAULT 0,
      unmappedPrefixesCount int NOT NULL DEFAULT 0,
      createdProductsCount int NOT NULL DEFAULT 0,
      adjustmentsCount int NOT NULL DEFAULT 0,
      parseErrorsCount int NOT NULL DEFAULT 0,
      createdByAdminUid varchar(128) NOT NULL,
      createdAt datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      finishedAt datetime NULL,
      errorDetails json NULL,
      UNIQUE KEY uq_inventory_import_batches_idempotency (idempotencyKey),
      KEY idx_inventory_import_batches_store (storeId),
      KEY idx_inventory_import_batches_media (fileMediaAssetId)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

    await queryRunner.query(`CREATE TABLE IF NOT EXISTS inventory_import_rows (
      id int NOT NULL AUTO_INCREMENT PRIMARY KEY,
      batchId int NOT NULL,
      rowIndex int NOT NULL,
      prefix varchar(64) NULL,
      externalCode varchar(180) NULL,
      name varchar(180) NULL,
      company varchar(180) NULL,
      unit varchar(80) NULL,
      qtyOnHand decimal(12,3) NULL,
      priceCents bigint NULL,
      rawLine text NULL,
      parseStatus enum('ok','error') NOT NULL,
      parseErrorMessage text NULL,
      KEY idx_inventory_import_rows_batch (batchId)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

    await queryRunner.query(`CREATE TABLE IF NOT EXISTS inventory_balances (
      id int NOT NULL AUTO_INCREMENT PRIMARY KEY,
      storeId varchar(64) NOT NULL,
      productId char(36) NOT NULL,
      onHandQty decimal(12,3) NOT NULL DEFAULT 0,
      updatedAt datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uq_inventory_balances_store_product (storeId,productId)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

    await queryRunner.query(`ALTER TABLE inventory_adjustments ADD COLUMN IF NOT EXISTS storeId varchar(64) NULL`);
    await queryRunner.query(`ALTER TABLE inventory_adjustments ADD COLUMN IF NOT EXISTS productId char(36) NULL`);
    await queryRunner.query(`ALTER TABLE inventory_adjustments ADD COLUMN IF NOT EXISTS beforeQty decimal(12,3) NULL`);
    await queryRunner.query(`ALTER TABLE inventory_adjustments ADD COLUMN IF NOT EXISTS afterQty decimal(12,3) NULL`);
    await queryRunner.query(`ALTER TABLE inventory_adjustments ADD COLUMN IF NOT EXISTS importBatchId int NULL`);
    await queryRunner.query(`ALTER TABLE inventory_adjustments ADD COLUMN IF NOT EXISTS createdByAdminUid varchar(128) NULL`);
    await queryRunner.query(`ALTER TABLE inventory_adjustments MODIFY COLUMN deltaQty decimal(12,3) NOT NULL`);
    await queryRunner.query(`ALTER TABLE inventory_adjustments MODIFY COLUMN variantId char(36) NULL`);
    await queryRunner.query(`ALTER TABLE inventory_adjustments MODIFY COLUMN performedByUid varchar(128) NULL`);
    await queryRunner.query(`CREATE INDEX idx_inventory_adjustments_store_product ON inventory_adjustments (storeId,productId,createdAt)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS inventory_balances');
    await queryRunner.query('DROP TABLE IF EXISTS inventory_import_rows');
    await queryRunner.query('DROP TABLE IF EXISTS inventory_import_batches');
    await queryRunner.query('DROP TABLE IF EXISTS product_prefix_mappings');
  }
}
