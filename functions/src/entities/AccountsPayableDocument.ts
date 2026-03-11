import { Column, CreateDateColumn, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';
import { ApprovalState } from './AccountsReceivableDocument';

export type AccountsPayableStatus = 'open' | 'partially_settled' | 'settled' | 'cancelled' | 'writeoff';

@Entity({ name: 'accounts_payable_documents' })
export class AccountsPayableDocument {
  @PrimaryColumn('char', { length: 36 }) id!: string;
  @Column({ type: 'varchar', length: 64 }) storeId!: string;
  @Column({ type: 'char', length: 36 }) supplierId!: string;
  @Column({ type: 'varchar', length: 48 }) sourceDocumentType!: string;
  @Column({ type: 'varchar', length: 80 }) sourceDocumentId!: string;
  @Column({ type: 'varchar', length: 32, unique: true }) documentNo!: string;
  @Column({ type: 'date' }) issueDate!: string;
  @Column({ type: 'date' }) dueDate!: string;
  @Column({ type: 'bigint' }) totalCents!: string;
  @Column({ type: 'bigint', default: 0 }) settledCents!: string;
  @Column({ type: 'bigint' }) outstandingCents!: string;
  @Column({ type: 'varchar', length: 24, default: 'open' }) status!: AccountsPayableStatus;
  @Column({ type: 'varchar', length: 24, default: 'approved' }) approvalState!: ApprovalState;
  @Column({ type: 'char', length: 36, nullable: true }) accountingAccountId!: string | null;
  @Column({ type: 'char', length: 36, nullable: true }) journalEntryId!: string | null;
  @Column({ type: 'varchar', length: 64, nullable: true }) createdByUid!: string | null;
  @CreateDateColumn({ type: 'datetime' }) createdAt!: Date;
  @UpdateDateColumn({ type: 'datetime' }) updatedAt!: Date;
}
