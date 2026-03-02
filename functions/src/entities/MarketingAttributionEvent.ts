import { Column, CreateDateColumn, Entity, PrimaryColumn } from 'typeorm';

@Entity({ name: 'marketing_attribution_events' })
export class MarketingAttributionEvent {
  @PrimaryColumn('char', { length: 36 }) id!: string;
  @Column({ type: 'varchar', length: 128 }) uid!: string;
  @Column({ type: 'varchar', length: 64, nullable: true }) storeId!: string | null;
  @Column({ type: 'varchar', length: 120, nullable: true }) source!: string | null;
  @Column({ type: 'varchar', length: 120, nullable: true }) campaign!: string | null;
  @Column({ type: 'varchar', length: 120, nullable: true }) medium!: string | null;
  @Column({ type: 'varchar', length: 120, nullable: true }) term!: string | null;
  @Column({ type: 'varchar', length: 120, nullable: true }) content!: string | null;
  @Column({ type: 'varchar', length: 80, nullable: true }) dedupeKey!: string | null;
  @CreateDateColumn({ type: 'datetime' }) createdAt!: Date;
}
