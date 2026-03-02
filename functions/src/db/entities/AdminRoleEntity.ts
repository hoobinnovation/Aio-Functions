import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { AdminUserEntity } from './AdminUserEntity';

@Entity({ name: 'admin_roles' })
export class AdminRoleEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 128 })
  adminUid!: string;

  @Column({ type: 'varchar', length: 64 })
  role!: string;

  @CreateDateColumn()
  createdAt!: Date;

  @ManyToOne(() => AdminUserEntity, (admin) => admin.roles)
  @JoinColumn({ name: 'adminUid', referencedColumnName: 'uid' })
  admin!: AdminUserEntity;
}
