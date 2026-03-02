import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity({ name: 'user_addresses' })
@Index('IDX_user_addresses_uid_store', ['uid', 'storeId'])
export class UserAddressEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 128 })
  uid!: string;

  @Column({ type: 'char', length: 36 })
  storeId!: string;

  @Column({ type: 'varchar', length: 191 })
  line1!: string;

  @Column({ type: 'varchar', length: 191, nullable: true })
  line2!: string | null;

  @Column({ type: 'varchar', length: 120 })
  city!: string;

  @Column({ type: 'varchar', length: 120 })
  area!: string;

  @Column({ type: 'varchar', length: 120, nullable: true })
  governorate!: string | null;

  @Column({ type: 'decimal', precision: 9, scale: 6, nullable: true })
  lat!: string | null;

  @Column({ type: 'decimal', precision: 9, scale: 6, nullable: true })
  lng!: string | null;

  @Column({ type: 'varchar', length: 30 })
  postalCode!: string;

  @Column({ type: 'varchar', length: 2 })
  countryCode!: string;

  @Column({ type: 'varchar', length: 32, nullable: true })
  phone!: string | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
