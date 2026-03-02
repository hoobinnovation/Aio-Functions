import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, Unique } from 'typeorm';

@Entity({ name: 'notification_tokens' })
@Unique('UQ_notification_tokens_token', ['token'])
@Index('IDX_notification_tokens_store', ['storeId'])
@Index('IDX_notification_tokens_uid', ['uid'])
export class NotificationTokenEntity {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ type: 'char', length: 36 }) storeId!: string;
  @Column({ type: 'varchar', length: 128 }) uid!: string;
  @Column({ type: 'varchar', length: 255 }) token!: string;
  @Column({ type: 'varchar', length: 30 }) platform!: string;
  @Column({ type: 'json', nullable: true }) deviceInfo!: Record<string, unknown> | null;
  @Column({ type: 'datetime' }) lastSeenAt!: Date;
  @CreateDateColumn() createdAt!: Date;
}
