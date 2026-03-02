import { Column, CreateDateColumn, Entity, PrimaryColumn } from 'typeorm';

@Entity({ name: 'user_store_favorites' })
export class UserStoreFavorite {
  @PrimaryColumn('char', { length: 36 }) id!: string;
  @Column({ type: 'varchar', length: 128 }) uid!: string;
  @Column({ type: 'varchar', length: 64 }) storeId!: string;
  @CreateDateColumn({ type: 'datetime' }) createdAt!: Date;
}
