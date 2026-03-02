import { Column, CreateDateColumn, Entity, PrimaryColumn } from 'typeorm';

@Entity({ name: 'notification_tokens' })
export class NotificationToken {
  @PrimaryColumn('char', { length: 36 }) id!: string;
  @Column({ type: 'varchar', length: 128 }) uid!: string;
  @Column({ type: 'varchar', length: 255 }) token!: string;
  @Column({ type: 'varchar', length: 40, nullable: true }) platform!: string | null;
  @CreateDateColumn({ type: 'datetime' }) createdAt!: Date;
}
