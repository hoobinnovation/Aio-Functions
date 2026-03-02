import { Column, CreateDateColumn, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

@Entity({ name: 'home_sections' })
export class HomeSection {
  @PrimaryColumn('char', { length: 36 }) id!: string;
  @Column({ type: 'varchar', length: 64 }) storeId!: string;
  @Column({ type: 'varchar', length: 40 }) type!: string;
  @Column({ type: 'json', nullable: true }) config!: any;
  @Column({ type: 'int', default: 0 }) sortOrder!: number;
  @Column({ type: 'tinyint', width: 1, default: 1 }) enabled!: boolean;
  @CreateDateColumn({ type: 'datetime' }) createdAt!: Date;
  @UpdateDateColumn({ type: 'datetime' }) updatedAt!: Date;
}
