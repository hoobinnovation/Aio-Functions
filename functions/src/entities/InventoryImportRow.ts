import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'inventory_import_rows' })
@Index('idx_inventory_import_rows_batch', ['batchId'])
export class InventoryImportRow {
  @PrimaryGeneratedColumn() id!: number;
  @Column({ type: 'int' }) batchId!: number;
  @Column({ type: 'int' }) rowIndex!: number;
  @Column({ type: 'varchar', length: 64, nullable: true }) prefix!: string | null;
  @Column({ type: 'varchar', length: 180, nullable: true }) externalCode!: string | null;
  @Column({ type: 'varchar', length: 180, nullable: true }) name!: string | null;
  @Column({ type: 'varchar', length: 180, nullable: true }) company!: string | null;
  @Column({ type: 'varchar', length: 80, nullable: true }) unit!: string | null;
  @Column({ type: 'decimal', precision: 12, scale: 3, nullable: true }) qtyOnHand!: string | null;
  @Column({ type: 'bigint', nullable: true }) priceCents!: string | null;
  @Column({ type: 'text', nullable: true }) rawLine!: string | null;
  @Column({ type: 'enum', enum: ['ok', 'error'] }) parseStatus!: 'ok' | 'error';
  @Column({ type: 'text', nullable: true }) parseErrorMessage!: string | null;
}
