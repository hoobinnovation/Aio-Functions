import { Column, Entity, Index, PrimaryGeneratedColumn, Unique, UpdateDateColumn } from 'typeorm';

@Entity({ name: 'loyalty_accounts' })
@Unique('UQ_loyalty_accounts_store_uid', ['storeId', 'uid'])
@Index('IDX_loyalty_accounts_store', ['storeId'])
@Index('IDX_loyalty_accounts_uid', ['uid'])
export class LoyaltyAccountEntity {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ type: 'char', length: 36 }) storeId!: string;
  @Column({ type: 'varchar', length: 128 }) uid!: string;
  @Column({ type: 'int', default: 0 }) balance!: number;
  @Column({ type: 'char', length: 36, nullable: true }) tierId!: string | null;
  @UpdateDateColumn() updatedAt!: Date;
}
