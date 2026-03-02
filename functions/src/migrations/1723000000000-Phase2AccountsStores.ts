import { MigrationInterface, QueryRunner } from 'typeorm';

export class Phase2AccountsStores1723000000000 implements MigrationInterface {
  name = 'Phase2AccountsStores1723000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS phone varchar(32) NULL");
    await queryRunner.query("ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS email varchar(255) NULL");
    await queryRunner.query("ALTER TABLE user_profiles MODIFY COLUMN displayName varchar(80) NULL");
    await queryRunner.query("ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS locale varchar(10) NULL");
    await queryRunner.query("ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS marketingOptIn tinyint(1) NOT NULL DEFAULT 0");
    await queryRunner.query("ALTER TABLE user_profiles MODIFY COLUMN status varchar(24) NOT NULL DEFAULT 'active'");
    await queryRunner.query("ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS disabledReason varchar(300) NULL");
    await queryRunner.query("ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS disabledAt datetime NULL");
    await queryRunner.query("ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS disabledByUid varchar(128) NULL");
    await queryRunner.query("CREATE INDEX IF NOT EXISTS idx_user_profiles_status ON user_profiles(status)");
    await queryRunner.query("CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON user_profiles(email)");
    await queryRunner.query("CREATE INDEX IF NOT EXISTS idx_user_profiles_phone ON user_profiles(phone)");
    await queryRunner.query("CREATE INDEX IF NOT EXISTS idx_user_profiles_displayName ON user_profiles(displayName)");

    await queryRunner.query(`CREATE TABLE IF NOT EXISTS user_addresses (
      id char(36) NOT NULL,
      uid varchar(128) NOT NULL,
      label varchar(40) NOT NULL,
      recipientName varchar(80) NOT NULL,
      phone varchar(32) NULL,
      governorate varchar(80) NOT NULL,
      city varchar(80) NOT NULL,
      area varchar(120) NULL,
      street varchar(160) NOT NULL,
      building varchar(60) NULL,
      floor varchar(30) NULL,
      apartment varchar(30) NULL,
      landmark varchar(160) NULL,
      lat decimal(10,7) NOT NULL,
      lng decimal(10,7) NOT NULL,
      notes varchar(300) NULL,
      isDefault tinyint(1) NOT NULL DEFAULT 0,
      createdAt datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      CONSTRAINT fk_user_addresses_uid FOREIGN KEY (uid) REFERENCES user_profiles(uid) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
    await queryRunner.query("CREATE INDEX IF NOT EXISTS idx_user_addresses_uid ON user_addresses(uid)");
    await queryRunner.query("CREATE INDEX IF NOT EXISTS idx_user_addresses_uid_default ON user_addresses(uid,isDefault)");
    await queryRunner.query("CREATE INDEX IF NOT EXISTS idx_user_addresses_uid_updated ON user_addresses(uid,updatedAt)");

    await queryRunner.query(`CREATE TABLE IF NOT EXISTS user_account_delete_requests (
      id char(36) NOT NULL,
      uid varchar(128) NOT NULL,
      reason varchar(500) NULL,
      status varchar(24) NOT NULL DEFAULT 'pending',
      requestedAt datetime NOT NULL,
      reviewedAt datetime NULL,
      reviewedByUid varchar(128) NULL,
      PRIMARY KEY (id),
      CONSTRAINT fk_delete_requests_uid FOREIGN KEY (uid) REFERENCES user_profiles(uid) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
    await queryRunner.query("CREATE INDEX IF NOT EXISTS idx_delete_requests_uid ON user_account_delete_requests(uid)");
    await queryRunner.query("CREATE INDEX IF NOT EXISTS idx_delete_requests_uid_status ON user_account_delete_requests(uid,status)");
    await queryRunner.query("CREATE INDEX IF NOT EXISTS idx_delete_requests_requestedAt ON user_account_delete_requests(requestedAt)");

    await queryRunner.query("ALTER TABLE stores ADD COLUMN IF NOT EXISTS name varchar(120) NULL");
    await queryRunner.query("ALTER TABLE stores ADD COLUMN IF NOT EXISTS disabledReason varchar(300) NULL");
    await queryRunner.query("ALTER TABLE stores ADD COLUMN IF NOT EXISTS disabledAt datetime NULL");
    await queryRunner.query("ALTER TABLE stores ADD COLUMN IF NOT EXISTS disabledByUid varchar(128) NULL");
    await queryRunner.query("ALTER TABLE stores ADD COLUMN IF NOT EXISTS createdAt datetime NOT NULL DEFAULT CURRENT_TIMESTAMP");
    await queryRunner.query("ALTER TABLE stores ADD COLUMN IF NOT EXISTS updatedAt datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP");

    await queryRunner.query(`CREATE TABLE IF NOT EXISTS store_settings (
      storeId varchar(64) NOT NULL,
      currency varchar(8) NOT NULL DEFAULT 'USD',
      taxMode varchar(24) NOT NULL DEFAULT 'exclusive',
      supportWhatsApp varchar(32) NULL,
      supportEmail varchar(255) NULL,
      pickupEnabled tinyint(1) NOT NULL DEFAULT 1,
      deliveryEnabled tinyint(1) NOT NULL DEFAULT 1,
      updatedAt datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (storeId),
      CONSTRAINT fk_store_settings_store FOREIGN KEY (storeId) REFERENCES stores(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

    await queryRunner.query(`CREATE TABLE IF NOT EXISTS user_store_context (
      uid varchar(128) NOT NULL,
      storeId varchar(64) NOT NULL,
      updatedAt datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (uid),
      CONSTRAINT fk_user_store_context_store FOREIGN KEY (storeId) REFERENCES stores(id) ON DELETE RESTRICT
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
    await queryRunner.query("CREATE INDEX IF NOT EXISTS idx_user_store_context_storeId ON user_store_context(storeId)");
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS user_store_context');
    await queryRunner.query('DROP TABLE IF EXISTS store_settings');
    await queryRunner.query('DROP TABLE IF EXISTS user_account_delete_requests');
    await queryRunner.query('DROP TABLE IF EXISTS user_addresses');
  }
}
