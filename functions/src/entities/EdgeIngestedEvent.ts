import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity({ name: 'edge_ingested_events' })
export class EdgeIngestedEvent {
  @PrimaryColumn({ type: 'varchar', length: 128 })
  eventId!: string;

  @Column({ type: 'varchar', length: 96 })
  hubId!: string;

  @Column({ type: 'varchar', length: 64 })
  storeId!: string;

  @Column({ type: 'bigint' })
  seq!: string;

  @Column({ type: 'varchar', length: 48 })
  eventType!: string;

  @Column({ type: 'datetime' })
  createdAt!: Date;

  @Column({ type: 'datetime' })
  appliedAt!: Date;
}
