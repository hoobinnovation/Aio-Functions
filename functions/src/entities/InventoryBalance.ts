import { Column, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity({ name: 'inventory_balances' })
export class InventoryBalance {
  @PrimaryGeneratedColumn() id!: number;
  @Column({ type: 'varchar', length: 64 }) storeId!: string;
  @Column({ type: 'char', length: 36 }) productId!: string;
  @Column({ type: 'decimal', precision: 12, scale: 3, default: 0 }) onHandQty!: string;
  @UpdateDateColumn({ type: 'datetime' }) updatedAt!: Date;
}
