import { MigrationInterface, QueryRunner } from 'typeorm';

export class ExplicitDeliveryZoneContract1728200000000 implements MigrationInterface {
  name = 'ExplicitDeliveryZoneContract1728200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE user_addresses ADD COLUMN zoneId char(36) NULL`);
    await queryRunner.query(`CREATE INDEX idx_user_addresses_uid_zone ON user_addresses (uid, zoneId)`);

    await queryRunner.query(`ALTER TABLE orders ADD COLUMN deliveryZoneId char(36) NULL`);
    await queryRunner.query(`ALTER TABLE orders ADD COLUMN deliveryZoneName varchar(120) NULL`);
    await queryRunner.query(`ALTER TABLE orders ADD COLUMN shippingMethodId char(36) NULL`);
    await queryRunner.query(`ALTER TABLE orders ADD COLUMN shippingRecipientName varchar(80) NULL`);
    await queryRunner.query(`ALTER TABLE orders ADD COLUMN shippingPhone varchar(32) NULL`);
    await queryRunner.query(`ALTER TABLE orders ADD COLUMN shippingAddressLabel varchar(80) NULL`);
    await queryRunner.query(`ALTER TABLE orders ADD COLUMN shippingAddressLine varchar(300) NULL`);

    await queryRunner.query(`CREATE INDEX idx_orders_store_zone ON orders (storeId, deliveryZoneId)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX idx_orders_store_zone ON orders`);
    await queryRunner.query(`ALTER TABLE orders DROP COLUMN shippingAddressLine`);
    await queryRunner.query(`ALTER TABLE orders DROP COLUMN shippingAddressLabel`);
    await queryRunner.query(`ALTER TABLE orders DROP COLUMN shippingPhone`);
    await queryRunner.query(`ALTER TABLE orders DROP COLUMN shippingRecipientName`);
    await queryRunner.query(`ALTER TABLE orders DROP COLUMN shippingMethodId`);
    await queryRunner.query(`ALTER TABLE orders DROP COLUMN deliveryZoneName`);
    await queryRunner.query(`ALTER TABLE orders DROP COLUMN deliveryZoneId`);

    await queryRunner.query(`DROP INDEX idx_user_addresses_uid_zone ON user_addresses`);
    await queryRunner.query(`ALTER TABLE user_addresses DROP COLUMN zoneId`);
  }
}
