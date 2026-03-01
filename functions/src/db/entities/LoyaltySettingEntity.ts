import { Column, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

@Entity({ name: 'loyalty_settings' })
export class LoyaltySettingEntity {
  @PrimaryColumn({ type: 'char', length: 36 }) storeId!: string;
  @Column({ type: 'decimal', precision: 10, scale: 4, default: '1.0000' }) pointsPerCurrency!: string;
  @Column({ type: 'int', default: 365 }) expiryDays!: number;
  @Column({ type: 'tinyint', default: true }) redemptionEnabled!: boolean;
  @Column({ type: 'decimal', precision: 10, scale: 4, default: '1.0000' }) currencyPerPoint!: string;
  @UpdateDateColumn() updatedAt!: Date;
}
