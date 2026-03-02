import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity({ name: 'orders' })
@Index('IDX_orders_store', ['storeId'])
@Index('IDX_orders_uid', ['uid'])
@Index('IDX_orders_store_number', ['storeId', 'orderNumber'], { unique: true })
export class OrderEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;
  @Column({ type: 'char', length: 36 })
  storeId!: string;
  @Column({ type: 'varchar', length: 128 })
  uid!: string;
  @Column({ type: 'varchar', length: 50 })
  orderNumber!: string;
  @Column({ type: 'enum', enum: ['pending', 'processing', 'shipped', 'delivered', 'cancelled'] })
  status!: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  @Column({ type: 'enum', enum: ['unpaid', 'pending', 'paid', 'failed', 'refunded'] })
  paymentStatus!: 'unpaid' | 'pending' | 'paid' | 'failed' | 'refunded';
  @Column({ type: 'decimal', precision: 10, scale: 2 })
  subtotal!: string;
  @Column({ type: 'decimal', precision: 10, scale: 2, default: '0.00' })
  discountTotal!: string;
  @Column({ type: 'decimal', precision: 10, scale: 2, default: '0.00' })
  shippingTotal!: string;
  @Column({ type: 'decimal', precision: 10, scale: 2, default: '0.00' })
  taxTotal!: string;
  @Column({ type: 'decimal', precision: 10, scale: 2 })
  total!: string;
  @Column({ type: 'varchar', length: 8 })
  currency!: string;
  @Column({ type: 'json' })
  addressSnapshot!: Record<string, unknown>;
  @Column({ type: 'json' })
  shippingSnapshot!: Record<string, unknown>;
  @Column({ type: 'json', nullable: true })
  couponSnapshot!: Record<string, unknown> | null;
  @Column({ type: 'varchar', length: 50 })
  paymentMethodCode!: string;
  @Column({ type: 'varchar', length: 50, nullable: true })
  paymentProvider!: string | null;
  @CreateDateColumn()
  createdAt!: Date;
  @UpdateDateColumn()
  updatedAt!: Date;
}
