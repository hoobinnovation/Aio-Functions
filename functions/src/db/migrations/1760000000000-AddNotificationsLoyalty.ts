import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddNotificationsLoyalty1760000000000 implements MigrationInterface {
  name = 'AddNotificationsLoyalty1760000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE notifications (
        id char(36) NOT NULL,
        storeId char(36) NOT NULL,
        uid varchar(128) NOT NULL,
        type enum('order','payment','shipping','offer','system') NOT NULL,
        title varchar(191) NOT NULL,
        body varchar(500) NOT NULL,
        deepLinkType varchar(64) NULL,
        deepLinkValue varchar(255) NULL,
        isRead tinyint NOT NULL DEFAULT 0,
        createdAt datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        INDEX IDX_notifications_store (storeId),
        INDEX IDX_notifications_uid_read_created (uid, isRead, createdAt),
        PRIMARY KEY (id)
      ) ENGINE=InnoDB;

      CREATE TABLE notification_tokens (
        id char(36) NOT NULL,
        storeId char(36) NOT NULL,
        uid varchar(128) NOT NULL,
        token varchar(255) NOT NULL,
        platform varchar(30) NOT NULL,
        deviceInfo json NULL,
        lastSeenAt datetime NOT NULL,
        createdAt datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        UNIQUE KEY UQ_notification_tokens_token (token),
        INDEX IDX_notification_tokens_store (storeId),
        INDEX IDX_notification_tokens_uid (uid),
        PRIMARY KEY (id)
      ) ENGINE=InnoDB;

      CREATE TABLE notification_campaigns (
        id char(36) NOT NULL,
        storeId char(36) NOT NULL,
        createdByAdminUid varchar(128) NOT NULL,
        title varchar(191) NOT NULL,
        body varchar(500) NOT NULL,
        targetType enum('all','segment','user') NOT NULL,
        targetSpec json NOT NULL,
        deepLinkType varchar(64) NULL,
        deepLinkValue varchar(255) NULL,
        scheduledAt datetime NULL,
        status enum('queued','sent','failed','partial') NOT NULL DEFAULT 'queued',
        sentCount int NOT NULL DEFAULT 0,
        failedCount int NOT NULL DEFAULT 0,
        createdAt datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        INDEX IDX_notification_campaigns_store (storeId),
        INDEX IDX_notification_campaigns_schedule (status, scheduledAt),
        PRIMARY KEY (id)
      ) ENGINE=InnoDB;

      CREATE TABLE loyalty_settings (
        storeId char(36) NOT NULL,
        pointsPerCurrency decimal(10,4) NOT NULL DEFAULT 1.0000,
        expiryDays int NOT NULL DEFAULT 365,
        redemptionEnabled tinyint NOT NULL DEFAULT 1,
        currencyPerPoint decimal(10,4) NOT NULL DEFAULT 1.0000,
        updatedAt datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (storeId),
        CONSTRAINT FK_loyalty_settings_store FOREIGN KEY (storeId) REFERENCES stores(id)
      ) ENGINE=InnoDB;

      CREATE TABLE loyalty_tiers (
        id char(36) NOT NULL,
        storeId char(36) NOT NULL,
        name varchar(100) NOT NULL,
        thresholdPoints int NOT NULL,
        multiplier decimal(6,2) NOT NULL DEFAULT 1.00,
        isActive tinyint NOT NULL DEFAULT 1,
        sortOrder int NOT NULL DEFAULT 0,
        INDEX IDX_loyalty_tiers_store (storeId),
        PRIMARY KEY (id),
        CONSTRAINT FK_loyalty_tiers_store FOREIGN KEY (storeId) REFERENCES stores(id)
      ) ENGINE=InnoDB;

      CREATE TABLE loyalty_accounts (
        id char(36) NOT NULL,
        storeId char(36) NOT NULL,
        uid varchar(128) NOT NULL,
        balance int NOT NULL DEFAULT 0,
        tierId char(36) NULL,
        updatedAt datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        UNIQUE KEY UQ_loyalty_accounts_store_uid (storeId, uid),
        INDEX IDX_loyalty_accounts_store (storeId),
        INDEX IDX_loyalty_accounts_uid (uid),
        PRIMARY KEY (id),
        CONSTRAINT FK_loyalty_accounts_store FOREIGN KEY (storeId) REFERENCES stores(id),
        CONSTRAINT FK_loyalty_accounts_tier FOREIGN KEY (tierId) REFERENCES loyalty_tiers(id)
      ) ENGINE=InnoDB;

      CREATE TABLE loyalty_transactions (
        id char(36) NOT NULL,
        storeId char(36) NOT NULL,
        uid varchar(128) NOT NULL,
        type enum('earn','redeem','expire','adjust') NOT NULL,
        points int NOT NULL,
        reason varchar(191) NOT NULL,
        refType varchar(30) NULL,
        refId varchar(64) NULL,
        expiresAt datetime NULL,
        createdAt datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        INDEX IDX_loyalty_transactions_store (storeId),
        INDEX IDX_loyalty_transactions_uid_created (uid, createdAt),
        INDEX IDX_loyalty_transactions_expires (expiresAt),
        PRIMARY KEY (id),
        CONSTRAINT FK_loyalty_transactions_store FOREIGN KEY (storeId) REFERENCES stores(id)
      ) ENGINE=InnoDB;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP TABLE IF EXISTS loyalty_transactions;
      DROP TABLE IF EXISTS loyalty_accounts;
      DROP TABLE IF EXISTS loyalty_tiers;
      DROP TABLE IF EXISTS loyalty_settings;
      DROP TABLE IF EXISTS notification_campaigns;
      DROP TABLE IF EXISTS notification_tokens;
      DROP TABLE IF EXISTS notifications;
    `);
  }
}
