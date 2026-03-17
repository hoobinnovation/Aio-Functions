import { MigrationInterface, QueryRunner } from 'typeorm';

export class DeliveryBackendFoundation1729700000000 implements MigrationInterface {
  name = 'DeliveryBackendFoundation1729700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const hasColumn = async (table: string, column: string) => {
      const rows = await queryRunner.query(`SHOW COLUMNS FROM ${table} LIKE '${column}'`);
      return Array.isArray(rows) && rows.length > 0;
    };
    const hasIndex = async (table: string, indexName: string) => {
      const rows = await queryRunner.query(`SHOW INDEX FROM ${table} WHERE Key_name = '${indexName}'`);
      return Array.isArray(rows) && rows.length > 0;
    };

    if (!(await hasColumn('orders', 'riderId'))) {
      await queryRunner.query('ALTER TABLE orders ADD COLUMN riderId char(36) NULL AFTER branchId');
    }
    if (!(await hasColumn('orders', 'tripId'))) {
      await queryRunner.query('ALTER TABLE orders ADD COLUMN tripId char(36) NULL AFTER riderId');
    }
    if (!(await hasColumn('orders', 'deliveryStatus'))) {
      await queryRunner.query('ALTER TABLE orders ADD COLUMN deliveryStatus varchar(24) NULL AFTER tripId');
    }
    if (!(await hasColumn('orders', 'statusReason'))) {
      await queryRunner.query('ALTER TABLE orders ADD COLUMN statusReason varchar(300) NULL AFTER deliveryStatus');
    }
    if (!(await hasColumn('orders', 'assignedAt'))) {
      await queryRunner.query('ALTER TABLE orders ADD COLUMN assignedAt datetime NULL AFTER statusReason');
    }
    if (!(await hasColumn('orders', 'acceptedAt'))) {
      await queryRunner.query('ALTER TABLE orders ADD COLUMN acceptedAt datetime NULL AFTER assignedAt');
    }
    if (!(await hasColumn('orders', 'pickedUpAt'))) {
      await queryRunner.query('ALTER TABLE orders ADD COLUMN pickedUpAt datetime NULL AFTER acceptedAt');
    }
    if (!(await hasColumn('orders', 'deliveredAt'))) {
      await queryRunner.query('ALTER TABLE orders ADD COLUMN deliveredAt datetime NULL AFTER pickedUpAt');
    }
    if (!(await hasColumn('orders', 'failedAt'))) {
      await queryRunner.query('ALTER TABLE orders ADD COLUMN failedAt datetime NULL AFTER deliveredAt');
    }
    if (!(await hasColumn('orders', 'latestRiderLocationSnapshotJson'))) {
      await queryRunner.query('ALTER TABLE orders ADD COLUMN latestRiderLocationSnapshotJson json NULL AFTER failedAt');
    }
    if (!(await hasColumn('orders', 'updatedAt'))) {
      await queryRunner.query('ALTER TABLE orders ADD COLUMN updatedAt datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER createdAt');
    }
    if (!(await hasIndex('orders', 'idx_orders_store_rider_delivery'))) {
      await queryRunner.query('CREATE INDEX idx_orders_store_rider_delivery ON orders (storeId, riderId, deliveryStatus, updatedAt)');
    }

    await queryRunner.query(`CREATE TABLE IF NOT EXISTS delivery_riders (
      id char(36) PRIMARY KEY,
      uid varchar(128) NOT NULL,
      storeId varchar(64) NOT NULL,
      branchId char(36) NULL,
      displayName varchar(80) NULL,
      phone varchar(32) NULL,
      vehicleType varchar(48) NULL,
      status varchar(24) NOT NULL DEFAULT 'active',
      presenceStatus varchar(24) NOT NULL DEFAULT 'offline',
      activeOrderId char(36) NULL,
      activeTripId char(36) NULL,
      lastSeenAt datetime NULL,
      createdAt datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uq_delivery_riders_uid (uid),
      KEY idx_delivery_riders_store_presence (storeId, presenceStatus, status),
      KEY idx_delivery_riders_store_updated (storeId, updatedAt)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

    await queryRunner.query(`CREATE TABLE IF NOT EXISTS delivery_trips (
      id char(36) PRIMARY KEY,
      riderId char(36) NOT NULL,
      storeId varchar(64) NOT NULL,
      branchId char(36) NULL,
      orderIdsJson json NULL,
      status varchar(24) NOT NULL DEFAULT 'active',
      startedAt datetime NULL,
      endedAt datetime NULL,
      createdAt datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      KEY idx_delivery_trips_rider_status (riderId, status, updatedAt),
      KEY idx_delivery_trips_store_status (storeId, status, updatedAt)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

    await queryRunner.query(`CREATE TABLE IF NOT EXISTS delivery_assignments (
      id char(36) PRIMARY KEY,
      orderId char(36) NOT NULL,
      storeId varchar(64) NOT NULL,
      branchId char(36) NULL,
      riderId char(36) NULL,
      tripId char(36) NULL,
      status varchar(24) NOT NULL,
      reason varchar(300) NULL,
      assignedByUid varchar(128) NULL,
      assignedAt datetime NULL,
      respondedAt datetime NULL,
      completedAt datetime NULL,
      createdAt datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uq_delivery_assignments_order (orderId),
      KEY idx_delivery_assignments_store_status (storeId, status, updatedAt),
      KEY idx_delivery_assignments_rider_status (riderId, status, updatedAt)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

    await queryRunner.query(`CREATE TABLE IF NOT EXISTS delivery_order_events (
      id char(36) PRIMARY KEY,
      orderId char(36) NOT NULL,
      storeId varchar(64) NOT NULL,
      riderId char(36) NULL,
      tripId char(36) NULL,
      type varchar(40) NOT NULL,
      actorType varchar(24) NOT NULL,
      actorId varchar(128) NULL,
      statusBefore varchar(24) NULL,
      statusAfter varchar(24) NULL,
      reason varchar(300) NULL,
      metadataJson json NULL,
      createdAt datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
      KEY idx_delivery_order_events_order_created (orderId, createdAt),
      KEY idx_delivery_order_events_store_created (storeId, createdAt)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

    await queryRunner.query(`CREATE TABLE IF NOT EXISTS delivery_action_requests (
      id char(36) PRIMARY KEY,
      gateway varchar(24) NOT NULL,
      actorId varchar(128) NOT NULL,
      actionName varchar(64) NOT NULL,
      idempotencyKey varchar(120) NOT NULL,
      requestHash varchar(80) NOT NULL,
      orderId char(36) NULL,
      status varchar(24) NOT NULL DEFAULT 'pending',
      responseJson json NULL,
      createdAt datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uq_delivery_action_requests (gateway, actorId, actionName, idempotencyKey),
      KEY idx_delivery_action_requests_order (orderId),
      KEY idx_delivery_action_requests_created (createdAt)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS delivery_action_requests');
    await queryRunner.query('DROP TABLE IF EXISTS delivery_order_events');
    await queryRunner.query('DROP TABLE IF EXISTS delivery_assignments');
    await queryRunner.query('DROP TABLE IF EXISTS delivery_trips');
    await queryRunner.query('DROP TABLE IF EXISTS delivery_riders');
  }
}
