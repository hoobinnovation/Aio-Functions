import { MigrationInterface, QueryRunner } from 'typeorm';

export class DineInSecureTableSession1728100000000 implements MigrationInterface {
  name = 'DineInSecureTableSession1728100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE branches ADD COLUMN dineInEnabled tinyint(1) NOT NULL DEFAULT 0`);
    await queryRunner.query(`ALTER TABLE branches ADD COLUMN dineInSecureTableModeEnabled tinyint(1) NOT NULL DEFAULT 0`);
    await queryRunner.query(`ALTER TABLE branches ADD COLUMN dineInVerificationMethod varchar(24) NOT NULL DEFAULT 'qrOnly'`);
    await queryRunner.query(`ALTER TABLE branches ADD COLUMN dineInGeoRadiusMeters int NOT NULL DEFAULT 120`);
    await queryRunner.query(`ALTER TABLE branches ADD COLUMN locationLat decimal(10,7) NULL`);
    await queryRunner.query(`ALTER TABLE branches ADD COLUMN locationLng decimal(10,7) NULL`);

    await queryRunner.query(`
      CREATE TABLE dine_in_tables (
        id varchar(64) NOT NULL,
        storeId varchar(64) NOT NULL,
        branchId char(36) NOT NULL,
        code varchar(64) NOT NULL,
        tableNumber varchar(32) NOT NULL,
        name varchar(120) NULL,
        seatsCount int NOT NULL DEFAULT 1,
        status varchar(24) NOT NULL DEFAULT 'active',
        qrVersion int NOT NULL DEFAULT 1,
        qrPayload text NOT NULL,
        qrSignature varchar(255) NOT NULL,
        lastQrIssuedAt datetime NULL,
        createdAt datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id)
      ) ENGINE=InnoDB
    `);
    await queryRunner.query(`CREATE INDEX idx_dit_store ON dine_in_tables (storeId)`);
    await queryRunner.query(`CREATE INDEX idx_dit_branch ON dine_in_tables (branchId)`);
    await queryRunner.query(`CREATE UNIQUE INDEX uq_dit_branch_table_number ON dine_in_tables (branchId,tableNumber)`);
    await queryRunner.query(`CREATE UNIQUE INDEX uq_dit_branch_code ON dine_in_tables (branchId,code)`);

    await queryRunner.query(`
      CREATE TABLE dine_in_sessions (
        id varchar(64) NOT NULL,
        storeId varchar(64) NOT NULL,
        branchId char(36) NOT NULL,
        tableId varchar(64) NOT NULL,
        tableNumberSnapshot varchar(32) NOT NULL,
        customerUid varchar(128) NULL,
        sessionToken varchar(128) NOT NULL,
        sourceMode varchar(16) NOT NULL,
        verifiedBy varchar(16) NOT NULL,
        verificationMethod varchar(16) NOT NULL,
        verifiedAt datetime NOT NULL,
        expiresAt datetime NOT NULL,
        lastSeenAt datetime NOT NULL,
        status varchar(16) NOT NULL DEFAULT 'active',
        createdAt datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY uq_dis_token (sessionToken)
      ) ENGINE=InnoDB
    `);
    await queryRunner.query(`CREATE INDEX idx_dis_store ON dine_in_sessions (storeId)`);
    await queryRunner.query(`CREATE INDEX idx_dis_branch ON dine_in_sessions (branchId)`);
    await queryRunner.query(`CREATE INDEX idx_dis_table ON dine_in_sessions (tableId)`);
    await queryRunner.query(`CREATE INDEX idx_dis_customer ON dine_in_sessions (customerUid)`);
    await queryRunner.query(`CREATE INDEX idx_dis_status ON dine_in_sessions (status)`);

    await queryRunner.query(`
      CREATE TABLE dine_in_waiter_calls (
        id varchar(64) NOT NULL,
        storeId varchar(64) NOT NULL,
        branchId char(36) NOT NULL,
        tableId varchar(64) NOT NULL,
        sessionId varchar(64) NOT NULL,
        orderId char(36) NULL,
        customerUid varchar(128) NULL,
        callType varchar(24) NOT NULL,
        note text NULL,
        status varchar(24) NOT NULL DEFAULT 'open',
        createdAt datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        resolvedAt datetime NULL,
        resolvedByAdminUid varchar(128) NULL,
        PRIMARY KEY (id)
      ) ENGINE=InnoDB
    `);
    await queryRunner.query(`CREATE INDEX idx_diwc_store ON dine_in_waiter_calls (storeId)`);
    await queryRunner.query(`CREATE INDEX idx_diwc_branch ON dine_in_waiter_calls (branchId)`);
    await queryRunner.query(`CREATE INDEX idx_diwc_table ON dine_in_waiter_calls (tableId)`);
    await queryRunner.query(`CREATE INDEX idx_diwc_session ON dine_in_waiter_calls (sessionId)`);
    await queryRunner.query(`CREATE INDEX idx_diwc_status ON dine_in_waiter_calls (status)`);

