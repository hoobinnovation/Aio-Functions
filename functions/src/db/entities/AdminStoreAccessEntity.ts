import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, Unique } from 'typeorm';
import { AdminUserEntity } from './AdminUserEntity';
import { StoreEntity } from './StoreEntity';

@Entity({ name: 'admin_store_access' })
@Unique('UQ_admin_store_access_admin_store', ['adminUid', 'storeId'])
export class AdminStoreAccessEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 128 })
  adminUid!: string;

  @Column({ type: 'char', length: 36 })
  storeId!: string;

  @CreateDateColumn()
  createdAt!: Date;

  @ManyToOne(() => AdminUserEntity, (admin) => admin.storeAccesses)
  @JoinColumn({ name: 'adminUid', referencedColumnName: 'uid' })
  admin!: AdminUserEntity;

  @ManyToOne(() => StoreEntity, (store) => store.adminStoreAccesses)
  @JoinColumn({ name: 'storeId' })
  store!: StoreEntity;
}
