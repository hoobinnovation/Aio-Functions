import { Column, CreateDateColumn, Entity, PrimaryColumn } from 'typeorm';

@Entity({ name: 'alerts_subscriptions' })
export class AlertsSubscription {
  @PrimaryColumn('char', { length: 36 }) id!: string;
  @Column({ type: 'varchar', length: 128 }) uid!: string;
  @Column({ type: 'char', length: 36 }) productId!: string;
  @Column({ type: 'varchar', length: 40 }) type!: string;
  @CreateDateColumn({ type: 'datetime' }) createdAt!: Date;
}
