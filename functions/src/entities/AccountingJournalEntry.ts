import { Column, CreateDateColumn, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

export type AccountingJournalEntryStatus = 'draft' | 'posted' | 'reversed';

@Entity({ name: 'accounting_journal_entries' })
export class AccountingJournalEntry {
  @PrimaryColumn('char', { length: 36 }) id!: string;
  @Column({ type: 'varchar', length: 64, nullable: true }) storeId!: string | null;
  @Column({ type: 'char', length: 36, nullable: true }) periodId!: string | null;
  @Column({ type: 'date' }) entryDate!: string;
  @Column({ type: 'varchar', length: 24, default: 'draft' }) status!: AccountingJournalEntryStatus;
  @Column({ type: 'varchar', length: 48, nullable: true }) documentType!: string | null;
  @Column({ type: 'varchar', length: 80, nullable: true }) documentId!: string | null;
  @Column({ type: 'json', nullable: true }) sourceContext!: Record<string, unknown> | null;
  @Column({ type: 'text', nullable: true }) memo!: string | null;
  @Column({ type: 'datetime', nullable: true }) postedAt!: Date | null;
  @Column({ type: 'varchar', length: 64, nullable: true }) postedByUid!: string | null;
  @Column({ type: 'datetime', nullable: true }) reversedAt!: Date | null;
  @Column({ type: 'varchar', length: 64, nullable: true }) reversedByUid!: string | null;
  @Column({ type: 'char', length: 36, nullable: true }) reversalOfEntryId!: string | null;
  @Column({ type: 'varchar', length: 64, nullable: true }) createdByUid!: string | null;
  @CreateDateColumn({ type: 'datetime' }) createdAt!: Date;
  @UpdateDateColumn({ type: 'datetime' }) updatedAt!: Date;
}
