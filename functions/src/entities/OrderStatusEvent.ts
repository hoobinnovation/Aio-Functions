import { Column, CreateDateColumn, Entity, PrimaryColumn } from 'typeorm';
@Entity({ name: 'order_status_events' })
export class OrderStatusEvent {
  @PrimaryColumn('char', { length: 36 }) id!: string;
  @Column({ type: 'char', length: 36 }) orderId!: string;
  @Column({ type: 'varchar', length: 24 }) status!: string;
  @Column({ type: 'varchar', length: 500, nullable: true }) note!: string | null;
  @Column({ type: 'varchar', length: 128 }) createdByUid!: string;
  @CreateDateColumn({ type: 'datetime' }) createdAt!: Date;
}
