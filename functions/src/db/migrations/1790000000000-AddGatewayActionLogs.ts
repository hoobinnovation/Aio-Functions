import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddGatewayActionLogs1790000000000 implements MigrationInterface {
  name = 'AddGatewayActionLogs1790000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE gateway_action_logs (
        id char(36) NOT NULL,
        gateway varchar(16) NOT NULL,
        action varchar(160) NOT NULL,
        storeId char(36) NULL,
        uid varchar(128) NULL,
        payload json NULL,
        createdAt datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        INDEX IDX_gateway_action_logs_store_action (storeId, action),
        PRIMARY KEY (id)
      ) ENGINE=InnoDB;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS gateway_action_logs;`);
  }
}
