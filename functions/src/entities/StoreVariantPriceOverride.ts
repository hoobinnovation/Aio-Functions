import { Column, CreateDateColumn, Entity, Index, PrimaryColumn, UpdateDateColumn } from 'typeorm';

@Entity({ name: 'store_variant_price_overrides' })
@Index('idx_store_variant_price_overrides_store_variant', ['storeId', 'variantId'])
export class StoreVariantPriceOverride {
  @PrimaryColumn('char', { length: 36 }) id!: string;
  @Column({ type: 'varchar', length: 64 }) storeId!: string;
  @Column({ type: 'char', length: 36 }) variantId!: string;
  @Column({ type: 'bigint' }) priceCents!: string;
  @Column({ type: 'char', length: 36, nullable: true }) priceImportSessionId!: string | null;
  @CreateDateColumn({ type: 'datetime' }) createdAt!: Date;
  @UpdateDateColumn({ type: 'datetime' }) updatedAt!: Date;
}
