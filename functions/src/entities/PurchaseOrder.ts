import { Column, CreateDateColumn, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

export type PurchaseOrderStatus = 'draft' | 'submitted' | 'approved' | 'partially_received' | 'received' | 'cancelled';

@Entity({ name: 'purchase_orders' })
export class PurchaseOrder {
  @PrimaryColumn('char', { length: 36 }) id!: string;
  @Column({ type: 'varchar', length: 64 }) storeId!: string;
  @Column({ type: 'char', length: 36 }) supplierId!: string;
  @Column({ type: 'char', length: 36, nullable: true }) warehouseId!: string | null;
  @Column({ type: 'varchar', length: 40 }) poNumber!: string;
  @Column({ type: 'varchar', length: 24, default: 'draft' }) status!: PurchaseOrderStatus;
  @Column({ type: 'date', nullable: true }) expectedDate!: string | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) notes!: string | null;
  @Column({ type: 'bigint', default: 0 }) subtotalCents!: string;
  @Column({ type: 'bigint', default: 0 }) totalCents!: string;
  @Column({ type: 'varchar', length: 64, nullable: true }) createdByUid!: string | null;
  @CreateDateColumn({ type: 'datetime' }) createdAt!: Date;
  @UpdateDateColumn({ type: 'datetime' }) updatedAt!: Date;
}
