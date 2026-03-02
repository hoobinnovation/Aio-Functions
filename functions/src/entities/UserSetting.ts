import { Column, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

@Entity({ name: 'user_settings' })
export class UserSetting {
  @PrimaryColumn({ type: 'varchar', length: 128 }) uid!: string;
  @Column({ type: 'json', nullable: true }) config!: any;
  @UpdateDateColumn({ type: 'datetime' }) updatedAt!: Date;
}
