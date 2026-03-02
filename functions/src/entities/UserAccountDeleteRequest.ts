import { Column, Entity, Index, PrimaryColumn } from 'typeorm';

@Entity({ name: 'user_account_delete_requests' })
@Index('idx_delete_requests_uid', ['uid'])
@Index('idx_delete_requests_uid_status', ['uid', 'status'])
@Index('idx_delete_requests_requestedAt', ['requestedAt'])
export class UserAccountDeleteRequest {
  @PrimaryColumn('char', { length: 36 })
  id!: string;

  @Column({ type: 'varchar', length: 128 })
  uid!: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  reason!: string | null;

  @Column({ type: 'varchar', length: 24, default: 'pending' })
  status!: string;

  @Column({ type: 'datetime' })
  requestedAt!: Date;

  @Column({ type: 'datetime', nullable: true })
  reviewedAt!: Date | null;

  @Column({ type: 'varchar', length: 128, nullable: true })
  reviewedByUid!: string | null;
}
