import { Column, CreateDateColumn, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

@Entity({ name: 'delivery_riders' })
export class DeliveryRider {
  @PrimaryColumn('char', { length: 36 })
  id!: string;

  @Column({ type: 'varchar', length: 128, unique: true })
  uid!: string;

  @Column({ type: 'varchar', length: 64 })
  storeId!: string;

  @Column({ type: 'char', length: 36, nullable: true })
  branchId!: string | null;

  @Column({ type: 'varchar', length: 80, nullable: true })
  displayName!: string | null;

  @Column({ type: 'varchar', length: 32, nullable: true })
  phone!: string | null;

  @Column({ type: 'varchar', length: 48, nullable: true })
  vehicleType!: string | null;

  @Column({ type: 'varchar', length: 24, default: 'active' })
  status!: string;

  @Column({ type: 'varchar', length: 24, default: 'offline' })
  presenceStatus!: string;

  @Column({ type: 'char', length: 36, nullable: true })
  activeOrderId!: string | null;

  @Column({ type: 'char', length: 36, nullable: true })
  activeTripId!: string | null;

  @Column({ type: 'datetime', nullable: true })
  lastSeenAt!: Date | null;

  @CreateDateColumn({ type: 'datetime' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'datetime' })
  updatedAt!: Date;
}
