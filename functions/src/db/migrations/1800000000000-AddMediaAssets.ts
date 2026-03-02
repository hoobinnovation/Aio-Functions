import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMediaAssets1800000000000 implements MigrationInterface {
  name = 'AddMediaAssets1800000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE media_assets (
        id char(36) NOT NULL,
        storeId char(36) NULL,
        ownerType enum('product','category','banner','homeSection','landing','user','insurance','other') NOT NULL,
        ownerId varchar(128) NOT NULL,
        kind enum('image','document') NOT NULL,
        originalPath varchar(500) NOT NULL,
        thumbnailPath varchar(500) NULL,
        contentType varchar(191) NOT NULL,
        sizeBytes bigint NOT NULL DEFAULT 0,
        width int NULL,
        height int NULL,
        thumbWidth int NULL,
        thumbHeight int NULL,
        status enum('created','uploaded','processing','ready','failed') NOT NULL DEFAULT 'created',
        createdByUid varchar(128) NOT NULL,
        createdAt datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        updatedAt datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        INDEX IDX_media_assets_store_owner (storeId, ownerType, ownerId),
        INDEX IDX_media_assets_status (status),
        INDEX IDX_media_assets_creator_created (createdByUid, createdAt),
        PRIMARY KEY (id)
      ) ENGINE=InnoDB;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS media_assets;`);
  }
}
