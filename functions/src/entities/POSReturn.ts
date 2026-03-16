import { Column, CreateDateColumn, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

@Entity({ name: 'pos_returns' })
export class POSReturn {
  @PrimaryColumn('char', { length: 36 }) id!: string;
  @Column({ type: 'varchar', length: 64 }) storeId!: string;
  @Column({ type: 'char', length: 36 }) posSaleId!: string;
  @Column({ type: 'char', length: 36, nullable: true }) posSessionId!: string | null;
  @Column({ type: 'char', length: 36, nullable: true }) drawerSessionId!: string | null;
  @Column({ type: 'char', length: 36, nullable: true }) employeeId!: string | null;
  @Column({ type: 'varchar', length: 24, default: 'completed' }) status!: string;
  @Column({ type: 'bigint', default: 0 }) totalRefundCents!: string;
  @Column({ type: 'varchar', length: 255, nullable: true }) note!: string | null;
  @Column({ type: 'varchar', length: 64, nullable: true }) createdByUid!: string | null;
  @CreateDateColumn({ type: 'datetime' }) createdAt!: Date;
  @UpdateDateColumn({ type: 'datetime' }) updatedAt!: Date;
}
