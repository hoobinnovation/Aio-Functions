import { Column, CreateDateColumn, Entity, PrimaryColumn } from 'typeorm';
@Entity({ name: 'payment_sessions' })
export class PaymentSession {
  @PrimaryColumn('char', { length: 36 }) id!: string;
  @Column({ type: 'char', length: 36 }) orderId!: string;
  @Column({ type: 'varchar', length: 40 }) provider!: string;
  @Column({ type: 'varchar', length: 120 }) providerSessionId!: string;
  @Column({ type: 'varchar', length: 24 }) status!: string;
  @CreateDateColumn({ type: 'datetime' }) createdAt!: Date;
}
