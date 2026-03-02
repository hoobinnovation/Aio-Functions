import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity({ name: 'branches' })
@Index('IDX_branches_store', ['storeId'])
export class BranchEntity {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ type: 'char', length: 36 }) storeId!: string;
  @Column({ type: 'varchar', length: 191 }) name!: string;
  @Column({ type: 'varchar', length: 255, nullable: true }) address!: string | null;
  @Column({ type: 'tinyint', default: true }) isActive!: boolean;
  @CreateDateColumn() createdAt!: Date;
  @UpdateDateColumn() updatedAt!: Date;
}
