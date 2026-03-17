import { MigrationInterface, QueryRunner } from 'typeorm';

export class DeliveryTrackingReadModel1729800000000 implements MigrationInterface {
  name = 'DeliveryTrackingReadModel1729800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const hasColumn = async (table: string, column: string) => {
      const rows = await queryRunner.query(`SHOW COLUMNS FROM ${table} LIKE '${column}'`);
      return Array.isArray(rows) && rows.length > 0;
    };

    if (!(await hasColumn('orders', 'shippingLat'))) {
      await queryRunner.query('ALTER TABLE orders ADD COLUMN shippingLat decimal(10,7) NULL AFTER shippingAddressLine');
    }

    if (!(await hasColumn('orders', 'shippingLng'))) {
      await queryRunner.query('ALTER TABLE orders ADD COLUMN shippingLng decimal(10,7) NULL AFTER shippingLat');
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const hasColumn = async (table: string, column: string) => {
      const rows = await queryRunner.query(`SHOW COLUMNS FROM ${table} LIKE '${column}'`);
      return Array.isArray(rows) && rows.length > 0;
    };

    if (await hasColumn('orders', 'shippingLng')) {
      await queryRunner.query('ALTER TABLE orders DROP COLUMN shippingLng');
    }

    if (await hasColumn('orders', 'shippingLat')) {
      await queryRunner.query('ALTER TABLE orders DROP COLUMN shippingLat');
    }
  }
}
