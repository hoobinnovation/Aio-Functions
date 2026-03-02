import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity({ name: 'payment_sessions' })
@Index('IDX_payment_sessions_store', ['storeId'])
@Index('IDX_payment_sessions_uid', ['uid'])
export class PaymentSessionEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'char', length: 36 })
  storeId!: string;

  @Column({ type: 'varchar', length: 128 })
  uid!: string;

  @Column({ type: 'char', length: 36, nullable: true })
  orderId!: string | null;

  @Column({ type: 'varchar', length: 50 })
  provider!: string;

  @Column({ type: 'enum', enum: ['created', 'pending', 'success', 'failed', 'cancelled'] })
  status!: 'created' | 'pending' | 'success' | 'failed' | 'cancelled';

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount!: string;

  @Column({ type: 'varchar', length: 8 })
  currency!: string;

  @Column({ type: 'text' })
  paymentUrl!: string;

  @Column({ type: 'json', nullable: true })
  providerPayload!: Record<string, unknown> | null;

  @Column({ type: 'datetime', nullable: true })
  expiresAt!: Date | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
