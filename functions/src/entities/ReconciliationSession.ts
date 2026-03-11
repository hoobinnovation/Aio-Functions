import { Column, CreateDateColumn, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

@Entity({ name: 'reconciliation_sessions' })
export class ReconciliationSession {
  @PrimaryColumn('char', { length: 36 }) id!: string;
  @Column({ type: 'varchar', length: 64 }) storeId!: string;
  @Column({ type: 'char', length: 36 }) financialAccountId!: string;
  @Column({ type: 'date' }) statementFromDate!: string;
  @Column({ type: 'date' }) statementToDate!: string;
  @Column({ type: 'varchar', length: 24, default: 'open' }) status!: 'open' | 'matched' | 'closed';
  @Column({ type: 'bigint', default: 0 }) bookBalanceCents!: string;
  @Column({ type: 'bigint', default: 0 }) statementBalanceCents!: string;
  @Column({ type: 'bigint', default: 0 }) varianceCents!: string;
  @Column({ type: 'varchar', length: 64, nullable: true }) closedByUid!: string | null;
  @Column({ type: 'datetime', nullable: true }) closedAt!: Date | null;
  @CreateDateColumn({ type: 'datetime' }) createdAt!: Date;
  @UpdateDateColumn({ type: 'datetime' }) updatedAt!: Date;
}
