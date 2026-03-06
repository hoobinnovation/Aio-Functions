import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity({ name: 'product_prefix_mappings' })
@Index('idx_product_prefix_mappings_store_prefix', ['storeId', 'prefix'])
export class ProductPrefixMapping {
  @PrimaryGeneratedColumn() id!: number;

  @Column({ type: 'varchar', length: 64 }) storeId!: string;

  @Column({ type: 'varchar', length: 64 }) prefix!: string;

  @Column({ type: 'char', length: 36 }) productId!: string;

  @CreateDateColumn({ type: 'datetime' }) createdAt!: Date;
  @UpdateDateColumn({ type: 'datetime' }) updatedAt!: Date;
}
