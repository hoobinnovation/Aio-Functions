import { Column, Entity, OneToMany, PrimaryColumn } from 'typeorm';
import { AdminRoleEntity } from './AdminRoleEntity';
import { AdminStoreAccessEntity } from './AdminStoreAccessEntity';

@Entity({ name: 'admin_users' })
export class AdminUserEntity {
  @PrimaryColumn({ type: 'varchar', length: 128 })
  uid!: string;

  @Column({ type: 'varchar', length: 20, default: 'active' })
  status!: 'active' | 'disabled';

  @OneToMany(() => AdminRoleEntity, (role) => role.admin)
  roles!: AdminRoleEntity[];

  @OneToMany(() => AdminStoreAccessEntity, (access) => access.admin)
  storeAccesses!: AdminStoreAccessEntity[];
}
