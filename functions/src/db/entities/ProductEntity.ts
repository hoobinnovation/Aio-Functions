import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity({ name: 'products' })
@Index('IDX_products_store_created', ['storeId', 'createdAt'])
@Index('IDX_products_store_featured', ['storeId', 'isFeatured'])
@Index('IDX_products_store_name', ['storeId', 'name'])
export class ProductEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'char', length: 36 })
  @Index('IDX_products_storeId')
  storeId!: string;

  @Column({ type: 'char', length: 36, nullable: true })
  categoryId!: string | null;

  @Column({ type: 'varchar', length: 191 })
  name!: string;

  @Column({ type: 'varchar', length: 500 })
  thumbnailUrl!: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  price!: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  compareAtPrice!: string | null;

  @Column({ type: 'varchar', length: 8, default: 'EGP' })
  currency!: string;

  @Column({ type: 'decimal', precision: 3, scale: 2, nullable: true })
  ratingAvg!: string | null;

  @Column({ type: 'int', default: 0 })
  ratingCount!: number;

  @Column({ type: 'tinyint', default: false })
  isFeatured!: boolean;

  @Column({ type: 'tinyint', default: false })
  isDisabled!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
