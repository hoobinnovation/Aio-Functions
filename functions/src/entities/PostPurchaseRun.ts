import { Column, CreateDateColumn, Entity, PrimaryColumn } from 'typeorm';

@Entity({ name: 'post_purchase_runs' })
export class PostPurchaseRun {
  @PrimaryColumn('char', { length: 36 }) id!: string;
  @Column({ type: 'char', length: 36 }) flowId!: string;
  @Column({ type: 'varchar', length: 128 }) uid!: string;
  @Column({ type: 'varchar', length: 24 }) status!: string;
  @CreateDateColumn({ type: 'datetime' }) createdAt!: Date;
}
