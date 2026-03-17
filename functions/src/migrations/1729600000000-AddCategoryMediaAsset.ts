import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCategoryMediaAsset1729600000000 implements MigrationInterface {
  name = 'AddCategoryMediaAsset1729600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE categories
      ADD COLUMN mediaAssetId char(36) NULL AFTER parentId
    `).catch(() => undefined);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE categories
      DROP COLUMN mediaAssetId
    `).catch(() => undefined);
  }
}
