import { Column, CreateDateColumn, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

@Entity({ name: 'legal_docs' })
export class LegalDoc {
  @PrimaryColumn('char', { length: 36 }) id!: string;
  @Column({ type: 'varchar', length: 64 }) storeId!: string;
  @Column({ type: 'varchar', length: 40 }) docType!: string;
  @Column({ type: 'varchar', length: 32 }) version!: string;
  @Column({ type: 'text' }) content!: string;
  @Column({ type: 'varchar', length: 24, default: 'active' }) status!: string;
  @CreateDateColumn({ type: 'datetime' }) createdAt!: Date;
  @UpdateDateColumn({ type: 'datetime' }) updatedAt!: Date;
}
