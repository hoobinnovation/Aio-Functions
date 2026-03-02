import { Column, Entity, PrimaryColumn } from 'typeorm';
@Entity({ name: 'insurance_files' })
export class InsuranceFile {
  @PrimaryColumn('char', { length: 36 }) id!: string;
  @Column({ type: 'char', length: 36 }) insuranceOrderId!: string;
  @Column({ type: 'varchar', length: 20 }) type!: string;
  @Column({ type: 'char', length: 36 }) mediaAssetId!: string;
}
