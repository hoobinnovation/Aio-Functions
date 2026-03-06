import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity({ name: 'branches' })
export class Branch {
  @PrimaryColumn('char', { length: 36 }) id!: string;
  @Column({ type: 'varchar', length: 64 }) storeId!: string;
  @Column({ type: 'varchar', length: 120 }) name!: string;
  @Column({ type: 'varchar', length: 24, default: 'active' }) status!: string;

  @Column({ type: 'tinyint', width: 1, default: 0 }) dineInEnabled!: boolean;
  @Column({ type: 'tinyint', width: 1, default: 0 }) dineInSecureTableModeEnabled!: boolean;
  @Column({ type: 'varchar', length: 24, default: 'qrOnly' }) dineInVerificationMethod!: 'qrOnly' | 'qrPlusGeo';
  @Column({ type: 'int', default: 120 }) dineInGeoRadiusMeters!: number;
  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true }) locationLat!: string | null;
  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true }) locationLng!: string | null;
}
