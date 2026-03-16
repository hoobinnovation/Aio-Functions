import { Column, CreateDateColumn, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

@Entity({ name: 'supplier_contacts' })
export class SupplierContact {
  @PrimaryColumn('char', { length: 36 }) id!: string;
  @Column({ type: 'char', length: 36 }) supplierId!: string;
  @Column({ type: 'varchar', length: 120 }) fullName!: string;
  @Column({ type: 'varchar', length: 120, nullable: true }) role!: string | null;
  @Column({ type: 'varchar', length: 120, nullable: true }) email!: string | null;
  @Column({ type: 'varchar', length: 40, nullable: true }) phone!: string | null;
  @Column({ type: 'tinyint', width: 1, default: 0 }) isPrimary!: boolean;
  @CreateDateColumn({ type: 'datetime' }) createdAt!: Date;
  @UpdateDateColumn({ type: 'datetime' }) updatedAt!: Date;
}
