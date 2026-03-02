import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity({ name: 'delivery_zones' })
export class DeliveryZone {
  @PrimaryColumn('char', { length: 36 }) id!: string;
  @Column({ type: 'varchar', length: 64 }) storeId!: string;
  @Column({ type: 'char', length: 36 }) governorateId!: string;
  @Column({ type: 'varchar', length: 120 }) name!: string;
  @Column({ type: 'decimal', precision: 10, scale: 7 }) lat!: string;
  @Column({ type: 'decimal', precision: 10, scale: 7 }) lng!: string;
  @Column({ type: 'bigint' }) priceCents!: string;
  @Column({ type: 'varchar', length: 24, default: 'active' }) status!: string;
}
