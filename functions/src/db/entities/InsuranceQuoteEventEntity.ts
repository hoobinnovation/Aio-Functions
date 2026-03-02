import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'insurance_quote_events' })
@Index('IDX_insurance_quote_events_order', ['insuranceOrderId'])
export class InsuranceQuoteEventEntity {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ type: 'char', length: 36 }) insuranceOrderId!: string;
  @Column({ type: 'enum', enum: ['user', 'admin', 'system'] }) actorType!: 'user'|'admin'|'system';
  @Column({ type: 'varchar', length: 128, nullable: true }) actorUid!: string | null;
  @Column({ type: 'varchar', length: 120 }) action!: string;
  @Column({ type: 'json', nullable: true }) payload!: Record<string, unknown> | null;
  @CreateDateColumn() createdAt!: Date;
}
