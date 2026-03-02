import { Column, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

@Entity({ name: 'wallet_accounts' })
export class WalletAccount {
  @PrimaryColumn({ type: 'varchar', length: 128 }) uid!: string;
  @Column({ type: 'bigint', default: 0 }) balanceCents!: string;
  @UpdateDateColumn({ type: 'datetime' }) updatedAt!: Date;
}
