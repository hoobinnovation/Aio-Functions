import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity({ name: 'home_sections' })
@Index('IDX_home_sections_store_sort', ['storeId', 'sortOrder'])
export class HomeSectionEntity {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ type: 'char', length: 36 }) storeId!: string;
  @Column({ type: 'enum', enum: ['banners', 'categories_row', 'products_carousel', 'products_grid', 'single_banner'] }) type!: 'banners'|'categories_row'|'products_carousel'|'products_grid'|'single_banner';
  @Column({ type: 'varchar', length: 191, nullable: true }) title!: string | null;
  @Column({ type: 'int', default: 0 }) sortOrder!: number;
  @Column({ type: 'tinyint', default: true }) isActive!: boolean;
  @Column({ type: 'json' }) configJson!: Record<string, unknown>;
  @CreateDateColumn() createdAt!: Date;
  @UpdateDateColumn() updatedAt!: Date;
}
