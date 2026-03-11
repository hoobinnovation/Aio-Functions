import { Column, CreateDateColumn, Entity, PrimaryColumn } from 'typeorm';

@Entity({ name: 'financial_audit_logs' })
export class FinancialAuditLog {
  @PrimaryColumn('char', { length: 36 }) id!: string;
  @Column({ type: 'varchar', length: 64 }) storeId!: string;
  @Column({ type: 'varchar', length: 48 }) entityType!: string;
  @Column({ type: 'varchar', length: 80 }) entityId!: string;
  @Column({ type: 'varchar', length: 48 }) action!: string;
  @Column({ type: 'varchar', length: 64, nullable: true }) actorUid!: string | null;
  @Column({ type: 'json', nullable: true }) payload!: Record<string, unknown> | null;
  @CreateDateColumn({ type: 'datetime' }) createdAt!: Date;
}
