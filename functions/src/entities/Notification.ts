import { Column, CreateDateColumn, Entity, PrimaryColumn } from 'typeorm';

@Entity({ name: 'notifications' })
export class Notification {
  @PrimaryColumn('char', { length: 36 }) id!: string;
  @Column({ type: 'varchar', length: 128 }) uid!: string;
  @Column({ type: 'varchar', length: 160 }) title!: string;
  @Column({ type: 'varchar', length: 500 }) body!: string;
  @Column({ type: 'tinyint', width: 1, default: 0 }) isRead!: boolean;
  @CreateDateColumn({ type: 'datetime' }) createdAt!: Date;
}
