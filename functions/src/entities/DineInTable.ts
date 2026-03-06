import { Column, CreateDateColumn, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

@Entity({ name: 'dine_in_tables' })
export class DineInTable {
  @PrimaryColumn({ type: 'varchar', length: 64 })
  id!: string;

  @Column({ type: 'varchar', length: 64 })
  storeId!: string;

  @Column({ type: 'char', length: 36 })
  branchId!: string;

  @Column({ type: 'varchar', length: 64 })
  code!: string;

  @Column({ type: 'varchar', length: 32 })
  tableNumber!: string;

  @Column({ type: 'varchar', length: 120, nullable: true })
  name!: string | null;

  @Column({ type: 'int', default: 1 })
  seatsCount!: number;

  @Column({ type: 'varchar', length: 24, default: 'active' })
  status!: 'active' | 'disabled' | 'maintenance';

  @Column({ type: 'int', default: 1 })
  qrVersion!: number;

  @Column({ type: 'text' })
  qrPayload!: string;

  @Column({ type: 'varchar', length: 255 })
  qrSignature!: string;

  @Column({ type: 'datetime', nullable: true })
  lastQrIssuedAt!: Date | null;

  @CreateDateColumn({ type: 'datetime' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'datetime' })
  updatedAt!: Date;
}
