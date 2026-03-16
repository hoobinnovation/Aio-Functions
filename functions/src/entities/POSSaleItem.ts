import { Column, CreateDateColumn, Entity, PrimaryColumn } from 'typeorm';

@Entity({ name: 'pos_sale_items' })
export class POSSaleItem {
  @PrimaryColumn('char', { length: 36 }) id!: string;
  @Column({ type: 'char', length: 36 }) posSaleId!: string;
  @Column({ type: 'char', length: 36 }) productId!: string;
  @Column({ type: 'char', length: 36 }) variantId!: string;
  @Column({ type: 'varchar', length: 180 }) nameSnapshot!: string;
  @Column({ type: 'bigint' }) unitPriceCents!: string;
  @Column({ type: 'decimal', precision: 12, scale: 3 }) qty!: string;
  @Column({ type: 'bigint' }) lineTotalCents!: string;
  @CreateDateColumn({ type: 'datetime' }) createdAt!: Date;
}
