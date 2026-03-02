import { Column, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

@Entity({ name: 'store_settings' })
export class StoreSettings {
  @PrimaryColumn({ type: 'varchar', length: 64 })
  storeId!: string;

  @Column({ type: 'varchar', length: 8, default: 'USD' })
  currency!: string;

  @Column({ type: 'varchar', length: 24, default: 'exclusive' })
  taxMode!: string;

  @Column({ type: 'varchar', length: 32, nullable: true })
  supportWhatsApp!: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  supportEmail!: string | null;

  @Column({ type: 'tinyint', width: 1, default: 1 })
  pickupEnabled!: boolean;

  @Column({ type: 'tinyint', width: 1, default: 1 })
  deliveryEnabled!: boolean;

  @UpdateDateColumn({ type: 'datetime' })
  updatedAt!: Date;
}
