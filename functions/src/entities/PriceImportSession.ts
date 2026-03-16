import { Column, CreateDateColumn, Entity, Index, PrimaryColumn, UpdateDateColumn } from 'typeorm';

@Entity({ name: 'price_import_sessions' })
@Index('idx_price_import_sessions_store_status', ['storeId', 'status', 'createdAt'])
export class PriceImportSession {
  @PrimaryColumn('char', { length: 36 }) id!: string;
  @Column({ type: 'varchar', length: 64 }) storeId!: string;
  @Column({ type: 'char', length: 36, nullable: true }) fileMediaAssetId!: string | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) fileName!: string | null;
  @Column({ type: 'varchar', length: 24, nullable: true }) fileType!: string | null;
  @Column({ type: 'varchar', length: 24, default: 'draft' }) status!: string;
  @Column({ type: 'int', default: 0 }) totalRows!: number;
  @Column({ type: 'int', default: 0 }) mappedRows!: number;
  @Column({ type: 'int', default: 0 }) suggestedRows!: number;
  @Column({ type: 'int', default: 0 }) reviewRows!: number;
  @Column({ type: 'int', default: 0 }) appliedRows!: number;
  @Column({ type: 'int', default: 0 }) skippedRows!: number;
  @Column({ type: 'int', default: 0 }) invalidRows!: number;
  @Column({ type: 'varchar', length: 128 }) createdByAdminUid!: string;
  @Column({ type: 'text', nullable: true }) errorDetails!: string | null;
  @CreateDateColumn({ type: 'datetime' }) createdAt!: Date;
  @UpdateDateColumn({ type: 'datetime' }) updatedAt!: Date;
  @Column({ type: 'datetime', nullable: true }) finishedAt!: Date | null;
}
