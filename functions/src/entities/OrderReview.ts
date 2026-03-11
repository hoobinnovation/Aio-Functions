import { Column, CreateDateColumn, Entity, PrimaryColumn } from 'typeorm';

@Entity({ name: 'order_reviews' })
export class OrderReview {
  @PrimaryColumn({ type: 'char', length: 36 }) id!: string;
  @Column({ type: 'varchar', length: 64 }) storeId!: string;
  @Column({ type: 'char', length: 36 }) orderId!: string;
  @Column({ type: 'char', length: 36, nullable: true }) productId!: string | null;
  @Column({ type: 'varchar', length: 128 }) uid!: string;
  @Column({ type: 'int' }) rating!: number;
  @Column({ type: 'varchar', length: 2000, nullable: true }) comment!: string | null;
  @Column({ type: 'char', length: 36, nullable: true }) branchId!: string | null;
  @Column({ type: 'varchar', length: 64, nullable: true }) tableId!: string | null;
  @Column({ type: 'varchar', length: 64, nullable: true }) dineInSessionId!: string | null;
  @CreateDateColumn({ type: 'datetime' }) createdAt!: Date;
}
