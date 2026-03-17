import { Column, CreateDateColumn, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

@Entity({ name: 'delivery_action_requests' })
export class DeliveryActionRequest {
  @PrimaryColumn('char', { length: 36 })
  id!: string;

  @Column({ type: 'varchar', length: 24 })
  gateway!: string;

  @Column({ type: 'varchar', length: 128 })
  actorId!: string;

  @Column({ type: 'varchar', length: 64 })
  actionName!: string;

  @Column({ type: 'varchar', length: 120 })
  idempotencyKey!: string;

  @Column({ type: 'varchar', length: 80 })
  requestHash!: string;

  @Column({ type: 'char', length: 36, nullable: true })
  orderId!: string | null;

  @Column({ type: 'varchar', length: 24, default: 'pending' })
  status!: string;

  @Column({ type: 'json', nullable: true })
  responseJson!: Record<string, unknown> | null;

  @CreateDateColumn({ type: 'datetime' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'datetime' })
  updatedAt!: Date;
}
