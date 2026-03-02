import { Column, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';
@Entity({ name: 'risk_rules' })
export class RiskRule {
  @PrimaryColumn({ type: 'varchar', length: 64 }) storeId!: string;
  @Column({ type: 'json' }) config!: any;
  @UpdateDateColumn({ type: 'datetime' }) updatedAt!: Date;
}
