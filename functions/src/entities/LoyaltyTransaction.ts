import { Column, CreateDateColumn, Entity, PrimaryColumn } from 'typeorm';

@Entity({ name: 'loyalty_transactions' })
export class LoyaltyTransaction {
  @PrimaryColumn('char', { length: 36 }) id!: string;
  @Column({ type: 'varchar', length: 128 }) uid!: string;
  @Column({ type: 'varchar', length: 64 }) storeId!: string;
  @Column({ type: 'int' }) pointsDelta!: number;
  @Column({ type: 'varchar', length: 40 }) type!: string;
  @CreateDateColumn({ type: 'datetime' }) createdAt!: Date;
}
