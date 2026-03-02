import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, Unique, UpdateDateColumn } from 'typeorm';

@Entity({ name: 'cart_items' })
@Unique('UQ_cart_items_cart_variant', ['cartId', 'variantId'])
@Index('IDX_cart_items_cart', ['cartId'])
export class CartItemEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'char', length: 36 })
  cartId!: string;

  @Column({ type: 'char', length: 36 })
  storeId!: string;

  @Column({ type: 'char', length: 36 })
  productId!: string;

  @Column({ type: 'char', length: 36 })
  variantId!: string;

  @Column({ type: 'int' })
  qty!: number;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