    await queryRunner.query(`ALTER TABLE orders ADD COLUMN serviceType varchar(24) NOT NULL DEFAULT 'standard'`);
    await queryRunner.query(`ALTER TABLE orders ADD COLUMN branchId char(36) NULL`);
    await queryRunner.query(`ALTER TABLE orders ADD COLUMN tableId varchar(64) NULL`);
    await queryRunner.query(`ALTER TABLE orders ADD COLUMN dineInSessionId varchar(64) NULL`);

    await queryRunner.query(`ALTER TABLE store_settings ADD COLUMN dineInConfigJson text NULL`);

    await queryRunner.query(`
      CREATE TABLE order_reviews (
        id char(36) NOT NULL,
        storeId varchar(64) NOT NULL,
        orderId char(36) NOT NULL,
        uid varchar(128) NOT NULL,
        rating int NOT NULL,
        comment varchar(2000) NULL,
        branchId char(36) NULL,
        tableId varchar(64) NULL,
        dineInSessionId varchar(64) NULL,
        createdAt datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id)
      ) ENGINE=InnoDB
    `);
    await queryRunner.query(`CREATE INDEX idx_or_store_order ON order_reviews (storeId,orderId)`);
    await queryRunner.query(`CREATE INDEX idx_or_store_created ON order_reviews (storeId,createdAt)`);
    await queryRunner.query(`CREATE UNIQUE INDEX uq_or_order_uid ON order_reviews (orderId,uid)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX uq_or_order_uid ON order_reviews`);
    await queryRunner.query(`DROP INDEX idx_or_store_created ON order_reviews`);
    await queryRunner.query(`DROP INDEX idx_or_store_order ON order_reviews`);
    await queryRunner.query(`DROP TABLE order_reviews`);

    await queryRunner.query(`ALTER TABLE store_settings DROP COLUMN dineInConfigJson`);

    await queryRunner.query(`ALTER TABLE orders DROP COLUMN dineInSessionId`);
    await queryRunner.query(`ALTER TABLE orders DROP COLUMN tableId`);
    await queryRunner.query(`ALTER TABLE orders DROP COLUMN branchId`);
    await queryRunner.query(`ALTER TABLE orders DROP COLUMN serviceType`);

    await queryRunner.query(`DROP INDEX idx_diwc_status ON dine_in_waiter_calls`);
    await queryRunner.query(`DROP INDEX idx_diwc_session ON dine_in_waiter_calls`);
    await queryRunner.query(`DROP INDEX idx_diwc_table ON dine_in_waiter_calls`);
    await queryRunner.query(`DROP INDEX idx_diwc_branch ON dine_in_waiter_calls`);
    await queryRunner.query(`DROP INDEX idx_diwc_store ON dine_in_waiter_calls`);
    await queryRunner.query(`DROP TABLE dine_in_waiter_calls`);

    await queryRunner.query(`DROP INDEX idx_dis_status ON dine_in_sessions`);
    await queryRunner.query(`DROP INDEX idx_dis_customer ON dine_in_sessions`);
    await queryRunner.query(`DROP INDEX idx_dis_table ON dine_in_sessions`);
    await queryRunner.query(`DROP INDEX idx_dis_branch ON dine_in_sessions`);
    await queryRunner.query(`DROP INDEX idx_dis_store ON dine_in_sessions`);
    await queryRunner.query(`DROP TABLE dine_in_sessions`);

    await queryRunner.query(`DROP INDEX uq_dit_branch_code ON dine_in_tables`);
    await queryRunner.query(`DROP INDEX uq_dit_branch_table_number ON dine_in_tables`);
    await queryRunner.query(`DROP INDEX idx_dit_branch ON dine_in_tables`);
    await queryRunner.query(`DROP INDEX idx_dit_store ON dine_in_tables`);
    await queryRunner.query(`DROP TABLE dine_in_tables`);

    await queryRunner.query(`ALTER TABLE branches DROP COLUMN locationLng`);
    await queryRunner.query(`ALTER TABLE branches DROP COLUMN locationLat`);
    await queryRunner.query(`ALTER TABLE branches DROP COLUMN dineInGeoRadiusMeters`);
    await queryRunner.query(`ALTER TABLE branches DROP COLUMN dineInVerificationMethod`);
    await queryRunner.query(`ALTER TABLE branches DROP COLUMN dineInSecureTableModeEnabled`);
    await queryRunner.query(`ALTER TABLE branches DROP COLUMN dineInEnabled`);
  }
}
