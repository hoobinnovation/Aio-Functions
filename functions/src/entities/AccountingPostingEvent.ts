import { Column, CreateDateColumn, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

export type AccountingPostingEventStatus = 'pending' | 'posted' | 'failed';

@Entity({ name: 'accounting_posting_events' })
export class AccountingPostingEvent {
  @PrimaryColumn('char', { length: 36 }) id!: string;
  @Column({ type: 'varchar', length: 64, nullable: true }) storeId!: string | null;
  @Column({ type: 'varchar', length: 48 }) sourceDocumentType!: string;
  @Column({ type: 'varchar', length: 80 }) sourceDocumentId!: string;
  @Column({ type: 'varchar', length: 64 }) sourceEventType!: string;
  @Column({ type: 'varchar', length: 16, default: 'pending' }) status!: AccountingPostingEventStatus;
  @Column({ type: 'char', length: 36, nullable: true }) journalEntryId!: string | null;
  @Column({ type: 'varchar', length: 64, nullable: true }) errorCode!: string | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) errorMessage!: string | null;
  @Column({ type: 'json', nullable: true }) metadata!: Record<string, unknown> | null;
  @Column({ type: 'varchar', length: 64, nullable: true }) createdByUid!: string | null;
  @Column({ type: 'datetime', nullable: true }) postedAt!: Date | null;
  @CreateDateColumn({ type: 'datetime' }) createdAt!: Date;
  @UpdateDateColumn({ type: 'datetime' }) updatedAt!: Date;
}
