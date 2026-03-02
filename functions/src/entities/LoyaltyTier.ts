import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity({ name: 'loyalty_tiers' })
export class LoyaltyTier {
  @PrimaryColumn('char', { length: 36 }) id!: string;
  @Column({ type: 'varchar', length: 64 }) storeId!: string;
  @Column({ type: 'varchar', length: 80 }) name!: string;
  @Column({ type: 'int' }) minPoints!: number;
  @Column({ type: 'varchar', length: 24, default: 'active' }) status!: string;
}
