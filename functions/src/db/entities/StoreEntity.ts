import { Column, CreateDateColumn, Entity, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { AdminStoreAccessEntity } from './AdminStoreAccessEntity';

@Entity({ name: 'stores' })
export class StoreEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 191 })
  name!: string;

  @Column({ type: 'varchar', length: 120 })
  city!: string;

  @Column({ type: 'varchar', length: 120 })
  area!: string;

  @Column({ type: 'varchar', length: 255 })
  addressShort!: string;

  @Column({ type: 'varchar', length: 32, nullable: true })
  phone!: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  logoUrl!: string | null;

  @Column({ type: 'json', nullable: true })
  openingHours!: Record<string, unknown> | null;

  @Column({ type: 'tinyint', default: true })
  isOpen!: boolean;

  @Column({ type: 'tinyint', default: false })
  isDisabled!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @OneToMany(() => AdminStoreAccessEntity, (access) => access.store)
  adminStoreAccesses!: AdminStoreAccessEntity[];
}
