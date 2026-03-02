import { Column, CreateDateColumn, Entity, Index, PrimaryColumn, UpdateDateColumn } from 'typeorm';

@Entity({ name: 'user_addresses' })
@Index('idx_user_addresses_uid', ['uid'])
@Index('idx_user_addresses_uid_default', ['uid', 'isDefault'])
@Index('idx_user_addresses_uid_updated', ['uid', 'updatedAt'])
export class UserAddress {
  @PrimaryColumn('char', { length: 36 })
  id!: string;

  @Column({ type: 'varchar', length: 128 })
  uid!: string;

  @Column({ type: 'varchar', length: 40 })
  label!: string;

  @Column({ type: 'varchar', length: 80 })
  recipientName!: string;

  @Column({ type: 'varchar', length: 32, nullable: true })
  phone!: string | null;

  @Column({ type: 'varchar', length: 80 })
  governorate!: string;

  @Column({ type: 'varchar', length: 80 })
  city!: string;

  @Column({ type: 'varchar', length: 120, nullable: true })
  area!: string | null;

  @Column({ type: 'varchar', length: 160 })
  street!: string;

  @Column({ type: 'varchar', length: 60, nullable: true })
  building!: string | null;

  @Column({ type: 'varchar', length: 30, nullable: true })
  floor!: string | null;

  @Column({ type: 'varchar', length: 30, nullable: true })
  apartment!: string | null;

  @Column({ type: 'varchar', length: 160, nullable: true })
  landmark!: string | null;

  @Column({ type: 'decimal', precision: 10, scale: 7 })
  lat!: string;

  @Column({ type: 'decimal', precision: 10, scale: 7 })
  lng!: string;

  @Column({ type: 'varchar', length: 300, nullable: true })
  notes!: string | null;

  @Column({ type: 'tinyint', width: 1, default: 0 })
  isDefault!: boolean;

  @CreateDateColumn({ type: 'datetime' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'datetime' })
  updatedAt!: Date;
}
