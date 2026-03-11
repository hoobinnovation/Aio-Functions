import { Column, CreateDateColumn, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

@Entity({ name: 'warehouses' })
export class Warehouse {
  @PrimaryColumn('char', { length: 36 }) id!: string;
  @Column({ type: 'varchar', length: 64 }) storeId!: string;
  @Column({ type: 'varchar', length: 100 }) name!: string;
  @Column({ type: 'varchar', length: 64, nullable: true }) code!: string | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) address!: string | null;
  @Column({ type: 'tinyint', width: 1, default: 1 }) isActive!: boolean;
  @Column({ type: 'tinyint', width: 1, default: 0 }) isDefault!: boolean;
  @CreateDateColumn({ type: 'datetime' }) createdAt!: Date;
  @UpdateDateColumn({ type: 'datetime' }) updatedAt!: Date;
}
