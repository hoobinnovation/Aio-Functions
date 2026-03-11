import { Column, CreateDateColumn, Entity, PrimaryColumn } from 'typeorm';

@Entity({ name: 'reconciliation_matches' })
export class ReconciliationMatch {
  @PrimaryColumn('char', { length: 36 }) id!: string;
  @Column({ type: 'char', length: 36 }) reconciliationTransactionId!: string;
  @Column({ type: 'varchar', length: 48 }) targetType!: string;
  @Column({ type: 'varchar', length: 80 }) targetId!: string;
  @Column({ type: 'bigint' }) matchedCents!: string;
  @Column({ type: 'char', length: 36, nullable: true }) journalEntryId!: string | null;
  @Column({ type: 'varchar', length: 64, nullable: true }) createdByUid!: string | null;
  @CreateDateColumn({ type: 'datetime' }) createdAt!: Date;
}
