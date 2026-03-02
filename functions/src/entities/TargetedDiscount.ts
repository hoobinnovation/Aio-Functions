import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity({ name: 'targeted_discounts' })
export class TargetedDiscount {
  @PrimaryColumn('char', { length: 36 }) id!: string;
  @Column({ type: 'varchar', length: 64 }) storeId!: string;
  @Column({ type: 'varchar', length: 120 }) name!: string;
  @Column({ type: 'json' }) rules!: any;
  @Column({ type: 'varchar', length: 24, default: 'active' }) status!: string;
}
