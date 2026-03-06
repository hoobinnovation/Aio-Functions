import { Column, CreateDateColumn, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

@Entity({ name: 'dine_in_waiter_calls' })
export class DineInWaiterCall {
  @PrimaryColumn({ type: 'varchar', length: 64 }) id!: string;
  @Column({ type: 'varchar', length: 64 }) storeId!: string;
  @Column({ type: 'char', length: 36 }) branchId!: string;
  @Column({ type: 'varchar', length: 64 }) tableId!: string;
  @Column({ type: 'varchar', length: 64 }) sessionId!: string;
  @Column({ type: 'char', length: 36, nullable: true }) orderId!: string | null;
  @Column({ type: 'varchar', length: 128, nullable: true }) customerUid!: string | null;
  @Column({ type: 'varchar', length: 24 }) callType!: 'callWaiter'|'requestBill'|'needHelp'|'cleanup';
  @Column({ type: 'text', nullable: true }) note!: string | null;
  @Column({ type: 'varchar', length: 24, default: 'open' }) status!: 'open'|'acknowledged'|'resolved'|'cancelled';
  @CreateDateColumn({ type: 'datetime' }) createdAt!: Date;
  @UpdateDateColumn({ type: 'datetime' }) updatedAt!: Date;
  @Column({ type: 'datetime', nullable: true }) resolvedAt!: Date | null;
  @Column({ type: 'varchar', length: 128, nullable: true }) resolvedByAdminUid!: string | null;
}
