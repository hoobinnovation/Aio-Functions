import { Column, CreateDateColumn, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

@Entity({ name: 'purchase_order_items' })
export class PurchaseOrderItem {
  @PrimaryColumn('char', { length: 36 }) id!: string;
  @Column({ type: 'char', length: 36 }) purchaseOrderId!: string;
  @Column({ type: 'char', length: 36 }) variantId!: string;
  @Column({ type: 'decimal', precision: 12, scale: 3 }) orderedQty!: string;
  @Column({ type: 'decimal', precision: 12, scale: 3, default: 0 }) receivedQty!: string;
  @Column({ type: 'bigint' }) unitCostCents!: string;
  @Column({ type: 'bigint' }) lineTotalCents!: string;
  @Column({ type: 'varchar', length: 140, nullable: true }) note!: string | null;
  @CreateDateColumn({ type: 'datetime' }) createdAt!: Date;
  @UpdateDateColumn({ type: 'datetime' }) updatedAt!: Date;
}
