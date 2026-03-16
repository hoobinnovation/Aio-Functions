import { Column, CreateDateColumn, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

@Entity({ name: 'prescription_requests' })
export class PrescriptionRequest {
  @PrimaryColumn('char', { length: 36 }) id!: string;
  @Column({ type: 'varchar', length: 64 }) storeId!: string;
  @Column({ type: 'varchar', length: 128 }) userId!: string;
  @Column({ type: 'varchar', length: 120, nullable: true }) customerName!: string | null;
  @Column({ type: 'varchar', length: 32, nullable: true }) customerPhone!: string | null;
  @Column({ type: 'varchar', length: 32, nullable: true }) customerWhatsAppPhone!: string | null;
  @Column({ type: 'text', nullable: true }) notes!: string | null;
  @Column({ type: 'varchar', length: 32 }) status!: string;
  @Column({ type: 'varchar', length: 300, nullable: true }) statusMessage!: string | null;
  @Column({ type: 'varchar', length: 500, nullable: true }) rejectionReason!: string | null;
  @Column({ type: 'varchar', length: 500, nullable: true }) reviewNotes!: string | null;
  @Column({ type: 'char', length: 36, nullable: true }) linkedOrderId!: string | null;
  @Column({ type: 'varchar', length: 128, nullable: true }) reviewedByAdminId!: string | null;
  @Column({ type: 'datetime', nullable: true }) reviewedAt!: Date | null;
  @Column({ type: 'datetime', nullable: true }) submittedAt!: Date | null;
  @CreateDateColumn({ type: 'datetime' }) createdAt!: Date;
  @UpdateDateColumn({ type: 'datetime' }) updatedAt!: Date;
}
