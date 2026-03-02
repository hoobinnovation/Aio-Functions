import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'home_section_banners' })
@Index('IDX_home_section_banners_store_section', ['storeId', 'sectionId'])
export class HomeSectionBannerEntity {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ type: 'char', length: 36 }) storeId!: string;
  @Column({ type: 'char', length: 36 }) sectionId!: string;
  @Column({ type: 'varchar', length: 500 }) imageUrl!: string;
  @Column({ type: 'enum', enum: ['none', 'open_category', 'open_product', 'open_url'], default: 'none' }) actionType!: 'none'|'open_category'|'open_product'|'open_url';
  @Column({ type: 'varchar', length: 255, nullable: true }) actionValue!: string | null;
  @Column({ type: 'int', default: 0 }) sortOrder!: number;
  @Column({ type: 'tinyint', default: true }) isActive!: boolean;
}
