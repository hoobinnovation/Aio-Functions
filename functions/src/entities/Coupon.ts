import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity({ name: 'coupons' })
export class Coupon {
  @PrimaryColumn('char', { length: 36 }) id!: string;
  @Column({ type: 'varchar', length: 64 }) storeId!: string;
  @Column({ type: 'varchar', length: 64 }) code!: string;
  @Column({ type: 'varchar', length: 24 }) discountType!: string;
  @Column({ type: 'bigint' }) discountValue!: string;
  @Column({ type: 'datetime', nullable: true }) startsAt!: Date | null;
  @Column({ type: 'datetime', nullable: true }) endsAt!: Date | null;
  @Column({ type: 'int', default: 0 }) perUserLimit!: number;
  @Column({ type: 'varchar', length: 24, default: 'active' }) status!: string;
}
