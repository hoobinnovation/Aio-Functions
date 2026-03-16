import { Column, CreateDateColumn, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

export type AccountingPeriodStatus = 'open' | 'closed';

@Entity({ name: 'accounting_periods' })
export class AccountingPeriod {
  @PrimaryColumn('char', { length: 36 }) id!: string;
  @Column({ type: 'varchar', length: 64, nullable: true }) storeId!: string | null;
  @Column({ type: 'int' }) fiscalYear!: number;
  @Column({ type: 'varchar', length: 24 }) periodCode!: string;
  @Column({ type: 'date' }) startDate!: string;
  @Column({ type: 'date' }) endDate!: string;
  @Column({ type: 'varchar', length: 16, default: 'open' }) status!: AccountingPeriodStatus;
  @Column({ type: 'datetime', nullable: true }) closedAt!: Date | null;
  @Column({ type: 'varchar', length: 64, nullable: true }) closedByUid!: string | null;
  @CreateDateColumn({ type: 'datetime' }) createdAt!: Date;
  @UpdateDateColumn({ type: 'datetime' }) updatedAt!: Date;
}
