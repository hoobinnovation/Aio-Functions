import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity({ name: 'insurance_orders' })
@Index('IDX_insurance_orders_store', ['storeId'])
@Index('IDX_insurance_orders_uid', ['uid'])
export class InsuranceOrderEntity {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ type: 'char', length: 36 }) storeId!: string;
  @Column({ type: 'varchar', length: 128 }) uid!: string;
  @Column({
    type: 'enum',
    enum: [
      'insurance_submitted',
      'insurance_under_review',
      'insurance_quote_ready',
      'insurance_customer_approved',
      'insurance_customer_rejected',
      'processing',
      'shipped',
      'delivered',
      'cancelled',
    ],
  })
  status!:
    | 'insurance_submitted'
    | 'insurance_under_review'
    | 'insurance_quote_ready'
    | 'insurance_customer_approved'
    | 'insurance_customer_rejected'
    | 'processing'
    | 'shipped'
    | 'delivered'
    | 'cancelled';
  @Column({ type: 'text', nullable: true }) notes!: string | null;
  @Column({ type: 'varchar', length: 500, nullable: true }) cardFilePath!: string | null;
  @Column({ type: 'varchar', length: 500, nullable: true }) medicalFilePath!: string | null;
  @Column({ type: 'json', nullable: true }) addressSnapshot!: Record<string, unknown> | null;
  @Column({ type: 'char', length: 36, nullable: true }) deliveryZoneId!: string | null;
  @Column({ type: 'decimal', precision: 10, scale: 2, default: '0.00' }) deliveryFee!: string;
  @Column({ type: 'decimal', precision: 10, scale: 2, default: '0.00' }) subtotal!: string;
  @Column({ type: 'decimal', precision: 10, scale: 2, default: '0.00' }) total!: string;
  @Column({ type: 'tinyint', default: false }) quoteLocked!: boolean;
  @CreateDateColumn() createdAt!: Date;
  @UpdateDateColumn() updatedAt!: Date;
}
