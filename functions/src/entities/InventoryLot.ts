import { Column, CreateDateColumn, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

@Entity({ name: 'inventory_lots' })
export class InventoryLot {
  @PrimaryColumn('char', { length: 36 }) id!: string;
  @Column({ type: 'varchar', length: 64 }) storeId!: string;
  @Column({ type: 'char', length: 36 }) variantId!: string;
  @Column({ type: 'char', length: 36 }) warehouseId!: string;
  @Column({ type: 'char', length: 36, nullable: true }) goodsReceiptItemId!: string | null;
  @Column({ type: 'varchar', length: 80 }) lotNumber!: string;
  @Column({ type: 'date', nullable: true }) expiryDate!: string | null;
  @Column({ type: 'decimal', precision: 12, scale: 3, default: 0 }) receivedQty!: string;
  @Column({ type: 'decimal', precision: 12, scale: 3, default: 0 }) remainingQty!: string;
  @Column({ type: 'bigint', nullable: true }) unitCostCents!: string | null;
  @CreateDateColumn({ type: 'datetime' }) createdAt!: Date;
  @UpdateDateColumn({ type: 'datetime' }) updatedAt!: Date;
}
