import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity({ name: 'media_assets' })
@Index('IDX_media_assets_store_owner', ['storeId', 'ownerType', 'ownerId'])
@Index('IDX_media_assets_status', ['status'])
@Index('IDX_media_assets_creator_created', ['createdByUid', 'createdAt'])
export class MediaAssetEntity {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ type: 'char', length: 36, nullable: true }) storeId!: string | null;
  @Column({ type: 'enum', enum: ['product', 'category', 'banner', 'homeSection', 'landing', 'user', 'insurance', 'other'] }) ownerType!: 'product'|'category'|'banner'|'homeSection'|'landing'|'user'|'insurance'|'other';
  @Column({ type: 'varchar', length: 128 }) ownerId!: string;
  @Column({ type: 'enum', enum: ['image', 'document'] }) kind!: 'image'|'document';
  @Column({ type: 'varchar', length: 500 }) originalPath!: string;
  @Column({ type: 'varchar', length: 500, nullable: true }) thumbnailPath!: string | null;
  @Column({ type: 'varchar', length: 191 }) contentType!: string;
  @Column({ type: 'bigint', default: 0 }) sizeBytes!: string;
  @Column({ type: 'int', nullable: true }) width!: number | null;
  @Column({ type: 'int', nullable: true }) height!: number | null;
  @Column({ type: 'int', nullable: true }) thumbWidth!: number | null;
  @Column({ type: 'int', nullable: true }) thumbHeight!: number | null;
  @Column({ type: 'enum', enum: ['created', 'uploaded', 'processing', 'ready', 'failed'], default: 'created' }) status!: 'created'|'uploaded'|'processing'|'ready'|'failed';
  @Column({ type: 'varchar', length: 128 }) createdByUid!: string;
  @CreateDateColumn() createdAt!: Date;
  @UpdateDateColumn() updatedAt!: Date;
}
