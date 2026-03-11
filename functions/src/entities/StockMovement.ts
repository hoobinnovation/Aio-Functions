import { Column, CreateDateColumn, Entity, PrimaryColumn } from 'typeorm';

export type StockMovementType = 'goods_receipt' | 'sale_issue' | 'return_in' | 'return_out' | 'adjustment' | 'transfer_out' | 'transfer_in' | 'reservation_hold' | 'reservation_release';

@Entity({ name: 'stock_movements' })
export class StockMovement {
  @PrimaryColumn('char', { length: 36 }) id!: string;
  @Column({ type: 'varchar', length: 64 }) storeId!: string;
  @Column({ type: 'char', length: 36 }) variantId!: string;
  @Column({ type: 'char', length: 36, nullable: true }) warehouseId!: string | null;
  @Column({ type: 'char', length: 36, nullable: true }) warehouseLocationId!: string | null;
  @Column({ type: 'char', length: 36, nullable: true }) lotId!: string | null;
  @Column({ type: 'varchar', length: 32 }) movementType!: StockMovementType;
  @Column({ type: 'decimal', precision: 12, scale: 3 }) qtyDelta!: string;
  @Column({ type: 'decimal', precision: 12, scale: 3, nullable: true }) beforeQty!: string | null;
  @Column({ type: 'decimal', precision: 12, scale: 3, nullable: true }) afterQty!: string | null;
  @Column({ type: 'bigint', nullable: true }) unitCostCents!: string | null;
  @Column({ type: 'varchar', length: 48 }) sourceDocumentType!: string;
  @Column({ type: 'varchar', length: 80 }) sourceDocumentId!: string;
  @Column({ type: 'varchar', length: 64, nullable: true }) sourceEventType!: string | null;
  @Column({ type: 'json', nullable: true }) metadata!: Record<string, unknown> | null;
  @Column({ type: 'varchar', length: 64, nullable: true }) createdByUid!: string | null;
  @CreateDateColumn({ type: 'datetime' }) createdAt!: Date;
}
