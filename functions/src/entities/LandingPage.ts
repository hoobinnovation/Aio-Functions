import { Column, CreateDateColumn, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

@Entity({ name: 'landing_pages' })
export class LandingPage {
  @PrimaryColumn('char', { length: 36 }) id!: string;
  @Column({ type: 'varchar', length: 64 }) storeId!: string;
  @Column({ type: 'varchar', length: 160 }) slug!: string;
  @Column({ type: 'varchar', length: 180 }) title!: string;
  @Column({ type: 'json' }) body!: any;
  @Column({ type: 'varchar', length: 24, default: 'draft' }) status!: string;
  @CreateDateColumn({ type: 'datetime' }) createdAt!: Date;
  @UpdateDateColumn({ type: 'datetime' }) updatedAt!: Date;
}
