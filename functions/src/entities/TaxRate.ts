import { Column, CreateDateColumn, Entity, PrimaryColumn } from 'typeorm';

@Entity({ name: 'tax_rates' })
export class TaxRate {
  @PrimaryColumn('char', { length: 36 }) id!: string;
  @Column({ type: 'char', length: 36 }) taxCodeId!: string;
  @Column({ type: 'decimal', precision: 9, scale: 6 }) rate!: string;
  @Column({ type: 'date' }) effectiveFrom!: string;
  @Column({ type: 'date', nullable: true }) effectiveTo!: string | null;
  @Column({ type: 'tinyint', width: 1, default: 1 }) isCompound!: boolean;
  @Column({ type: 'tinyint', width: 1, default: 0 }) isInclusive!: boolean;
  @CreateDateColumn({ type: 'datetime' }) createdAt!: Date;
}
