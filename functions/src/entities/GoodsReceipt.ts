import { Column, CreateDateColumn, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

@Entity({ name: 'goods_receipts' })
export class GoodsReceipt {
  @PrimaryColumn('char', { length: 36 }) id!: string;
  @Column({ type: 'varchar', length: 64 }) storeId!: string;
  @Column({ type: 'char', length: 36, nullable: true }) purchaseOrderId!: string | null;
  @Column({ type: 'char', length: 36 }) supplierId!: string;
  @Column({ type: 'char', length: 36 }) warehouseId!: string;
  @Column({ type: 'varchar', length: 40 }) receiptNumber!: string;
  @Column({ type: 'varchar', length: 24, default: 'posted' }) status!: string;
  @Column({ type: 'date' }) receivedDate!: string;
  @Column({ type: 'varchar', length: 255, nullable: true }) note!: string | null;
  @Column({ type: 'varchar', length: 64, nullable: true }) receivedByUid!: string | null;
  @CreateDateColumn({ type: 'datetime' }) createdAt!: Date;
  @UpdateDateColumn({ type: 'datetime' }) updatedAt!: Date;
}
