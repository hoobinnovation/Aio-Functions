import { MigrationInterface, QueryRunner } from 'typeorm';

export class StoreFeatureVisibility1728500000000 implements MigrationInterface {
  name = 'StoreFeatureVisibility1728500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE store_settings ADD COLUMN featureVisibilityJson text NULL AFTER dineInConfigJson`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE store_settings DROP COLUMN featureVisibilityJson`);
  }
}
