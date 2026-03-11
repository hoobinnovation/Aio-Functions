import { Column, CreateDateColumn, Entity, Index, PrimaryColumn } from 'typeorm';

@Entity({ name: 'product_categories' })
@Index('uq_product_categories_product_category', ['productId', 'categoryId'])
export class ProductCategory {
  @PrimaryColumn('char', { length: 36 }) id!: string;
  @Column({ type: 'char', length: 36 }) productId!: string;
  @Column({ type: 'char', length: 36 }) categoryId!: string;
  @Column({ type: 'tinyint', width: 1, default: 0 }) isPrimary!: boolean;
  @CreateDateColumn({ type: 'datetime' }) createdAt!: Date;
}
