import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity({ name: 'pos_orders' })
@Index('IDX_pos_orders_store', ['storeId'])
export class PosOrderEntity {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ type: 'char', length: 36 }) storeId!: string;
  @Column({ type: 'char', length: 36 }) branchId!: string;
  @Column({ type: 'char', length: 36 }) deviceId!: string;
  @Column({ type: 'char', length: 36 }) employeeId!: string;
  @Column({ type: 'json' }) itemsSnapshot!: Array<{ productId: string; qty: number; unitPrice: number; lineTotal: number }>;
  @Column({ type: 'enum', enum: ['cash', 'card', 'online', 'wallet'] }) paymentMethod!: 'cash'|'card'|'online'|'wallet';
  @Column({ type: 'char', length: 36, nullable: true }) cashSessionId!: string | null;
  @Column({ type: 'decimal', precision: 12, scale: 2 }) subtotal!: string;
  @Column({ type: 'decimal', precision: 12, scale: 2 }) total!: string;
  @CreateDateColumn() createdAt!: Date;
  @UpdateDateColumn() updatedAt!: Date;
}
