import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'order_tracking_events' })
@Index('IDX_order_tracking_events_order_created', ['orderId', 'createdAt'])
export class OrderTrackingEventEntity {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ type: 'char', length: 36 }) storeId!: string;
  @Column({ type: 'char', length: 36 }) orderId!: string;
  @Column({ type: 'enum', enum: ['status', 'note', 'system'] }) type!: 'status' | 'note' | 'system';
  @Column({ type: 'varchar', length: 30, nullable: true }) status!: string | null;
  @Column({ type: 'varchar', length: 500 }) message!: string;
  @Column({ type: 'tinyint', default: false }) isDeleted!: boolean;
  @CreateDateColumn() createdAt!: Date;
}
