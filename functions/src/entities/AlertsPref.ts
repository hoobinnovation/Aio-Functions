import { Column, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

@Entity({ name: 'alerts_prefs' })
export class AlertsPref {
  @PrimaryColumn({ type: 'varchar', length: 128 }) uid!: string;
  @Column({ type: 'tinyint', width: 1, default: 1 }) backInStock!: boolean;
  @Column({ type: 'tinyint', width: 1, default: 1 }) priceDrop!: boolean;
  @UpdateDateColumn({ type: 'datetime' }) updatedAt!: Date;
}
