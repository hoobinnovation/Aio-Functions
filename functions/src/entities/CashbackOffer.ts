import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity({ name: 'cashback_offers' })
export class CashbackOffer {
  @PrimaryColumn('char', { length: 36 }) id!: string;
  @Column({ type: 'varchar', length: 64 }) storeId!: string;
  @Column({ type: 'varchar', length: 120 }) name!: string;
  @Column({ type: 'int' }) percent!: number;
  @Column({ type: 'json', nullable: true }) rules!: any;
  @Column({ type: 'varchar', length: 24, default: 'active' }) status!: string;
}
