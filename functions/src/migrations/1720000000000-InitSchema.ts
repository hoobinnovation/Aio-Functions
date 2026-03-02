import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitSchema1720000000000 implements MigrationInterface {
  name = 'InitSchema1720000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      "CREATE TABLE stores (id varchar(64) NOT NULL, status varchar(32) NOT NULL DEFAULT 'active', PRIMARY KEY (id)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4",
    );
    await queryRunner.query('CREATE INDEX IDX_stores_status ON stores (status)');

    await queryRunner.query(
      'CREATE TABLE admin_users (uid varchar(128) NOT NULL, status varchar(32) NOT NULL, PRIMARY KEY (uid)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4',
    );
    await queryRunner.query(
      'CREATE TABLE admin_roles (id int NOT NULL AUTO_INCREMENT, adminUid varchar(128) NOT NULL, role varchar(64) NOT NULL, PRIMARY KEY (id)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4',
    );
    await queryRunner.query(
      'CREATE INDEX IDX_admin_roles_admin_role ON admin_roles (adminUid, role)',
    );

    await queryRunner.query(
      'CREATE TABLE admin_store_access (id int NOT NULL AUTO_INCREMENT, adminUid varchar(128) NOT NULL, storeId varchar(64) NOT NULL, PRIMARY KEY (id)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4',
    );
    await queryRunner.query(
      'CREATE INDEX IDX_admin_store_access_admin_store ON admin_store_access (adminUid, storeId)',
    );

    await queryRunner.query(
      "CREATE TABLE user_profiles (uid varchar(128) NOT NULL, status varchar(24) NOT NULL DEFAULT 'active', createdAt datetime NOT NULL DEFAULT CURRENT_TIMESTAMP, updatedAt datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP, PRIMARY KEY (uid)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4",
    );
    await queryRunner.query(
      'CREATE INDEX IDX_user_profiles_status ON user_profiles (status)',
    );

    await queryRunner.query(`CREATE TABLE media_assets (
      id char(36) NOT NULL,
      storeId varchar(64) NULL,
      ownerType varchar(64) NOT NULL,
      ownerId varchar(128) NOT NULL,
      kind enum('image','document') NOT NULL,
      originalPath varchar(1024) NOT NULL,
      thumbnailPath varchar(1024) NULL,
      contentType varchar(255) NOT NULL,
      sizeBytes bigint NOT NULL,
      status enum('created','uploaded','processing','ready','failed') NOT NULL,
      createdByUid varchar(128) NOT NULL,
      createdAt datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY UQ_media_assets_originalPath (originalPath)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
    await queryRunner.query(
      'CREATE INDEX IDX_media_assets_store_owner ON media_assets (storeId, ownerType, ownerId)',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX IDX_media_assets_store_owner ON media_assets');
    await queryRunner.query('DROP TABLE media_assets');
    await queryRunner.query('DROP INDEX IDX_user_profiles_status ON user_profiles');
    await queryRunner.query('DROP TABLE user_profiles');
    await queryRunner.query('DROP INDEX IDX_admin_store_access_admin_store ON admin_store_access');
    await queryRunner.query('DROP TABLE admin_store_access');
    await queryRunner.query('DROP INDEX IDX_admin_roles_admin_role ON admin_roles');
    await queryRunner.query('DROP TABLE admin_roles');
    await queryRunner.query('DROP TABLE admin_users');
    await queryRunner.query('DROP INDEX IDX_stores_status ON stores');
    await queryRunner.query('DROP TABLE stores');
  }
}
