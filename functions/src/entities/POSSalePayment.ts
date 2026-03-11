import { Column, CreateDateColumn, Entity, PrimaryColumn } from 'typeorm';

@Entity({ name: 'pos_sale_payments' })
export class POSSalePayment {
  @PrimaryColumn('char', { length: 36 }) id!: string;
  @Column({ type: 'char', length: 36 }) posSaleId!: string;
  @Column({ type: 'varchar', length: 24 }) tenderType!: string;
  @Column({ type: 'bigint' }) amountCents!: string;
  @Column({ type: 'varchar', length: 64, nullable: true }) referenceNo!: string | null;
  @Column({ type: 'varchar', length: 24, default: 'captured' }) status!: string;
  @CreateDateColumn({ type: 'datetime' }) createdAt!: Date;
}
