import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTrackingHomeWalletDiscounts1770000000000 implements MigrationInterface {
  name = 'AddTrackingHomeWalletDiscounts1770000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE shipments ADD COLUMN trackingUrl varchar(500) NULL;
      ALTER TABLE shipments ADD COLUMN estimatedDelivery datetime NULL;
      ALTER TABLE shipments DROP INDEX IDX_shipments_order;
      ALTER TABLE shipments ADD UNIQUE KEY UQ_shipments_order (orderId);

      CREATE TABLE order_tracking_events (
        id char(36) NOT NULL,
        storeId char(36) NOT NULL,
        orderId char(36) NOT NULL,
        type enum('status','note','system') NOT NULL,
        status varchar(30) NULL,
        message varchar(500) NOT NULL,
        isDeleted tinyint NOT NULL DEFAULT 0,
        createdAt datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        INDEX IDX_order_tracking_events_order_created (orderId, createdAt),
        PRIMARY KEY (id),
        CONSTRAINT FK_tracking_order FOREIGN KEY (orderId) REFERENCES orders(id)
      ) ENGINE=InnoDB;

      CREATE TABLE home_sections (
        id char(36) NOT NULL,
        storeId char(36) NOT NULL,
        type enum('banners','categories_row','products_carousel','products_grid','single_banner') NOT NULL,
        title varchar(191) NULL,
        sortOrder int NOT NULL DEFAULT 0,
        isActive tinyint NOT NULL DEFAULT 1,
        configJson json NOT NULL,
        createdAt datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        updatedAt datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        INDEX IDX_home_sections_store_sort (storeId, sortOrder),
        PRIMARY KEY (id),
        CONSTRAINT FK_home_sections_store FOREIGN KEY (storeId) REFERENCES stores(id)
      ) ENGINE=InnoDB;

      CREATE TABLE home_section_banners (
        id char(36) NOT NULL,
        storeId char(36) NOT NULL,
        sectionId char(36) NOT NULL,
        imageUrl varchar(500) NOT NULL,
        actionType enum('none','open_category','open_product','open_url') NOT NULL DEFAULT 'none',
        actionValue varchar(255) NULL,
        sortOrder int NOT NULL DEFAULT 0,
        isActive tinyint NOT NULL DEFAULT 1,
        INDEX IDX_home_section_banners_store_section (storeId, sectionId),
        PRIMARY KEY (id),
        CONSTRAINT FK_home_banners_section FOREIGN KEY (sectionId) REFERENCES home_sections(id)
      ) ENGINE=InnoDB;

      CREATE TABLE cashback_campaigns (
        id char(36) NOT NULL,
        storeId char(36) NOT NULL,
        name varchar(191) NOT NULL,
        type enum('threshold','products','categories') NOT NULL,
        rewardType enum('fixed','percent') NOT NULL,
        value decimal(10,2) NOT NULL,
        minSubtotal decimal(10,2) NULL,
        maxReward decimal(10,2) NULL,
        targetJson json NULL,
        startAt datetime NULL,
        endAt datetime NULL,
        usageLimitTotal int NULL,
        usageLimitPerUser int NULL,
        usedCount int NOT NULL DEFAULT 0,
        isActive tinyint NOT NULL DEFAULT 1,
        createdAt datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        updatedAt datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        INDEX IDX_cashback_campaigns_store (storeId),
        PRIMARY KEY (id),
        CONSTRAINT FK_cashback_store FOREIGN KEY (storeId) REFERENCES stores(id)
      ) ENGINE=InnoDB;

      CREATE TABLE wallet_accounts (
        id char(36) NOT NULL,
        storeId char(36) NOT NULL,
        uid varchar(128) NOT NULL,
        balance decimal(12,2) NOT NULL DEFAULT 0,
        UNIQUE KEY UQ_wallet_accounts_store_uid (storeId, uid),
        INDEX IDX_wallet_accounts_store (storeId),
        PRIMARY KEY (id),
        CONSTRAINT FK_wallet_store FOREIGN KEY (storeId) REFERENCES stores(id)
      ) ENGINE=InnoDB;

      CREATE TABLE wallet_transactions (
        id char(36) NOT NULL,
        storeId char(36) NOT NULL,
        uid varchar(128) NOT NULL,
        type enum('cashback_earn','cashback_redeem','expire','adjust') NOT NULL,
        amount decimal(12,2) NOT NULL,
        reason varchar(191) NOT NULL,
        refType varchar(30) NULL,
        refId varchar(64) NULL,
        expiresAt datetime NULL,
        createdAt datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        INDEX IDX_wallet_transactions_uid_created (uid, createdAt),
        PRIMARY KEY (id),
        CONSTRAINT FK_wallet_txn_store FOREIGN KEY (storeId) REFERENCES stores(id)
      ) ENGINE=InnoDB;

      CREATE TABLE cashback_redemptions (
        id char(36) NOT NULL,
        storeId char(36) NOT NULL,
        campaignId char(36) NOT NULL,
        uid varchar(128) NOT NULL,
        orderId char(36) NOT NULL,
        createdAt datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        INDEX IDX_cashback_redemptions_campaign_uid (campaignId, uid),
        PRIMARY KEY (id),
        CONSTRAINT FK_cashback_redemptions_campaign FOREIGN KEY (campaignId) REFERENCES cashback_campaigns(id),
        CONSTRAINT FK_cashback_redemptions_order FOREIGN KEY (orderId) REFERENCES orders(id)
      ) ENGINE=InnoDB;

      CREATE TABLE discount_campaigns (
        id char(36) NOT NULL,
        storeId char(36) NOT NULL,
        name varchar(191) NOT NULL,
        isActive tinyint NOT NULL DEFAULT 1,
        priority int NOT NULL DEFAULT 0,
        startAt datetime NULL,
        endAt datetime NULL,
        audienceJson json NOT NULL,
        appliesToJson json NOT NULL,
        discountType enum('percent','fixed') NOT NULL,
        value decimal(10,2) NOT NULL,
        maxDiscount decimal(10,2) NULL,
        minSubtotal decimal(10,2) NULL,
        createdAt datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        updatedAt datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        INDEX IDX_discount_campaigns_store (storeId),
        INDEX IDX_discount_campaigns_active_priority (storeId, isActive, priority),
        PRIMARY KEY (id),
        CONSTRAINT FK_discount_store FOREIGN KEY (storeId) REFERENCES stores(id)
      ) ENGINE=InnoDB;

      CREATE TABLE users (
        uid varchar(128) NOT NULL,
        storeId char(36) NULL,
        gender varchar(16) NULL,
        tags json NULL,
        loyaltyTierId char(36) NULL,
        isVip tinyint NOT NULL DEFAULT 0,
        PRIMARY KEY (uid)
      ) ENGINE=InnoDB;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP TABLE IF EXISTS users;
      DROP TABLE IF EXISTS discount_campaigns;
      DROP TABLE IF EXISTS cashback_redemptions;
      DROP TABLE IF EXISTS wallet_transactions;
      DROP TABLE IF EXISTS wallet_accounts;
      DROP TABLE IF EXISTS cashback_campaigns;
      DROP TABLE IF EXISTS home_section_banners;
      DROP TABLE IF EXISTS home_sections;
      DROP TABLE IF EXISTS order_tracking_events;
      ALTER TABLE shipments DROP INDEX UQ_shipments_order;
      ALTER TABLE shipments ADD INDEX IDX_shipments_order (orderId);
      ALTER TABLE shipments DROP COLUMN trackingUrl;
      ALTER TABLE shipments DROP COLUMN estimatedDelivery;
    `);
  }
}
