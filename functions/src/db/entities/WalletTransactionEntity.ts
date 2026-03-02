import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'wallet_transactions' })
@Index('IDX_wallet_transactions_uid_created', ['uid', 'createdAt'])
export class WalletTransactionEntity {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ type: 'char', length: 36 }) storeId!: string;
  @Column({ type: 'varchar', length: 128 }) uid!: string;
  @Column({ type: 'enum', enum: ['cashback_earn', 'cashback_redeem', 'expire', 'adjust'] }) type!: 'cashback_earn'|'cashback_redeem'|'expire'|'adjust';
  @Column({ type: 'decimal', precision: 12, scale: 2 }) amount!: string;
  @Column({ type: 'varchar', length: 191 }) reason!: string;
  @Column({ type: 'varchar', length: 30, nullable: true }) refType!: string | null;
  @Column({ type: 'varchar', length: 64, nullable: true }) refId!: string | null;
  @Column({ type: 'datetime', nullable: true }) expiresAt!: Date | null;
  @CreateDateColumn() createdAt!: Date;
}
