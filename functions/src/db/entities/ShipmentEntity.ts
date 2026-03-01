import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity({ name: 'shipments' })
@Index('IDX_shipments_order', ['orderId'])
export class ShipmentEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'char', length: 36 })
  orderId!: string;

  @Column({ type: 'char', length: 36 })
  storeId!: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  carrier!: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  trackingNumber!: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  trackingUrl!: string | null;

  @Column({ type: 'enum', enum: ['created', 'in_transit', 'delivered'], nullable: true })
  status!: 'created' | 'in_transit' | 'delivered' | null;

  @Column({ type: 'datetime', nullable: true })
  estimatedDelivery!: Date | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
