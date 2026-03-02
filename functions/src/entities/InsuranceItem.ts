import { Column, Entity, PrimaryColumn } from 'typeorm';
@Entity({ name: 'insurance_items' })
export class InsuranceItem {
  @PrimaryColumn('char', { length: 36 }) id!: string;
  @Column({ type: 'char', length: 36 }) insuranceOrderId!: string;
  @Column({ type: 'varchar', length: 180 }) name!: string;
  @Column({ type: 'int' }) qty!: number;
  @Column({ type: 'bigint' }) clientContributionCents!: string;
  @Column({ type: 'bigint' }) companyContributionCents!: string;
}
