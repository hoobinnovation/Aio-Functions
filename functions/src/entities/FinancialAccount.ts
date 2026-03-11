import { Column, CreateDateColumn, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

@Entity({ name: 'financial_accounts' })
export class FinancialAccount {
  @PrimaryColumn('char', { length: 36 }) id!: string;
  @Column({ type: 'varchar', length: 64 }) storeId!: string;
  @Column({ type: 'varchar', length: 24 }) type!: 'bank' | 'cash';
  @Column({ type: 'varchar', length: 32 }) code!: string;
  @Column({ type: 'varchar', length: 120 }) name!: string;
  @Column({ type: 'varchar', length: 48, nullable: true }) institutionName!: string | null;
  @Column({ type: 'varchar', length: 64, nullable: true }) accountNumberMasked!: string | null;
  @Column({ type: 'char', length: 36 }) accountingAccountId!: string;
  @Column({ type: 'tinyint', width: 1, default: 1 }) isActive!: boolean;
  @CreateDateColumn({ type: 'datetime' }) createdAt!: Date;
  @UpdateDateColumn({ type: 'datetime' }) updatedAt!: Date;
}
