import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'admin_store_access' })
export class AdminStoreAccess {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', length: 128 })
  adminUid!: string;

  @Column({ type: 'varchar', length: 64 })
  storeId!: string;
}
