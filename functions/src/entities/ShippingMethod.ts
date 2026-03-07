import { Column, CreateDateColumn, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

@Entity({ name: 'shipping_methods' })
export class ShippingMethod {
    @PrimaryColumn('char', { length: 36 }) id!: string;
    @Column({ type: 'varchar', length: 64 }) storeId!: string;
    @Column({ type: 'varchar', length: 80 }) name!: string;
    @Column({ type: 'bigint' }) basePriceCents!: string;
    @Column({ type: 'varchar', length: 24, default: 'active' }) status!: string;
    @CreateDateColumn({ type: 'datetime' }) createdAt!: Date;
    @UpdateDateColumn({ type: 'datetime' }) updatedAt!: Date;
}