import { Column, CreateDateColumn, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

@Entity({ name: 'prescription_request_item_drafts' })
export class PrescriptionRequestItemDraft {
  @PrimaryColumn('char', { length: 36 }) id!: string;
  @Column({ type: 'char', length: 36 }) prescriptionRequestId!: string;
  @Column({ type: 'char', length: 36 }) productId!: string;
  @Column({ type: 'char', length: 36 }) variantId!: string;
  @Column({ type: 'int' }) qty!: number;
  @Column({ type: 'varchar', length: 500, nullable: true }) note!: string | null;
  @CreateDateColumn({ type: 'datetime' }) createdAt!: Date;
  @UpdateDateColumn({ type: 'datetime' }) updatedAt!: Date;
}
