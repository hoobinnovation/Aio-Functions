import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

export type InventoryImportFileType = 'excel' | 'pdf';
export type InventoryImportBatchStatus = 'draft' | 'needsMapping' | 'readyToApply' | 'processing' | 'done' | 'failed';

@Entity({ name: 'inventory_import_batches' })
@Index('idx_inventory_import_batches_store', ['storeId'])
export class InventoryImportBatch {
  @PrimaryGeneratedColumn() id!: number;
  @Column({ type: 'varchar', length: 64 }) storeId!: string;
  @Column({ type: 'char', length: 36 }) fileMediaAssetId!: string;
  @Column({ type: 'enum', enum: ['excel', 'pdf'] }) fileType!: InventoryImportFileType;
  @Column({ type: 'enum', enum: ['draft', 'needsMapping', 'readyToApply', 'processing', 'done', 'failed'] }) status!: InventoryImportBatchStatus;
  @Column({ type: 'char', length: 64 }) idempotencyKey!: string;
  @Column({ type: 'int', default: 0 }) totalRows!: number;
  @Column({ type: 'int', default: 0 }) parsedRows!: number;
  @Column({ type: 'int', default: 0 }) unmappedPrefixesCount!: number;
  @Column({ type: 'int', default: 0 }) createdProductsCount!: number;
  @Column({ type: 'int', default: 0 }) adjustmentsCount!: number;
  @Column({ type: 'int', default: 0 }) parseErrorsCount!: number;
  @Column({ type: 'varchar', length: 128 }) createdByAdminUid!: string;
  @CreateDateColumn({ type: 'datetime' }) createdAt!: Date;
  @UpdateDateColumn({ type: 'datetime' }) updatedAt!: Date;
  @Column({ type: 'datetime', nullable: true }) finishedAt!: Date | null;
  @Column({ type: 'json', nullable: true }) errorDetails!: unknown;
}
