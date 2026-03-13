import { Column, CreateDateColumn, Entity, Index, PrimaryColumn, UpdateDateColumn } from 'typeorm';

@Entity({ name: 'product_aliases' })
@Index('idx_product_aliases_store_product', ['storeId', 'productId'])
@Index('idx_product_aliases_store_normalized', ['storeId', 'normalizedAlias'])
export class ProductAlias {
  @PrimaryColumn('char', { length: 36 }) id!: string;
  @Column({ type: 'varchar', length: 64 }) storeId!: string;
  @Column({ type: 'char', length: 36 }) productId!: string;
  @Column({ type: 'varchar', length: 180 }) alias!: string;
  @Column({ type: 'varchar', length: 180 }) normalizedAlias!: string;
  @CreateDateColumn({ type: 'datetime' }) createdAt!: Date;
  @UpdateDateColumn({ type: 'datetime' }) updatedAt!: Date;
}
