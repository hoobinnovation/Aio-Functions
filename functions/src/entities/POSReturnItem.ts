import { Column, CreateDateColumn, Entity, PrimaryColumn } from 'typeorm';

@Entity({ name: 'pos_return_items' })
export class POSReturnItem {
  @PrimaryColumn('char', { length: 36 }) id!: string;
  @Column({ type: 'char', length: 36 }) posReturnId!: string;
  @Column({ type: 'char', length: 36 }) posSaleItemId!: string;
  @Column({ type: 'char', length: 36 }) variantId!: string;
  @Column({ type: 'decimal', precision: 12, scale: 3 }) qty!: string;
  @Column({ type: 'bigint' }) unitPriceCents!: string;
  @Column({ type: 'bigint' }) lineRefundCents!: string;
  @CreateDateColumn({ type: 'datetime' }) createdAt!: Date;
}
