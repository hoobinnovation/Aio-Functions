import { Column, CreateDateColumn, Entity, PrimaryColumn } from 'typeorm';

@Entity({ name: 'support_messages' })
export class SupportMessage {
  @PrimaryColumn('char', { length: 36 }) id!: string;
  @Column({ type: 'char', length: 36 }) ticketId!: string;
  @Column({ type: 'varchar', length: 128 }) senderUid!: string;
  @Column({ type: 'varchar', length: 1000 }) message!: string;
  @Column({ type: 'char', length: 36, nullable: true }) mediaAssetId!: string | null;
  @CreateDateColumn({ type: 'datetime' }) createdAt!: Date;
}
