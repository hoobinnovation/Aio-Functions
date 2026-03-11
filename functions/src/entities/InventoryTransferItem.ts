import { Column, CreateDateColumn, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

@Entity({ name: 'inventory_transfer_items' })
export class InventoryTransferItem {
  @PrimaryColumn('char', { length: 36 }) id!: string;
  @Column({ type: 'char', length: 36 }) transferId!: string;
  @Column({ type: 'char', length: 36 }) variantId!: string;
  @Column({ type: 'decimal', precision: 12, scale: 3 }) qty!: string;
  @CreateDateColumn({ type: 'datetime' }) createdAt!: Date;
  @UpdateDateColumn({ type: 'datetime' }) updatedAt!: Date;
}
