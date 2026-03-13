import { Column, CreateDateColumn, Entity, Index, PrimaryColumn, UpdateDateColumn } from 'typeorm';

@Entity({ name: 'price_import_rows' })
@Index('idx_price_import_rows_session_row', ['sessionId', 'rowNumber'])
@Index('idx_price_import_rows_session_status', ['sessionId', 'matchStatus'])
export class PriceImportRow {
  @PrimaryColumn('char', { length: 36 }) id!: string;
  @Column({ type: 'char', length: 36 }) sessionId!: string;
  @Column({ type: 'int' }) rowNumber!: number;
  @Column({ type: 'varchar', length: 180 }) sourceName!: string;
  @Column({ type: 'varchar', length: 180 }) normalizedSourceName!: string;
  @Column({ type: 'bigint', nullable: true }) sourcePriceCents!: string | null;
  @Column({ type: 'varchar', length: 80, nullable: true }) sourceUnit!: string | null;
  @Column({ type: 'decimal', precision: 12, scale: 3, nullable: true }) sourceBalance!: string | null;
  @Column({ type: 'char', length: 36, nullable: true }) matchedProductId!: string | null;
  @Column({ type: 'char', length: 36, nullable: true }) matchedVariantId!: string | null;
  @Column({ type: 'int', nullable: true }) confidenceScore!: number | null;
  @Column({ type: 'varchar', length: 32, default: 'unmapped' }) matchStatus!: string;
  @Column({ type: 'varchar', length: 24, nullable: true }) mappingSource!: string | null;
  @Column({ type: 'json', nullable: true }) candidateMatches!: any;
  @Column({ type: 'json', nullable: true }) issues!: any;
  @CreateDateColumn({ type: 'datetime' }) createdAt!: Date;
  @UpdateDateColumn({ type: 'datetime' }) updatedAt!: Date;
}
