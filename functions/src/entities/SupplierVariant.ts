import { Column, CreateDateColumn, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

@Entity({ name: 'supplier_variants' })
export class SupplierVariant {
  @PrimaryColumn('char', { length: 36 }) id!: string;
  @Column({ type: 'char', length: 36 }) supplierId!: string;
  @Column({ type: 'char', length: 36 }) variantId!: string;
  @Column({ type: 'varchar', length: 120, nullable: true }) supplierSku!: string | null;
  @Column({ type: 'decimal', precision: 14, scale: 4, nullable: true }) lastCostCents!: string | null;
  @Column({ type: 'varchar', length: 8, default: 'EGP' }) currencyCode!: string;
  @Column({ type: 'tinyint', width: 1, default: 0 }) isPreferred!: boolean;
  @Column({ type: 'int', nullable: true }) leadTimeDays!: number | null;
  @CreateDateColumn({ type: 'datetime' }) createdAt!: Date;
  @UpdateDateColumn({ type: 'datetime' }) updatedAt!: Date;
}
