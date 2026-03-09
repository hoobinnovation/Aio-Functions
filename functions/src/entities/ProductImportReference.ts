import { Column, CreateDateColumn, Entity, Index, PrimaryColumn, UpdateDateColumn } from 'typeorm';

@Entity({ name: 'product_import_references' })
@Index('uq_product_import_store_source', ['storeId', 'sourceType', 'sourceKey'])
@Index('idx_product_import_product_id', ['productId'])
@Index('idx_product_import_store_id', ['storeId'])
export class ProductImportReference {
  @PrimaryColumn('char', { length: 36 })
  id!: string;

  @Column({ type: 'varchar', length: 64 })
  storeId!: string;

  @Column({ type: 'char', length: 36 })
  productId!: string;

  @Column({ type: 'varchar', length: 40 })
  sourceType!: string;

  @Column({ type: 'varchar', length: 140 })
  sourceKey!: string;

  @Column({ type: 'varchar', length: 140, nullable: true })
  sourceRowId!: string | null;

  @Column({ type: 'varchar', length: 160 })
  parentCategoryName!: string;

  @Column({ type: 'varchar', length: 160 })
  categoryName!: string;

  @Column({ type: 'varchar', length: 1024, nullable: true })
  sourceImageUrl!: string | null;

  @Column({ type: 'json' })
  sourcePayloadJson!: any;

  @Column({ type: 'varchar', length: 128 })
  sourcePayloadHash!: string;

  @Column({ type: 'datetime' })
  lastImportedAt!: Date;

  @CreateDateColumn({ type: 'datetime' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'datetime' })
  updatedAt!: Date;
}
