import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'notifications' })
@Index('IDX_notifications_store', ['storeId'])
@Index('IDX_notifications_uid_read_created', ['uid', 'isRead', 'createdAt'])
export class NotificationEntity {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ type: 'char', length: 36 }) storeId!: string;
  @Column({ type: 'varchar', length: 128 }) uid!: string;
  @Column({ type: 'enum', enum: ['order', 'payment', 'shipping', 'offer', 'system'] }) type!: 'order'|'payment'|'shipping'|'offer'|'system';
  @Column({ type: 'varchar', length: 191 }) title!: string;
  @Column({ type: 'varchar', length: 500 }) body!: string;
  @Column({ type: 'varchar', length: 64, nullable: true }) deepLinkType!: string | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) deepLinkValue!: string | null;
  @Column({ type: 'tinyint', default: false }) isRead!: boolean;
  @CreateDateColumn() createdAt!: Date;
}
