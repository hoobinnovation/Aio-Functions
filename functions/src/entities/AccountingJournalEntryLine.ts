import { Column, CreateDateColumn, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

@Entity({ name: 'accounting_journal_entry_lines' })
export class AccountingJournalEntryLine {
  @PrimaryColumn('char', { length: 36 }) id!: string;
  @Column({ type: 'char', length: 36 }) entryId!: string;
  @Column({ type: 'char', length: 36 }) accountId!: string;
  @Column({ type: 'int' }) lineNo!: number;
  @Column({ type: 'varchar', length: 255, nullable: true }) description!: string | null;
  @Column({ type: 'bigint', default: 0 }) debitCents!: string;
  @Column({ type: 'bigint', default: 0 }) creditCents!: string;
  @Column({ type: 'varchar', length: 8, default: 'EGP' }) currencyCode!: string;
  @Column({ type: 'char', length: 36, nullable: true }) branchId!: string | null;
  @CreateDateColumn({ type: 'datetime' }) createdAt!: Date;
  @UpdateDateColumn({ type: 'datetime' }) updatedAt!: Date;
}
