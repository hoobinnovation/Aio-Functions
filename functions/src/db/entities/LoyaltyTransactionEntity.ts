import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'loyalty_transactions' })
@Index('IDX_loyalty_transactions_store', ['storeId'])
@Index('IDX_loyalty_transactions_uid_created', ['uid', 'createdAt'])
@Index('IDX_loyalty_transactions_expires', ['expiresAt'])
export class LoyaltyTransactionEntity {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ type: 'char', length: 36 }) storeId!: string;
  @Column({ type: 'varchar', length: 128 }) uid!: string;
  @Column({ type: 'enum', enum: ['earn', 'redeem', 'expire', 'adjust'] }) type!: 'earn'|'redeem'|'expire'|'adjust';
  @Column({ type: 'int' }) points!: number;
  @Column({ type: 'varchar', length: 191 }) reason!: string;
  @Column({ type: 'varchar', length: 30, nullable: true }) refType!: string | null;
  @Column({ type: 'varchar', length: 64, nullable: true }) refId!: string | null;
  @Column({ type: 'datetime', nullable: true }) expiresAt!: Date | null;
  @CreateDateColumn() createdAt!: Date;
}
