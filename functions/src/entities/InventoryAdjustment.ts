import { Column, CreateDateColumn, Entity, PrimaryColumn } from 'typeorm';

@Entity({ name: 'inventory_adjustments' })
export class InventoryAdjustment {
  @PrimaryColumn('char', { length: 36 }) id!: string;
  @Column({ type: 'char', length: 36 }) variantId!: string;
  @Column({ type: 'int' }) deltaQty!: number;
  @Column({ type: 'varchar', length: 250, nullable: true }) reason!: string | null;
  @Column({ type: 'varchar', length: 128 }) performedByUid!: string;
  @CreateDateColumn({ type: 'datetime' }) createdAt!: Date;
}
