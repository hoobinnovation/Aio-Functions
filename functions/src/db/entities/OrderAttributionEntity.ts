import { Column, Entity, Index, PrimaryColumn } from 'typeorm';

@Entity({ name: 'order_attribution' })
@Index('IDX_order_attribution_store', ['storeId'])
export class OrderAttributionEntity {
  @PrimaryColumn({ type: 'char', length: 36 }) orderId!: string;
  @Column({ type: 'char', length: 36 }) storeId!: string;
  @Column({ type: 'char', length: 36, nullable: true }) insuranceOrderId!: string | null;
  @Column({ type: 'json', nullable: true }) firstTouchJson!: Record<string, unknown> | null;
  @Column({ type: 'json', nullable: true }) lastTouchJson!: Record<string, unknown> | null;
}
