import { Column, CreateDateColumn, Entity, PrimaryColumn } from 'typeorm';

@Entity({ name: 'prescription_request_status_events' })
export class PrescriptionRequestStatusEvent {
  @PrimaryColumn('char', { length: 36 }) id!: string;
  @Column({ type: 'char', length: 36 }) prescriptionRequestId!: string;
  @Column({ type: 'varchar', length: 32, nullable: true }) fromStatus!: string | null;
  @Column({ type: 'varchar', length: 32 }) toStatus!: string;
  @Column({ type: 'varchar', length: 24 }) actorType!: string;
  @Column({ type: 'varchar', length: 128, nullable: true }) actorId!: string | null;
  @Column({ type: 'varchar', length: 500, nullable: true }) note!: string | null;
  @CreateDateColumn({ type: 'datetime' }) createdAt!: Date;
}
