import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity({ name: 'product_variants' })
@Index('IDX_product_variants_store_product', ['storeId', 'productId'])
export class ProductVariantEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'char', length: 36 })
  storeId!: string;

  @Column({ type: 'char', length: 36 })
  productId!: string;

  @Column({ type: 'varchar', length: 120 })
  name!: string;

  @Column({ type: 'varchar', length: 120, nullable: true })
  sku!: string | null;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  priceOverride!: string | null;

  @Column({ type: 'int', default: 0 })
  stockQty!: number;

  @Column({ type: 'tinyint', default: true })
  isActive!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
