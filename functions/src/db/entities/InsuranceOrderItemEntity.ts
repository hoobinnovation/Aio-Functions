import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity({ name: 'insurance_order_items' })
@Index('IDX_insurance_order_items_order', ['insuranceOrderId'])
export class InsuranceOrderItemEntity {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ type: 'char', length: 36 }) insuranceOrderId!: string;
  @Column({ type: 'char', length: 36 }) storeId!: string;
  @Column({ type: 'char', length: 36 }) productId!: string;
  @Column({ type: 'varchar', length: 191 }) nameSnapshot!: string;
  @Column({ type: 'int' }) qty!: number;
  @Column({ type: 'decimal', precision: 10, scale: 2 }) unitPriceCustomer!: string;
  @Column({ type: 'decimal', precision: 10, scale: 2 }) lineTotal!: string;
  @CreateDateColumn() createdAt!: Date;
  @UpdateDateColumn() updatedAt!: Date;
}
