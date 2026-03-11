import { Column, CreateDateColumn, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

@Entity({ name: 'reconciliation_transactions' })
export class ReconciliationTransaction {
  @PrimaryColumn('char', { length: 36 }) id!: string;
  @Column({ type: 'char', length: 36 }) reconciliationSessionId!: string;
  @Column({ type: 'varchar', length: 64 }) storeId!: string;
  @Column({ type: 'char', length: 36 }) financialAccountId!: string;
  @Column({ type: 'date' }) transactionDate!: string;
  @Column({ type: 'varchar', length: 32 }) direction!: 'debit' | 'credit';
  @Column({ type: 'bigint' }) amountCents!: string;
  @Column({ type: 'varchar', length: 80, nullable: true }) externalRef!: string | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) description!: string | null;
  @Column({ type: 'varchar', length: 24, default: 'unmatched' }) matchState!: 'unmatched' | 'partial' | 'matched' | 'exception';
  @Column({ type: 'bigint', default: 0 }) matchedCents!: string;
  @Column({ type: 'bigint', default: 0 }) varianceCents!: string;
  @CreateDateColumn({ type: 'datetime' }) createdAt!: Date;
  @UpdateDateColumn({ type: 'datetime' }) updatedAt!: Date;
}
