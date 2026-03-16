import { Column, CreateDateColumn, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

export type POSSessionStatus = 'open' | 'closed';

@Entity({ name: 'pos_sessions' })
export class POSSession {
  @PrimaryColumn('char', { length: 36 }) id!: string;
  @Column({ type: 'varchar', length: 64 }) storeId!: string;
  @Column({ type: 'char', length: 36, nullable: true }) branchId!: string | null;
  @Column({ type: 'char', length: 36, nullable: true }) deviceId!: string | null;
  @Column({ type: 'char', length: 36, nullable: true }) employeeId!: string | null;
  @Column({ type: 'char', length: 36, nullable: true }) drawerSessionId!: string | null;
  @Column({ type: 'varchar', length: 24, default: 'open' }) status!: POSSessionStatus;
  @Column({ type: 'bigint', default: 0 }) openingFloatCents!: string;
  @Column({ type: 'bigint', default: 0 }) expectedCashCents!: string;
  @Column({ type: 'bigint', nullable: true }) actualCashCents!: string | null;
  @Column({ type: 'bigint', nullable: true }) varianceCents!: string | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) note!: string | null;
  @Column({ type: 'varchar', length: 64, nullable: true }) openedByUid!: string | null;
  @Column({ type: 'varchar', length: 64, nullable: true }) closedByUid!: string | null;
  @Column({ type: 'datetime', nullable: true }) closedAt!: Date | null;
  @CreateDateColumn({ type: 'datetime' }) createdAt!: Date;
  @UpdateDateColumn({ type: 'datetime' }) updatedAt!: Date;
}
