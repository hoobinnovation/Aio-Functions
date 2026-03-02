import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'order_status_history' })
@Index('IDX_order_status_history_order', ['orderId'])
export class OrderStatusHistoryEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'char', length: 36 })
  orderId!: string;

  @Column({ type: 'varchar', length: 30, nullable: true })
  fromStatus!: string | null;

  @Column({ type: 'varchar', length: 30 })
  toStatus!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  note!: string | null;

  @Column({ type: 'enum', enum: ['user', 'admin', 'system'] })
  actorType!: 'user' | 'admin' | 'system';

  @Column({ type: 'varchar', length: 128 })
  actorUid!: string;

  @CreateDateColumn()
  createdAt!: Date;
}
