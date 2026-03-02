import { Column, CreateDateColumn, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

@Entity({ name: 'seo_settings' })
export class SeoSetting {
  @PrimaryColumn('char', { length: 36 }) id!: string;
  @Column({ type: 'varchar', length: 64 }) storeId!: string;
  @Column({ type: 'varchar', length: 40 }) pageType!: string;
  @Column({ type: 'varchar', length: 200 }) pageKey!: string;
  @Column({ type: 'varchar', length: 160, nullable: true }) title!: string | null;
  @Column({ type: 'varchar', length: 320, nullable: true }) description!: string | null;
  @Column({ type: 'json', nullable: true }) extra!: any;
  @CreateDateColumn({ type: 'datetime' }) createdAt!: Date;
  @UpdateDateColumn({ type: 'datetime' }) updatedAt!: Date;
}
