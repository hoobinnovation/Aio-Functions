import { Column, CreateDateColumn, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

export type AccountingAccountType = 'asset' | 'liability' | 'equity' | 'revenue' | 'expense' | 'cogs' | 'contra';
export type AccountingNormalSide = 'debit' | 'credit';

@Entity({ name: 'accounting_accounts' })
export class AccountingAccount {
  @PrimaryColumn('char', { length: 36 }) id!: string;
  @Column({ type: 'varchar', length: 64, nullable: true }) storeId!: string | null;
  @Column({ type: 'char', length: 36, nullable: true }) parentId!: string | null;
  @Column({ type: 'varchar', length: 40 }) code!: string;
  @Column({ type: 'varchar', length: 140 }) name!: string;
  @Column({ type: 'varchar', length: 24 }) type!: AccountingAccountType;
  @Column({ type: 'varchar', length: 16 }) normalSide!: AccountingNormalSide;
  @Column({ type: 'tinyint', width: 1, default: 1 }) isActive!: boolean;
  @Column({ type: 'tinyint', width: 1, default: 1 }) allowPosting!: boolean;
  @Column({ type: 'tinyint', width: 1, default: 0 }) isSystem!: boolean;
  @CreateDateColumn({ type: 'datetime' }) createdAt!: Date;
  @UpdateDateColumn({ type: 'datetime' }) updatedAt!: Date;
}
