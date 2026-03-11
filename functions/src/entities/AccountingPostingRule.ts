import { Column, CreateDateColumn, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

@Entity({ name: 'accounting_posting_rules' })
export class AccountingPostingRule {
  @PrimaryColumn('char', { length: 36 }) id!: string;
  @Column({ type: 'varchar', length: 64, nullable: true }) storeId!: string | null;
  @Column({ type: 'varchar', length: 80 }) ruleKey!: string;
  @Column({ type: 'varchar', length: 48 }) documentType!: string;
  @Column({ type: 'varchar', length: 64 }) eventKey!: string;
  @Column({ type: 'int', default: 100 }) priority!: number;
  @Column({ type: 'tinyint', width: 1, default: 1 }) isActive!: boolean;
  @Column({ type: 'json', nullable: true }) configJson!: Record<string, unknown> | null;
  @CreateDateColumn({ type: 'datetime' }) createdAt!: Date;
  @UpdateDateColumn({ type: 'datetime' }) updatedAt!: Date;
}
