import { Column, CreateDateColumn, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

@Entity({ name: 'auth_phone_password_credentials' })
export class AuthPhonePasswordCredential {
  @PrimaryColumn('char', { length: 36 }) id!: string;
  @Column({ type: 'varchar', length: 128, unique: true }) uid!: string;
  @Column({ type: 'varchar', length: 32, unique: true }) phoneNormalized!: string;
  @Column({ type: 'varchar', length: 32, nullable: true }) phoneDisplay!: string | null;
  @Column({ type: 'varchar', length: 255 }) passwordHash!: string;
  @Column({ type: 'varchar', length: 64 }) passwordSalt!: string;
  @Column({ type: 'varchar', length: 24, default: 'active' }) status!: string;
  @CreateDateColumn({ type: 'datetime' }) createdAt!: Date;
  @UpdateDateColumn({ type: 'datetime' }) updatedAt!: Date;
}
