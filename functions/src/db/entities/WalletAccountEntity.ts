import { Column, Entity, Index, PrimaryGeneratedColumn, Unique } from 'typeorm';

@Entity({ name: 'wallet_accounts' })
@Unique('UQ_wallet_accounts_store_uid', ['storeId', 'uid'])
@Index('IDX_wallet_accounts_store', ['storeId'])
export class WalletAccountEntity {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ type: 'char', length: 36 }) storeId!: string;
  @Column({ type: 'varchar', length: 128 }) uid!: string;
  @Column({ type: 'decimal', precision: 12, scale: 2, default: '0.00' }) balance!: string;
}
