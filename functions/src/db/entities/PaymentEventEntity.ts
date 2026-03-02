import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'payment_events' })
@Index('IDX_payment_events_session', ['sessionId'])
export class PaymentEventEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'char', length: 36 })
  sessionId!: string;

  @Column({ type: 'varchar', length: 100 })
  type!: string;

  @Column({ type: 'json' })
  payload!: Record<string, unknown>;

  @CreateDateColumn()
  createdAt!: Date;
}
