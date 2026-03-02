import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, Unique } from 'typeorm';

@Entity({ name: 'user_favorites' })
@Unique('UQ_user_favorites_uid_product_variant', ['uid', 'productId', 'variantId'])
@Index('IDX_user_favorites_uid_store', ['uid', 'storeId'])
export class UserFavoriteEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 128 })
  uid!: string;

  @Column({ type: 'char', length: 36 })
  storeId!: string;

  @Column({ type: 'char', length: 36 })
  productId!: string;

  @Column({ type: 'char', length: 36, nullable: true })
  variantId!: string | null;

  @CreateDateColumn()
  createdAt!: Date;
}
