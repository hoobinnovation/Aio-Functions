import { Column, CreateDateColumn, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

@Entity({ name: 'dine_in_sessions' })
export class DineInSession {
  @PrimaryColumn({ type: 'varchar', length: 64 })
  id!: string;
  @Column({ type: 'varchar', length: 64 }) storeId!: string;
  @Column({ type: 'char', length: 36 }) branchId!: string;
  @Column({ type: 'varchar', length: 64 }) tableId!: string;
  @Column({ type: 'varchar', length: 32 }) tableNumberSnapshot!: string;
  @Column({ type: 'varchar', length: 128, nullable: true }) customerUid!: string | null;
  @Column({ type: 'varchar', length: 128, unique: true }) sessionToken!: string;
  @Column({ type: 'varchar', length: 16 }) sourceMode!: 'localOnly'|'hybrid'|'cloudOnly';
  @Column({ type: 'varchar', length: 16 }) verifiedBy!: 'local'|'cloud';
  @Column({ type: 'varchar', length: 16 }) verificationMethod!: 'qrOnly'|'qrPlusGeo';
  @Column({ type: 'datetime' }) verifiedAt!: Date;
  @Column({ type: 'datetime' }) expiresAt!: Date;
  @Column({ type: 'datetime' }) lastSeenAt!: Date;
  @Column({ type: 'varchar', length: 16, default: 'active' }) status!: 'active'|'closed'|'expired';
  @CreateDateColumn({ type: 'datetime' }) createdAt!: Date;
  @UpdateDateColumn({ type: 'datetime' }) updatedAt!: Date;
}
