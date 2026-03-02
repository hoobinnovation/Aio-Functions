import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity({ name: 'banners' })
@Index('IDX_banners_store_sort', ['storeId', 'sortOrder'])
export class BannerEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'char', length: 36 })
  @Index('IDX_banners_storeId')
  storeId!: string;

  @Column({ type: 'varchar', length: 500 })
  imageUrl!: string;

  @Column({ type: 'varchar', length: 191, nullable: true })
  title!: string | null;

  @Column({ type: 'enum', enum: ['none', 'open_category', 'open_product', 'open_url'], default: 'none' })
  actionType!: 'none' | 'open_category' | 'open_product' | 'open_url';

  @Column({ type: 'varchar', length: 255, nullable: true })
  actionValue!: string | null;

  @Column({ type: 'int', default: 0 })
  sortOrder!: number;

  @Column({ type: 'tinyint', default: false })
  isDisabled!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
