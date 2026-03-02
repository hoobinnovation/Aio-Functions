import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'order_items' })
@Index('IDX_order_items_order', ['orderId'])
@Index('IDX_order_items_store', ['storeId'])
export class OrderItemEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;
  @Column({ type: 'char', length: 36 })
  orderId!: string;
  @Column({ type: 'char', length: 36 })
  storeId!: string;
  @Column({ type: 'char', length: 36 })
  productId!: string;
  @Column({ type: 'char', length: 36 })
  variantId!: string;
  @Column({ type: 'varchar', length: 191 })
  nameSnapshot!: string;
  @Column({ type: 'varchar', length: 500 })
  thumbnailUrlSnapshot!: string;
  @Column({ type: 'varchar', length: 191 })
  variantSummarySnapshot!: string;
  @Column({ type: 'decimal', precision: 10, scale: 2 })
  unitPrice!: string;
  @Column({ type: 'int' })
  qty!: number;
  @Column({ type: 'decimal', precision: 10, scale: 2 })
  lineTotal!: string;
  @CreateDateColumn()
  createdAt!: Date;
}
