import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, Unique, UpdateDateColumn } from 'typeorm';

@Entity({ name: 'payment_settings' })
@Unique('UQ_payment_settings_store_provider', ['storeId', 'provider'])
@Index('IDX_payment_settings_store', ['storeId'])
export class PaymentSettingEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'char', length: 36 })
  storeId!: string;

  @Column({ type: 'varchar', length: 50 })
  provider!: string;

  @Column({ type: 'tinyint', default: true })
  isActive!: boolean;

  @Column({ type: 'json', nullable: true })
  config!: Record<string, unknown> | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
