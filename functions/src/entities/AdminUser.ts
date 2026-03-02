import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity({ name: 'admin_users' })
export class AdminUser {
  @PrimaryColumn({ type: 'varchar', length: 128 })
  uid!: string;

  @Column({ type: 'varchar', length: 32 })
  status!: string;
}
