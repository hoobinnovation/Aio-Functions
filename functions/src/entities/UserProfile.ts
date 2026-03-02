import { Column, CreateDateColumn, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

@Entity({ name: 'user_profiles' })
export class UserProfile {
  @PrimaryColumn({ type: 'varchar', length: 128 })
  uid!: string;

  @Column({ type: 'varchar', length: 32, nullable: true })
  phone!: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  email!: string | null;

  @Column({ type: 'varchar', length: 80, nullable: true })
  displayName!: string | null;

  @Column({ type: 'varchar', length: 10, nullable: true })
  locale!: string | null;

  @Column({ type: 'tinyint', width: 1, default: 0 })
  marketingOptIn!: boolean;

  @Column({ type: 'varchar', length: 24, default: 'active' })
  status!: string;

  @Column({ type: 'varchar', length: 300, nullable: true })
  disabledReason!: string | null;

  @Column({ type: 'datetime', nullable: true })
  disabledAt!: Date | null;

  @Column({ type: 'varchar', length: 128, nullable: true })
  disabledByUid!: string | null;

  @CreateDateColumn({ type: 'datetime' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'datetime' })
  updatedAt!: Date;
}
