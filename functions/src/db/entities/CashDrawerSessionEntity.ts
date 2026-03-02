import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity({ name: 'cash_drawer_sessions' })
@Index('IDX_cash_drawer_sessions_drawer', ['drawerId'])
export class CashDrawerSessionEntity {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ type: 'char', length: 36 }) drawerId!: string;
  @Column({ type: 'char', length: 36 }) openedByEmployeeId!: string;
  @Column({ type: 'datetime' }) openedAt!: Date;
  @Column({ type: 'decimal', precision: 12, scale: 2 }) openingCash!: string;
  @Column({ type: 'datetime', nullable: true }) closedAt!: Date | null;
  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true }) closingCashCounted!: string | null;
  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true }) variance!: string | null;
  @Column({ type: 'enum', enum: ['open', 'closed'], default: 'open' }) status!: 'open'|'closed';
  @CreateDateColumn() createdAt!: Date;
  @UpdateDateColumn() updatedAt!: Date;
}
