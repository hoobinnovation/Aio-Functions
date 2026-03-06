import { Column, CreateDateColumn, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

@Entity({ name: 'edge_nodes' })
export class EdgeNode {
  @PrimaryColumn({ type: 'varchar', length: 96 })
  hubId!: string;

  @Column({ type: 'varchar', length: 64 })
  storeId!: string;

  @Column({ type: 'varchar', length: 16, default: 'active' })
  status!: 'active' | 'disabled';

  @Column({ type: 'varchar', length: 255 })
  secretHash!: string;

  @CreateDateColumn({ type: 'datetime' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'datetime' })
  updatedAt!: Date;
}
