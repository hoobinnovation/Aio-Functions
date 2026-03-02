import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity({ name: 'marketing_touchpoints' })
@Index('IDX_marketing_touchpoints_store_session', ['storeId', 'sessionId'], { unique: true })
export class MarketingTouchpointEntity {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ type: 'char', length: 36 }) storeId!: string;
  @Column({ type: 'varchar', length: 128, nullable: true }) uid!: string | null;
  @Column({ type: 'varchar', length: 128 }) sessionId!: string;
  @Column({ type: 'varchar', length: 191, nullable: true }) deviceIdHash!: string | null;
  @Column({ type: 'json', nullable: true }) firstTouchJson!: Record<string, unknown> | null;
  @Column({ type: 'json', nullable: true }) lastTouchJson!: Record<string, unknown> | null;
  @CreateDateColumn() createdAt!: Date;
  @UpdateDateColumn() updatedAt!: Date;
}
