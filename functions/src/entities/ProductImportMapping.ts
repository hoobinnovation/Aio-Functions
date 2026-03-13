import { Column, CreateDateColumn, Entity, Index, PrimaryColumn, UpdateDateColumn } from 'typeorm';

@Entity({ name: 'product_import_mappings' })
@Index('idx_product_import_mappings_store_normalized', ['storeId', 'normalizedSourceText'])
@Index('idx_product_import_mappings_store_product', ['storeId', 'productId'])
export class ProductImportMapping {
  @PrimaryColumn('char', { length: 36 }) id!: string;
  @Column({ type: 'varchar', length: 64 }) storeId!: string;
  @Column({ type: 'varchar', length: 180 }) sourceText!: string;
  @Column({ type: 'varchar', length: 180 }) normalizedSourceText!: string;
  @Column({ type: 'char', length: 36 }) productId!: string;
  @Column({ type: 'char', length: 36, nullable: true }) variantId!: string | null;
  @Column({ type: 'int', default: 0 }) confidence!: number;
  @Column({ type: 'varchar', length: 24, default: 'manual' }) mappingType!: string;
  @CreateDateColumn({ type: 'datetime' }) createdAt!: Date;
  @UpdateDateColumn({ type: 'datetime' }) updatedAt!: Date;
}
