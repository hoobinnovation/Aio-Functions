import { Column, CreateDateColumn, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

export type CatalogMode = 'global' | 'store';

@Entity({ name: 'products' })
export class Product {
  @PrimaryColumn('char', { length: 36 }) id!: string;
  @Column({ type: 'varchar', length: 24, default: 'store' }) mode!: CatalogMode;
  @Column({ type: 'varchar', length: 64, nullable: true }) storeId!: string | null;
  @Column({ type: 'char', length: 36, nullable: true }) categoryId!: string | null;
  @Column({ type: 'varchar', length: 180 }) name!: string;
  @Column({ type: 'varchar', length: 200 }) slug!: string;
  @Column({ type: 'text', nullable: true }) description!: string | null;
  @Column({ type: 'varchar', length: 24, default: 'active' }) status!: string;
  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 }) ratingAverage!: string;
  @Column({ type: 'int', default: 0 }) ratingCount!: number;
  @Column({ type: 'int', default: 0 }) favoriteCount!: number;
  @Column({ type: 'int', default: 0 }) completedOrderQty!: number;
  @Column({ type: 'int', default: 0 }) popularityScore!: number;
  @CreateDateColumn({ type: 'datetime' }) createdAt!: Date;
  @UpdateDateColumn({ type: 'datetime' }) updatedAt!: Date;
}
