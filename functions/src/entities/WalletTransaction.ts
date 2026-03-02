import { Column, CreateDateColumn, Entity, PrimaryColumn } from 'typeorm';

@Entity({ name: 'wallet_transactions' })
export class WalletTransaction {
  @PrimaryColumn('char', { length: 36 }) id!: string;
  @Column({ type: 'varchar', length: 128 }) uid!: string;
  @Column({ type: 'bigint' }) amountCents!: string;
  @Column({ type: 'varchar', length: 40 }) type!: string;
  @Column({ type: 'varchar', length: 255, nullable: true }) note!: string | null;
  @CreateDateColumn({ type: 'datetime' }) createdAt!: Date;
}
