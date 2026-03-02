import { Column, CreateDateColumn, Entity, PrimaryColumn } from 'typeorm';
@Entity({ name: 'insurance_orders' })
export class InsuranceOrder {
  @PrimaryColumn('char', { length: 36 }) id!: string;
  @Column({ type: 'varchar', length: 64 }) storeId!: string;
  @Column({ type: 'varchar', length: 128 }) uid!: string;
  @Column({ type: 'varchar', length: 24 }) status!: string;
  @Column({ type: 'tinyint', width: 1, default: 0 }) quoteLocked!: boolean;
  @Column({ type: 'tinyint', width: 1, default: 0 }) deliveryCentsX2Applied!: boolean;
  @CreateDateColumn({ type: 'datetime' }) createdAt!: Date;
}
