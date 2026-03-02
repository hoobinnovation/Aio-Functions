import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'accounting_entries' })
@Index('IDX_accounting_entries_store_created', ['storeId', 'createdAt'])
@Index('IDX_accounting_entries_branch', ['branchId'])
@Index('IDX_accounting_entries_employee', ['employeeId'])
@Index('IDX_accounting_entries_device', ['deviceId'])
@Index('IDX_accounting_entries_channel', ['sourceChannel'])
export class AccountingEntryEntity {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ type: 'char', length: 36 }) storeId!: string;
  @Column({ type: 'enum', enum: ['revenue', 'expense', 'adjustment'] }) type!: 'revenue'|'expense'|'adjustment';
  @Column({ type: 'decimal', precision: 12, scale: 2 }) amount!: string;
  @Column({ type: 'varchar', length: 8, default: 'EGP' }) currency!: string;
  @Column({ type: 'enum', enum: ['app', 'web', 'pos', 'branch'] }) sourceChannel!: 'app'|'web'|'pos'|'branch';
  @Column({ type: 'enum', enum: ['cash', 'card', 'online', 'wallet'] }) paymentMethod!: 'cash'|'card'|'online'|'wallet';
  @Column({ type: 'char', length: 36, nullable: true }) branchId!: string | null;
  @Column({ type: 'char', length: 36, nullable: true }) deviceId!: string | null;
  @Column({ type: 'char', length: 36, nullable: true }) employeeId!: string | null;
  @Column({ type: 'char', length: 36, nullable: true }) drawerSessionId!: string | null;
  @Column({ type: 'varchar', length: 120, nullable: true }) category!: string | null;
  @Column({ type: 'varchar', length: 60, nullable: true }) refType!: string | null;
  @Column({ type: 'varchar', length: 64, nullable: true }) refId!: string | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) note!: string | null;
  @CreateDateColumn() createdAt!: Date;
}
