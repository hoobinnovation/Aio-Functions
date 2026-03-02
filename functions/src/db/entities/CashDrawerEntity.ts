import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity({ name: 'cash_drawers' })
@Index('IDX_cash_drawers_store', ['storeId'])
export class CashDrawerEntity {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ type: 'char', length: 36 }) storeId!: string;
  @Column({ type: 'char', length: 36 }) branchId!: string;
  @Column({ type: 'varchar', length: 120 }) name!: string;
  @Column({ type: 'tinyint', default: true }) isActive!: boolean;
  @CreateDateColumn() createdAt!: Date;
  @UpdateDateColumn() updatedAt!: Date;
}
