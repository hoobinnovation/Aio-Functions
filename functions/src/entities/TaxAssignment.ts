import { Column, CreateDateColumn, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

@Entity({ name: 'tax_assignments' })
export class TaxAssignment {
  @PrimaryColumn('char', { length: 36 }) id!: string;
  @Column({ type: 'varchar', length: 64, nullable: true }) storeId!: string | null;
  @Column({ type: 'char', length: 36 }) taxCodeId!: string;
  @Column({ type: 'varchar', length: 32 }) contextType!: string;
  @Column({ type: 'varchar', length: 80 }) contextId!: string;
  @Column({ type: 'tinyint', width: 1, default: 1 }) isActive!: boolean;
  @CreateDateColumn({ type: 'datetime' }) createdAt!: Date;
  @UpdateDateColumn({ type: 'datetime' }) updatedAt!: Date;
}
