import { Column, CreateDateColumn, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

export type POSSaleStatus = 'draft' | 'completed' | 'cancelled' | 'returned';

@Entity({ name: 'pos_sales' })
export class POSSale {
  @PrimaryColumn('char', { length: 36 }) id!: string;
  @Column({ type: 'varchar', length: 64 }) storeId!: string;
  @Column({ type: 'char', length: 36, nullable: true }) branchId!: string | null;
  @Column({ type: 'char', length: 36, nullable: true }) deviceId!: string | null;
  @Column({ type: 'char', length: 36, nullable: true }) employeeId!: string | null;
  @Column({ type: 'char', length: 36, nullable: true }) posSessionId!: string | null;
  @Column({ type: 'char', length: 36, nullable: true }) drawerSessionId!: string | null;
  @Column({ type: 'varchar', length: 128, nullable: true }) customerUid!: string | null;
  @Column({ type: 'varchar', length: 24, default: 'draft' }) status!: POSSaleStatus;
  @Column({ type: 'bigint', default: 0 }) subtotalCents!: string;
  @Column({ type: 'bigint', default: 0 }) discountCents!: string;
  @Column({ type: 'bigint', default: 0 }) taxCents!: string;
  @Column({ type: 'bigint', default: 0 }) totalCents!: string;
  @Column({ type: 'varchar', length: 255, nullable: true }) note!: string | null;
  @Column({ type: 'varchar', length: 64, nullable: true }) externalRef!: string | null;
  @Column({ type: 'varchar', length: 64, nullable: true }) createdByUid!: string | null;
  @CreateDateColumn({ type: 'datetime' }) createdAt!: Date;
  @UpdateDateColumn({ type: 'datetime' }) updatedAt!: Date;
}
