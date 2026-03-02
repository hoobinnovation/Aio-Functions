import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity({ name: 'carts' })
@Index('IDX_carts_uid_store', ['uid', 'storeId'])
export class CartEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 128 })
  uid!: string;

  @Column({ type: 'char', length: 36 })
  storeId!: string;

  @Column({ type: 'tinyint', default: true })
  isActive!: boolean;

  @Column({ type: 'varchar', length: 50, nullable: true })
  couponCode!: string | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
