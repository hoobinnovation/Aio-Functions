import { Column, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

@Entity({ name: 'user_store_context' })
export class UserStoreContext {
  @PrimaryColumn({ type: 'varchar', length: 128 })
  uid!: string;

  @Column({ type: 'varchar', length: 64 })
  storeId!: string;

  @UpdateDateColumn({ type: 'datetime' })
  updatedAt!: Date;
}
