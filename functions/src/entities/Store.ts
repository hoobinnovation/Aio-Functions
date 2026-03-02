import { Column, CreateDateColumn, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

@Entity({ name: 'stores' })
export class Store {
  @PrimaryColumn({ type: 'varchar', length: 64 })
  id!: string;

  @Column({ type: 'varchar', length: 120, nullable: true })
  name!: string | null;

  @Column({ type: 'varchar', length: 32, default: 'active' })
  status!: string;

  @Column({ type: 'varchar', length: 300, nullable: true })
  disabledReason!: string | null;

  @Column({ type: 'datetime', nullable: true })
  disabledAt!: Date | null;

  @Column({ type: 'varchar', length: 128, nullable: true })
  disabledByUid!: string | null;

  @CreateDateColumn({ type: 'datetime' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'datetime' })
  updatedAt!: Date;
}
