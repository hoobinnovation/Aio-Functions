import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity({ name: 'cashback_campaigns' })
@Index('IDX_cashback_campaigns_store', ['storeId'])
export class CashbackCampaignEntity {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ type: 'char', length: 36 }) storeId!: string;
  @Column({ type: 'varchar', length: 191 }) name!: string;
  @Column({ type: 'enum', enum: ['threshold', 'products', 'categories'] }) type!: 'threshold'|'products'|'categories';
  @Column({ type: 'enum', enum: ['fixed', 'percent'] }) rewardType!: 'fixed'|'percent';
  @Column({ type: 'decimal', precision: 10, scale: 2 }) value!: string;
  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true }) minSubtotal!: string | null;
  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true }) maxReward!: string | null;
  @Column({ type: 'json', nullable: true }) targetJson!: Record<string, unknown> | null;
  @Column({ type: 'datetime', nullable: true }) startAt!: Date | null;
  @Column({ type: 'datetime', nullable: true }) endAt!: Date | null;
  @Column({ type: 'int', nullable: true }) usageLimitTotal!: number | null;
  @Column({ type: 'int', nullable: true }) usageLimitPerUser!: number | null;
  @Column({ type: 'int', default: 0 }) usedCount!: number;
  @Column({ type: 'tinyint', default: true }) isActive!: boolean;
  @CreateDateColumn() createdAt!: Date;
  @UpdateDateColumn() updatedAt!: Date;
}
