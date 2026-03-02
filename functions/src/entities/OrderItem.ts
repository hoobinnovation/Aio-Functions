import { Column, Entity, PrimaryColumn } from 'typeorm';
@Entity({ name: 'order_items' })
export class OrderItem {
  @PrimaryColumn('char', { length: 36 }) id!: string;
  @Column({ type: 'char', length: 36 }) orderId!: string;
  @Column({ type: 'char', length: 36 }) productId!: string;
  @Column({ type: 'char', length: 36, nullable: true }) variantId!: string | null;
  @Column({ type: 'varchar', length: 180 }) nameSnapshot!: string;
  @Column({ type: 'bigint' }) priceCents!: string;
  @Column({ type: 'int' }) qty!: number;
}
