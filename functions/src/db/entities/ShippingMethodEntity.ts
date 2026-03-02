import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity({ name: 'shipping_methods' })
@Index('IDX_shipping_methods_store', ['storeId'])
export class ShippingMethodEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'char', length: 36 })
  storeId!: string;

  @Column({ type: 'varchar', length: 120 })
  name!: string;

  @Column({ type: 'enum', enum: ['flat', 'by_area', 'pickup'] })
  type!: 'flat' | 'by_area' | 'pickup';

  @Column({ type: 'decimal', precision: 10, scale: 2, default: '0.00' })
  cost!: string;

  @Column({ type: 'json', nullable: true })
  rules!: Record<string, unknown> | null;

  @Column({ type: 'int', nullable: true })
  estimatedDays!: number | null;

  @Column({ type: 'tinyint', default: true })
  isActive!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
