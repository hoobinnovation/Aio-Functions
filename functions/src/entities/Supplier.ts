import { Column, CreateDateColumn, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

export type SupplierStatus = 'active' | 'inactive';

@Entity({ name: 'suppliers' })
export class Supplier {
  @PrimaryColumn('char', { length: 36 }) id!: string;
  @Column({ type: 'varchar', length: 64, nullable: true }) storeId!: string | null;
  @Column({ type: 'varchar', length: 120 }) name!: string;
  @Column({ type: 'varchar', length: 120, nullable: true }) legalName!: string | null;
  @Column({ type: 'varchar', length: 64, nullable: true }) code!: string | null;
  @Column({ type: 'varchar', length: 16, default: 'active' }) status!: SupplierStatus;
  @Column({ type: 'varchar', length: 255, nullable: true }) notes!: string | null;
  @Column({ type: 'json', nullable: true }) metadata!: Record<string, unknown> | null;
  @CreateDateColumn({ type: 'datetime' }) createdAt!: Date;
  @UpdateDateColumn({ type: 'datetime' }) updatedAt!: Date;
}
