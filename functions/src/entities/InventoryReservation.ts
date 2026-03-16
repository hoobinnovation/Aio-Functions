import { Column, CreateDateColumn, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

@Entity({ name: 'inventory_reservations' })
export class InventoryReservation {
  @PrimaryColumn('char', { length: 36 }) id!: string;
  @Column({ type: 'varchar', length: 64 }) storeId!: string;
  @Column({ type: 'char', length: 36 }) variantId!: string;
  @Column({ type: 'char', length: 36, nullable: true }) warehouseId!: string | null;
  @Column({ type: 'decimal', precision: 12, scale: 3 }) qty!: string;
  @Column({ type: 'varchar', length: 48 }) sourceDocumentType!: string;
  @Column({ type: 'varchar', length: 80 }) sourceDocumentId!: string;
  @Column({ type: 'varchar', length: 24, default: 'active' }) status!: string;
  @Column({ type: 'datetime', nullable: true }) expiresAt!: Date | null;
  @CreateDateColumn({ type: 'datetime' }) createdAt!: Date;
  @UpdateDateColumn({ type: 'datetime' }) updatedAt!: Date;
}
