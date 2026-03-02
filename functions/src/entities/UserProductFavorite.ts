import { Column, CreateDateColumn, Entity, PrimaryColumn } from 'typeorm';

@Entity({ name: 'user_product_favorites' })
export class UserProductFavorite {
  @PrimaryColumn('char', { length: 36 }) id!: string;
  @Column({ type: 'varchar', length: 128 }) uid!: string;
  @Column({ type: 'char', length: 36 }) productId!: string;
  @CreateDateColumn({ type: 'datetime' }) createdAt!: Date;
}
