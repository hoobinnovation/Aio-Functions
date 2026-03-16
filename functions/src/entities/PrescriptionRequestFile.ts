import { Column, CreateDateColumn, Entity, PrimaryColumn } from 'typeorm';

@Entity({ name: 'prescription_request_files' })
export class PrescriptionRequestFile {
  @PrimaryColumn('char', { length: 36 }) id!: string;
  @Column({ type: 'char', length: 36 }) prescriptionRequestId!: string;
  @Column({ type: 'char', length: 36 }) mediaAssetId!: string;
  @Column({ type: 'varchar', length: 32, default: 'prescription_image' }) kind!: string;
  @Column({ type: 'int', default: 0 }) sortOrder!: number;
  @CreateDateColumn({ type: 'datetime' }) createdAt!: Date;
}
