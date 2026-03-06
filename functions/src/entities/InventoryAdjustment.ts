import { Column, CreateDateColumn, Entity, Index, PrimaryColumn } from 'typeorm';

@Entity({ name: 'inventory_adjustments' })
@Index('idx_inventory_adjustments_variant', ['variantId', 'createdAt'])
@Index('idx_inventory_adjustments_store_product', ['storeId', 'productId', 'createdAt'])
export class InventoryAdjustment {
  @PrimaryColumn('char', { length: 36 }) id!: string;

  @Column({ type: 'char', length: 36, nullable: true }) variantId!: string | null;
  @Column({ type: 'varchar', length: 64, nullable: true }) storeId!: string | null;
  @Column({ type: 'char', length: 36, nullable: true }) productId!: string | null;

  @Column({ type: 'decimal', precision: 12, scale: 3 }) deltaQty!: string;
  @Column({ type: 'decimal', precision: 12, scale: 3, nullable: true }) beforeQty!: string | null;
  @Column({ type: 'decimal', precision: 12, scale: 3, nullable: true }) afterQty!: string | null;

  @Column({ type: 'varchar', length: 250, nullable: true }) reason!: string | null;
  @Column({ type: 'int', nullable: true }) importBatchId!: number | null;

  @Column({ type: 'varchar', length: 128, nullable: true }) performedByUid!: string | null;
  @Column({ type: 'varchar', length: 128, nullable: true }) createdByAdminUid!: string | null;

  @CreateDateColumn({ type: 'datetime' }) createdAt!: Date;
}
