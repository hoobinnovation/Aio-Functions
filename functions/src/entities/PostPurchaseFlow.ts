import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity({ name: 'post_purchase_flows' })
export class PostPurchaseFlow {
  @PrimaryColumn('char', { length: 36 }) id!: string;
  @Column({ type: 'varchar', length: 64 }) storeId!: string;
  @Column({ type: 'varchar', length: 120 }) name!: string;
  @Column({ type: 'json' }) config!: any;
  @Column({ type: 'varchar', length: 24, default: 'active' }) status!: string;
}
