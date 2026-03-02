import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'cashback_redemptions' })
@Index('IDX_cashback_redemptions_campaign_uid', ['campaignId', 'uid'])
export class CashbackRedemptionEntity {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ type: 'char', length: 36 }) storeId!: string;
  @Column({ type: 'char', length: 36 }) campaignId!: string;
  @Column({ type: 'varchar', length: 128 }) uid!: string;
  @Column({ type: 'char', length: 36 }) orderId!: string;
  @CreateDateColumn() createdAt!: Date;
}
