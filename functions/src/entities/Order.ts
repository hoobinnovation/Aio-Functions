import { Column, CreateDateColumn, Entity, PrimaryColumn } from 'typeorm';

@Entity({ name: 'orders' })
export class Order {
  @PrimaryColumn('char', { length: 36 })
  id!: string;

  @Column({ type: 'varchar', length: 64 })
  storeId!: string;

  @Column({ type: 'varchar', length: 128 })
  uid!: string;

  @Column({ type: 'varchar', length: 24 })
  channel!: string;

  @Column({ type: 'varchar', length: 24 })
  status!: string;

  @Column({ type: 'varchar', length: 24, default: 'standard' })
  serviceType!: string;

  @Column({ type: 'char', length: 36, nullable: true })
  branchId!: string | null;

  @Column({ type: 'varchar', length: 64, nullable: true })
  tableId!: string | null;

  @Column({ type: 'varchar', length: 64, nullable: true })
  dineInSessionId!: string | null;

  @Column({ type: 'char', length: 36, nullable: true })
  deliveryZoneId!: string | null;

  @Column({ type: 'varchar', length: 120, nullable: true })
  deliveryZoneName!: string | null;

  @Column({ type: 'char', length: 36, nullable: true })
  shippingMethodId!: string | null;

  @Column({ type: 'varchar', length: 80, nullable: true })
  shippingRecipientName!: string | null;

  @Column({ type: 'varchar', length: 32, nullable: true })
  shippingPhone!: string | null;

  @Column({ type: 'varchar', length: 80, nullable: true })
  shippingAddressLabel!: string | null;

  @Column({ type: 'varchar', length: 300, nullable: true })
  shippingAddressLine!: string | null;

  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  shippingLat!: string | null;

  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  shippingLng!: string | null;

  @Column({ type: 'bigint' })
  subtotalCents!: string;

  @Column({ type: 'bigint' })
  discountCents!: string;

  @Column({ type: 'bigint' })
  shippingCents!: string;

  @Column({ type: 'bigint' })
  taxCents!: string;

  @Column({ type: 'bigint' })
  totalCents!: string;

  @Column({ type: 'varchar', length: 24 })
  paymentStatus!: string;

  @Column({ type: 'varchar', length: 24, default: 'clear' })
  riskStatus!: string;

  @CreateDateColumn({ type: 'datetime' })
  createdAt!: Date;
}