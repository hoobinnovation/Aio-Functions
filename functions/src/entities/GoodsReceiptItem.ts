import { Column, CreateDateColumn, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

@Entity({ name: 'goods_receipt_items' })
export class GoodsReceiptItem {
  @PrimaryColumn('char', { length: 36 }) id!: string;
  @Column({ type: 'char', length: 36 }) goodsReceiptId!: string;
  @Column({ type: 'char', length: 36, nullable: true }) purchaseOrderItemId!: string | null;
  @Column({ type: 'char', length: 36 }) variantId!: string;
  @Column({ type: 'decimal', precision: 12, scale: 3 }) receivedQty!: string;
  @Column({ type: 'bigint' }) unitCostCents!: string;
  @Column({ type: 'date', nullable: true }) expiryDate!: string | null;
  @Column({ type: 'varchar', length: 80, nullable: true }) lotNumber!: string | null;
  @CreateDateColumn({ type: 'datetime' }) createdAt!: Date;
  @UpdateDateColumn({ type: 'datetime' }) updatedAt!: Date;
}
