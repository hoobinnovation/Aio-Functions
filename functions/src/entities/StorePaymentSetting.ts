import { Column, Entity, PrimaryColumn } from 'typeorm';
@Entity({ name: 'store_payment_settings' })
export class StorePaymentSetting {
  @PrimaryColumn({ type: 'varchar', length: 64 }) storeId!: string;
  @Column({ type: 'varchar', length: 40 }) provider!: string;
  @Column({ type: 'json' }) config!: any;
}
