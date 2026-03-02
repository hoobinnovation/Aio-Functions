import { Column, CreateDateColumn, Entity, PrimaryColumn } from 'typeorm';

@Entity({ name: 'sitemap_runs' })
export class SitemapRun {
  @PrimaryColumn('char', { length: 36 }) id!: string;
  @Column({ type: 'varchar', length: 64 }) storeId!: string;
  @Column({ type: 'varchar', length: 24 }) status!: string;
  @Column({ type: 'int', default: 0 }) urlsCount!: number;
  @CreateDateColumn({ type: 'datetime' }) createdAt!: Date;
}
