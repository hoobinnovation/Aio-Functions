import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity({ name: 'cart_items' })
export class CartItem {
  @PrimaryColumn('char', { length: 36 }) id!: string;
  @Column({ type: 'char', length: 36 }) cartId!: string;
  @Column({ type: 'char', length: 36 }) productId!: string;
  @Column({ type: 'char', length: 36, nullable: true }) variantId!: string | null;
  @Column({ type: 'int' }) qty!: number;
  @Column({ type: 'bigint' }) unitPriceCents!: string;
}
