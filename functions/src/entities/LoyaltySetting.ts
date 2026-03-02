import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity({ name: 'loyalty_settings' })
export class LoyaltySetting {
  @PrimaryColumn({ type: 'varchar', length: 64 }) storeId!: string;
  @Column({ type: 'int', default: 1 }) pointsPerCurrencyUnit!: number;
  @Column({ type: 'int', default: 100 }) redeemStepPoints!: number;
  @Column({ type: 'bigint', default: 100 }) redeemStepValueCents!: string;
}
