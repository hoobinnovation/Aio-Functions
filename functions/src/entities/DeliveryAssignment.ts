import { Column, CreateDateColumn, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

@Entity({ name: 'delivery_assignments' })
export class DeliveryAssignment {
  @PrimaryColumn('char', { length: 36 })
  id!: string;

  @Column({ type: 'char', length: 36 })
  orderId!: string;

  @Column({ type: 'varchar', length: 64 })
  storeId!: string;

  @Column({ type: 'char', length: 36, nullable: true })
  branchId!: string | null;

  @Column({ type: 'char', length: 36, nullable: true })
  riderId!: string | null;

  @Column({ type: 'char', length: 36, nullable: true })
  tripId!: string | null;

  @Column({ type: 'varchar', length: 24, default: 'assigned' })
  status!: string;

  @Column({ type: 'varchar', length: 300, nullable: true })
  reason!: string | null;

  @Column({ type: 'varchar', length: 128, nullable: true })
  assignedByUid!: string | null;

  @Column({ type: 'datetime', nullable: true })
  assignedAt!: Date | null;

  @Column({ type: 'datetime', nullable: true })
  respondedAt!: Date | null;

  @Column({ type: 'datetime', nullable: true })
  completedAt!: Date | null;

  @CreateDateColumn({ type: 'datetime' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'datetime' })
  updatedAt!: Date;
}
