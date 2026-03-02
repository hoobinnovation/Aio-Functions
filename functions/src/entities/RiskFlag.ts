import { Column, Entity, PrimaryColumn } from 'typeorm';
@Entity({ name: 'risk_flags' })
export class RiskFlag {
  @PrimaryColumn('char', { length: 36 }) id!: string;
  @Column({ type: 'char', length: 36 }) orderId!: string;
  @Column({ type: 'varchar', length: 24 }) status!: string;
  @Column({ type: 'varchar', length: 300 }) reason!: string;
  @Column({ type: 'varchar', length: 128, nullable: true }) resolvedByUid!: string | null;
  @Column({ type: 'datetime', nullable: true }) resolvedAt!: Date | null;
}
