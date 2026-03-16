import { MigrationInterface, QueryRunner } from 'typeorm';

export class PhonePasswordAuthFoundation1728700000000 implements MigrationInterface {
  name = 'PhonePasswordAuthFoundation1728700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE auth_phone_password_credentials (
      id char(36) PRIMARY KEY,
      uid varchar(128) NOT NULL,
      phoneNormalized varchar(32) NOT NULL,
      phoneDisplay varchar(32) NULL,
      passwordHash varchar(255) NOT NULL,
      passwordSalt varchar(64) NOT NULL,
      status varchar(24) NOT NULL DEFAULT 'active',
      createdAt datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uq_auth_phone_password_credentials_uid (uid),
      UNIQUE KEY uq_auth_phone_password_credentials_phone_normalized (phoneNormalized),
      KEY idx_auth_phone_password_credentials_status (status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE auth_phone_password_credentials');
  }
}
