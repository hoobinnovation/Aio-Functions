import { Column, CreateDateColumn, Entity, PrimaryColumn } from 'typeorm';

@Entity({ name: 'delivery_order_events' })
export class DeliveryOrderEvent {
  @PrimaryColumn('char', { length: 36 })
  id!: string;

  @Column({ type: 'char', length: 36 })
  orderId!: string;

  @Column({ type: 'varchar', length: 64 })
  storeId!: string;

  @Column({ type: 'char', length: 36, nullable: true })
  riderId!: string | null;

  @Column({ type: 'char', length: 36, nullable: true })
  tripId!: string | null;

  @Column({ type: 'varchar', length: 40 })
  type!: string;

  @Column({ type: 'varchar', length: 24 })
  actorType!: string;

  @Column({ type: 'varchar', length: 128, nullable: true })
  actorId!: string | null;

  @Column({ type: 'varchar', length: 24, nullable: true })
  statusBefore!: string | null;

  @Column({ type: 'varchar', length: 24, nullable: true })
  statusAfter!: string | null;

  @Column({ type: 'varchar', length: 300, nullable: true })
  reason!: string | null;

  @Column({ type: 'json', nullable: true })
  metadataJson!: Record<string, unknown> | null;

  @CreateDateColumn({ type: 'datetime' })
  createdAt!: Date;
}
