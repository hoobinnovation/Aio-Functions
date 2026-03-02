import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'notification_campaigns' })
@Index('IDX_notification_campaigns_store', ['storeId'])
@Index('IDX_notification_campaigns_schedule', ['status', 'scheduledAt'])
export class NotificationCampaignEntity {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ type: 'char', length: 36 }) storeId!: string;
  @Column({ type: 'varchar', length: 128 }) createdByAdminUid!: string;
  @Column({ type: 'varchar', length: 191 }) title!: string;
  @Column({ type: 'varchar', length: 500 }) body!: string;
  @Column({ type: 'enum', enum: ['all', 'segment', 'user'] }) targetType!: 'all'|'segment'|'user';
  @Column({ type: 'json' }) targetSpec!: Record<string, unknown>;
  @Column({ type: 'varchar', length: 64, nullable: true }) deepLinkType!: string | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) deepLinkValue!: string | null;
  @Column({ type: 'datetime', nullable: true }) scheduledAt!: Date | null;
  @Column({ type: 'enum', enum: ['queued', 'sent', 'failed', 'partial'], default: 'queued' }) status!: 'queued'|'sent'|'failed'|'partial';
  @Column({ type: 'int', default: 0 }) sentCount!: number;
  @Column({ type: 'int', default: 0 }) failedCount!: number;
  @CreateDateColumn() createdAt!: Date;
}
