import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'coupon_redemptions' })
@Index('IDX_coupon_redemptions_coupon_uid', ['couponId', 'uid'])
export class CouponRedemptionEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'char', length: 36 })
  couponId!: string;

  @Column({ type: 'char', length: 36 })
  orderId!: string;

  @Column({ type: 'varchar', length: 128 })
  uid!: string;

  @Column({ type: 'char', length: 36 })
  storeId!: string;

  @CreateDateColumn()
  createdAt!: Date;
}
