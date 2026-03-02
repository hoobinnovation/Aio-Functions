import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'loyalty_tiers' })
@Index('IDX_loyalty_tiers_store', ['storeId'])
export class LoyaltyTierEntity {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ type: 'char', length: 36 }) storeId!: string;
  @Column({ type: 'varchar', length: 100 }) name!: string;
  @Column({ type: 'int' }) thresholdPoints!: number;
  @Column({ type: 'decimal', precision: 6, scale: 2, default: '1.00' }) multiplier!: string;
  @Column({ type: 'tinyint', default: true }) isActive!: boolean;
  @Column({ type: 'int', default: 0 }) sortOrder!: number;
}
