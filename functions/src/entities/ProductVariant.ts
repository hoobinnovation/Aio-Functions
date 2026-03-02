import { Column, CreateDateColumn, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

@Entity({ name: 'product_variants' })
export class ProductVariant {
  @PrimaryColumn('char', { length: 36 }) id!: string;
  @Column({ type: 'char', length: 36 }) productId!: string;
  @Column({ type: 'varchar', length: 120 }) sku!: string;
  @Column({ type: 'bigint' }) priceCents!: string;
  @Column({ type: 'int', default: 0 }) stockQty!: number;
  @Column({ type: 'json', nullable: true }) attributes!: any;
  @Column({ type: 'varchar', length: 24, default: 'active' }) status!: string;
  @CreateDateColumn({ type: 'datetime' }) createdAt!: Date;
  @UpdateDateColumn({ type: 'datetime' }) updatedAt!: Date;
}
