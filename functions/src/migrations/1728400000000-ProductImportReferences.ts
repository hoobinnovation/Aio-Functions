import { MigrationInterface, QueryRunner } from 'typeorm';

export class ProductImportReferences1728400000000 implements MigrationInterface {
  name = 'ProductImportReferences1728400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE product_import_references (
        id char(36) NOT NULL,
        storeId varchar(64) NOT NULL,
        productId char(36) NOT NULL,
        sourceType varchar(40) NOT NULL,
        sourceKey varchar(140) NOT NULL,
        sourceRowId varchar(140) NULL,
        parentCategoryName varchar(160) NOT NULL,
        categoryName varchar(160) NOT NULL,
        sourceImageUrl varchar(1024) NULL,
        sourcePayloadJson json NOT NULL,
        sourcePayloadHash varchar(128) NOT NULL,
        lastImportedAt datetime NOT NULL,
        createdAt datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY uq_product_import_store_source (storeId,sourceType,sourceKey),
        KEY idx_product_import_product_id (productId),
        KEY idx_product_import_store_id (storeId)
      ) ENGINE=InnoDB
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE product_import_references`);
  }
}
