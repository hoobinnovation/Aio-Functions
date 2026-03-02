import { Column, CreateDateColumn, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

@Entity({ name: 'categories' })
export class Category {
  @PrimaryColumn('char', { length: 36 }) id!: string;
  @Column({ type: 'varchar', length: 64 }) storeId!: string;
  @Column({ type: 'varchar', length: 120 }) name!: string;
  @Column({ type: 'varchar', length: 140 }) slug!: string;
  @Column({ type: 'char', length: 36, nullable: true }) parentId!: string | null;
  @Column({ type: 'int', default: 0 }) sortOrder!: number;
  @Column({ type: 'varchar', length: 24, default: 'active' }) status!: string;
  @CreateDateColumn({ type: 'datetime' }) createdAt!: Date;
  @UpdateDateColumn({ type: 'datetime' }) updatedAt!: Date;
}
