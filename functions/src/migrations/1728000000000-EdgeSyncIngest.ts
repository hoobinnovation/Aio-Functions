import { MigrationInterface, QueryRunner } from 'typeorm';

export class EdgeSyncIngest1728000000000 implements MigrationInterface {
  name = 'EdgeSyncIngest1728000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE edge_nodes (
        hubId varchar(96) NOT NULL,
        storeId varchar(64) NOT NULL,
        status varchar(16) NOT NULL DEFAULT 'active',
        secretHash varchar(255) NOT NULL,
        createdAt datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (hubId)
      ) ENGINE=InnoDB
    `);
    await queryRunner.query(`CREATE INDEX idx_edge_nodes_store_status ON edge_nodes (storeId,status)`);

    await queryRunner.query(`
      CREATE TABLE edge_ingested_events (
        eventId varchar(128) NOT NULL,
        hubId varchar(96) NOT NULL,
        storeId varchar(64) NOT NULL,
        seq bigint NOT NULL,
        eventType varchar(48) NOT NULL,
        createdAt datetime NOT NULL,
        appliedAt datetime NOT NULL,
        PRIMARY KEY (eventId)
      ) ENGINE=InnoDB
    `);
    await queryRunner.query(`CREATE INDEX idx_edge_ingested_events_hub_seq ON edge_ingested_events (hubId,seq)`);
    await queryRunner.query(`CREATE INDEX idx_edge_ingested_events_store_applied ON edge_ingested_events (storeId,appliedAt)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX idx_edge_ingested_events_store_applied ON edge_ingested_events`);
    await queryRunner.query(`DROP INDEX idx_edge_ingested_events_hub_seq ON edge_ingested_events`);
    await queryRunner.query(`DROP TABLE edge_ingested_events`);

    await queryRunner.query(`DROP INDEX idx_edge_nodes_store_status ON edge_nodes`);
    await queryRunner.query(`DROP TABLE edge_nodes`);
  }
}
