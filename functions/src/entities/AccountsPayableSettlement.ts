import { Column, CreateDateColumn, Entity, PrimaryColumn } from 'typeorm';

@Entity({ name: 'accounts_payable_settlements' })
export class AccountsPayableSettlement {
  @PrimaryColumn('char', { length: 36 }) id!: string;
  @Column({ type: 'varchar', length: 64 }) storeId!: string;
  @Column({ type: 'char', length: 36 }) payableDocumentId!: string;
  @Column({ type: 'date' }) settlementDate!: string;
  @Column({ type: 'bigint' }) amountCents!: string;
  @Column({ type: 'varchar', length: 24 }) method!: string;
  @Column({ type: 'char', length: 36, nullable: true }) financialAccountId!: string | null;
  @Column({ type: 'char', length: 36, nullable: true }) journalEntryId!: string | null;
  @Column({ type: 'varchar', length: 64, nullable: true }) sourceReference!: string | null;
  @Column({ type: 'varchar', length: 64, nullable: true }) createdByUid!: string | null;
  @CreateDateColumn({ type: 'datetime' }) createdAt!: Date;
}
