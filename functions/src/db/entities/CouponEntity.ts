import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity({ name: 'coupons' })
@Index('IDX_coupons_store_code', ['storeId', 'code'])
export class CouponEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'char', length: 36 })
  storeId!: string;

  @Column({ type: 'varchar', length: 50 })
  code!: string;

  @Column({ type: 'enum', enum: ['percent', 'fixed'] })
  discountType!: 'percent' | 'fixed';

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  discountValue!: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  minOrderTotal!: string | null;

  @Column({ type: 'int', default: 0 })
  usageLimit!: number;

  @Column({ type: 'int', default: 0 })
  usageCount!: number;

  @Column({ type: 'tinyint', default: true })
  isActive!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
