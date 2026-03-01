import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity({ name: 'categories' })
@Index('IDX_categories_store_sort', ['storeId', 'sortOrder'])
export class CategoryEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'char', length: 36 })
  @Index('IDX_categories_storeId')
  storeId!: string;

  @Column({ type: 'varchar', length: 191 })
  name!: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  imageUrl!: string | null;

  @Column({ type: 'int', default: 0 })
  sortOrder!: number;

  @Column({ type: 'tinyint', default: false })
  isDisabled!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
