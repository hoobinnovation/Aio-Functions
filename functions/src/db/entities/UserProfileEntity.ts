import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity({ name: 'users' })
export class UserProfileEntity {
  @PrimaryColumn({ type: 'varchar', length: 128 }) uid!: string;
  @Column({ type: 'char', length: 36, nullable: true }) storeId!: string | null;
  @Column({ type: 'varchar', length: 16, nullable: true }) gender!: string | null;
  @Column({ type: 'json', nullable: true }) tags!: string[] | null;
  @Column({ type: 'char', length: 36, nullable: true }) loyaltyTierId!: string | null;
  @Column({ type: 'tinyint', default: false }) isVip!: boolean;
}
