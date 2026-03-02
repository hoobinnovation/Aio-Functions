import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'gateway_action_logs' })
@Index('IDX_gateway_action_logs_store_action', ['storeId', 'action'])
export class GatewayActionLogEntity {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ type: 'varchar', length: 16 }) gateway!: string;
  @Column({ type: 'varchar', length: 160 }) action!: string;
  @Column({ type: 'char', length: 36, nullable: true }) storeId!: string | null;
  @Column({ type: 'varchar', length: 128, nullable: true }) uid!: string | null;
  @Column({ type: 'json', nullable: true }) payload!: Record<string, unknown> | null;
  @CreateDateColumn() createdAt!: Date;
}
