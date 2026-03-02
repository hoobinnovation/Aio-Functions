import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity({ name: 'discount_campaigns' })
@Index('IDX_discount_campaigns_store', ['storeId'])
@Index('IDX_discount_campaigns_active_priority', ['storeId', 'isActive', 'priority'])
export class DiscountCampaignEntity {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ type: 'char', length: 36 }) storeId!: string;
  @Column({ type: 'varchar', length: 191 }) name!: string;
  @Column({ type: 'tinyint', default: true }) isActive!: boolean;
  @Column({ type: 'int', default: 0 }) priority!: number;
  @Column({ type: 'datetime', nullable: true }) startAt!: Date | null;
  @Column({ type: 'datetime', nullable: true }) endAt!: Date | null;
  @Column({ type: 'json' }) audienceJson!: Record<string, unknown>;
  @Column({ type: 'json' }) appliesToJson!: Record<string, unknown>;
  @Column({ type: 'enum', enum: ['percent', 'fixed'] }) discountType!: 'percent'|'fixed';
  @Column({ type: 'decimal', precision: 10, scale: 2 }) value!: string;
  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true }) maxDiscount!: string | null;
  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true }) minSubtotal!: string | null;
  @CreateDateColumn() createdAt!: Date;
  @UpdateDateColumn() updatedAt!: Date;
}
