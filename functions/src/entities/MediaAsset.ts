import { Column, CreateDateColumn, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

export type MediaKind = 'image' | 'document';
export type MediaStatus = 'created' | 'uploaded' | 'processing' | 'ready' | 'failed';

@Entity({ name: 'media_assets' })
export class MediaAsset {
  @PrimaryColumn({ type: 'char', length: 36 })
  id!: string;

  @Column({ type: 'varchar', length: 64, nullable: true })
  storeId!: string | null;

  @Column({ type: 'varchar', length: 64 })
  ownerType!: string;

  @Column({ type: 'varchar', length: 128 })
  ownerId!: string;

  @Column({ type: 'enum', enum: ['image', 'document'] })
  kind!: MediaKind;

  @Column({ type: 'varchar', length: 1024, unique: true })
  originalPath!: string;

  @Column({ type: 'varchar', length: 1024, nullable: true })
  thumbnailPath!: string | null;

  @Column({ type: 'varchar', length: 255 })
  contentType!: string;

  @Column({ type: 'bigint' })
  sizeBytes!: string;

  @Column({ type: 'enum', enum: ['created', 'uploaded', 'processing', 'ready', 'failed'] })
  status!: MediaStatus;

  @Column({ type: 'varchar', length: 128 })
  createdByUid!: string;

  @CreateDateColumn({ type: 'datetime' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'datetime' })
  updatedAt!: Date;
}
