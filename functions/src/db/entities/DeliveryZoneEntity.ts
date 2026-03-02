import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity({ name: 'delivery_zones' })
@Index('IDX_delivery_zones_store_governorate', ['storeId', 'governorate'])
export class DeliveryZoneEntity {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ type: 'char', length: 36 }) storeId!: string;
  @Column({ type: 'varchar', length: 100 }) governorate!: string;
  @Column({ type: 'varchar', length: 120 }) name!: string;
  @Column({ type: 'decimal', precision: 9, scale: 6 }) centerLat!: string;
  @Column({ type: 'decimal', precision: 9, scale: 6 }) centerLng!: string;
  @Column({ type: 'decimal', precision: 8, scale: 3, nullable: true }) radiusKm!: string | null;
  @Column({ type: 'decimal', precision: 10, scale: 2 }) fee!: string;
  @Column({ type: 'tinyint', default: true }) isActive!: boolean;
  @CreateDateColumn() createdAt!: Date;
  @UpdateDateColumn() updatedAt!: Date;
}
