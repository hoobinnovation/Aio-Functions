import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'admin_roles' })
export class AdminRole {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', length: 128 })
  adminUid!: string;

  @Column({ type: 'varchar', length: 64 })
  role!: string;
}
