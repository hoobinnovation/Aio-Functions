import { Column, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';
@Entity({ name: 'shipments' })
export class Shipment {
  @PrimaryColumn('char', { length: 36 }) id!: string;
  @Column({ type: 'char', length: 36 }) orderId!: string;
  @Column({ type: 'varchar', length: 80, nullable: true }) carrier!: string | null;
  @Column({ type: 'varchar', length: 120, nullable: true }) trackingNumber!: string | null;
  @Column({ type: 'varchar', length: 24, default: 'pending' }) status!: string;
  @UpdateDateColumn({ type: 'datetime' }) updatedAt!: Date;
}
