import { Column, CreateDateColumn, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

@Entity({ name: 'inventory_transfers' })
export class InventoryTransfer {
  @PrimaryColumn('char', { length: 36 }) id!: string;
  @Column({ type: 'varchar', length: 64 }) storeId!: string;
  @Column({ type: 'char', length: 36 }) fromWarehouseId!: string;
  @Column({ type: 'char', length: 36 }) toWarehouseId!: string;
  @Column({ type: 'varchar', length: 24, default: 'draft' }) status!: string;
  @Column({ type: 'varchar', length: 255, nullable: true }) note!: string | null;
  @CreateDateColumn({ type: 'datetime' }) createdAt!: Date;
  @UpdateDateColumn({ type: 'datetime' }) updatedAt!: Date;
}
