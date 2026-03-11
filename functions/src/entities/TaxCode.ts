import { Column, CreateDateColumn, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

@Entity({ name: 'tax_codes' })
export class TaxCode {
  @PrimaryColumn('char', { length: 36 }) id!: string;
  @Column({ type: 'varchar', length: 64, nullable: true }) storeId!: string | null;
  @Column({ type: 'varchar', length: 32 }) code!: string;
  @Column({ type: 'varchar', length: 120 }) name!: string;
  @Column({ type: 'varchar', length: 24 }) taxType!: string;
  @Column({ type: 'varchar', length: 24 }) classification!: string;
  @Column({ type: 'varchar', length: 16, default: 'output' }) direction!: 'output' | 'input' | 'both';
  @Column({ type: 'tinyint', width: 1, default: 1 }) isActive!: boolean;
  @CreateDateColumn({ type: 'datetime' }) createdAt!: Date;
  @UpdateDateColumn({ type: 'datetime' }) updatedAt!: Date;
}
