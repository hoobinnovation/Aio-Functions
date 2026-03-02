import { Column, CreateDateColumn, Entity, PrimaryColumn } from 'typeorm';
@Entity({ name: 'tracking_events' })
export class TrackingEvent {
  @PrimaryColumn('char', { length: 36 }) id!: string;
  @Column({ type: 'char', length: 36 }) shipmentId!: string;
  @Column({ type: 'varchar', length: 255 }) message!: string;
  @Column({ type: 'varchar', length: 120, nullable: true }) location!: string | null;
  @CreateDateColumn({ type: 'datetime' }) createdAt!: Date;
}
